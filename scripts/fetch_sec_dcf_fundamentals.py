#!/usr/bin/env python3
"""
Fetch real DCF inputs from SEC companyfacts.

This script is designed for OpenClaw or another scheduled runner. It does not
estimate missing fields. Missing values are written as null with a reason so the
DCF page can stop instead of silently fabricating inputs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TICKERS_FILE = PROJECT_ROOT / "src" / "config" / "tickers.ts"
STOCK_CACHE_FILE = PROJECT_ROOT / "stock_cache" / "dcf_fundamentals.json"
API_DATA_FILE = PROJECT_ROOT / "api" / "_data" / "dcf_fundamentals.json"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_COMPANYFACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

DEFAULT_USER_AGENT = (
    "LiYacong us-stock-valuation-platform dcf-data "
    "https://github.com/LYaCong/us-stock-valuation-platform"
)

ANNUAL_FORMS = {"10-K", "20-F", "40-F"}

TAGS = {
    "operatingCashFlow": [
        ("us-gaap", "NetCashProvidedByUsedInOperatingActivities"),
        ("us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"),
        ("ifrs-full", "CashFlowsFromUsedInOperatingActivities"),
    ],
    "capitalExpenditures": [
        ("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"),
        ("us-gaap", "PaymentsToAcquireProductiveAssets"),
        ("ifrs-full", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"),
        ("ifrs-full", "PaymentsToAcquirePropertyPlantAndEquipment"),
    ],
    "cashAndEquivalents": [
        ("us-gaap", "CashAndCashEquivalentsAtCarryingValue"),
        ("us-gaap", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"),
        ("ifrs-full", "CashAndCashEquivalents"),
    ],
    "shortTermDebt": [
        ("us-gaap", "ShortTermBorrowings"),
        ("us-gaap", "ShortTermDebt"),
        ("us-gaap", "LongTermDebtCurrent"),
        ("us-gaap", "CurrentPortionOfLongTermDebt"),
        ("us-gaap", "CommercialPaper"),
        ("ifrs-full", "CurrentBorrowings"),
    ],
    "longTermDebt": [
        ("us-gaap", "LongTermDebtNoncurrent"),
        ("us-gaap", "LongTermDebtAndFinanceLeaseObligationsNoncurrent"),
        ("us-gaap", "LongTermDebt"),
        ("ifrs-full", "NoncurrentBorrowings"),
    ],
    "sharesOutstanding": [
        ("dei", "EntityCommonStockSharesOutstanding"),
        ("us-gaap", "CommonStocksIncludingAdditionalPaidInCapital"),
        ("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding"),
    ],
}


def load_env() -> Dict[str, str]:
    env: Dict[str, str] = {}
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def read_default_tickers() -> List[str]:
    text = TICKERS_FILE.read_text(encoding="utf-8")
    match = re.search(r"DEFAULT_TICKERS\s*=\s*\[(.*?)\]", text, re.S)
    if not match:
        raise RuntimeError(f"Cannot find DEFAULT_TICKERS in {TICKERS_FILE}")
    return re.findall(r"'([^']+)'", match.group(1))


def request_json(session: requests.Session, url: str, delay_seconds: float) -> Any:
    time.sleep(delay_seconds)
    response = session.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def load_sec_ticker_map(session: requests.Session, delay_seconds: float) -> Dict[str, Dict[str, Any]]:
    payload = request_json(session, SEC_TICKERS_URL, delay_seconds)
    result: Dict[str, Dict[str, Any]] = {}
    for item in payload.values():
        ticker = str(item.get("ticker", "")).upper()
        if not ticker:
            continue
        result[ticker] = {
            "cik": str(item.get("cik_str", "")).zfill(10),
            "title": item.get("title"),
        }
    return result


def get_units(facts: Dict[str, Any], taxonomy: str, tag: str) -> Dict[str, List[Dict[str, Any]]]:
    return facts.get(taxonomy, {}).get(tag, {}).get("units", {})


def annual_usd_fact(facts: Dict[str, Any], tag_candidates: Iterable[Tuple[str, str]]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    for taxonomy, tag in tag_candidates:
        units = get_units(facts, taxonomy, tag)
        values = units.get("USD")
        if not values:
            continue
        annual_values = [
            item for item in values
            if item.get("form") in ANNUAL_FORMS and item.get("fp") == "FY" and item.get("val") is not None
        ]
        if not annual_values:
            continue
        annual_values.sort(key=lambda item: (item.get("fy") or 0, item.get("filed") or ""), reverse=True)
        return annual_values[0], f"{taxonomy}:{tag}"
    return None, None


def latest_shares_fact(facts: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    for taxonomy, tag in TAGS["sharesOutstanding"]:
        units = get_units(facts, taxonomy, tag)
        values = units.get("shares")
        if not values:
            continue
        values = [item for item in values if item.get("val") is not None]
        if not values:
            continue
        values.sort(key=lambda item: (item.get("filed") or "", item.get("fy") or 0), reverse=True)
        return values[0], f"{taxonomy}:{tag}"
    return None, None


def value_of(fact: Optional[Dict[str, Any]]) -> Optional[float]:
    if fact is None:
        return None
    value = fact.get("val")
    return float(value) if value is not None else None


def round_billions(value: Optional[float]) -> Optional[float]:
    return round(value / 1_000_000_000, 2) if value is not None else None


def missing_reason(field: str, value: Optional[float]) -> Optional[str]:
    if value is not None:
        return None
    return f"{field}: no supported annual SEC XBRL tag found"


def build_record(ticker: str, cik: str, title: str, facts_payload: Dict[str, Any]) -> Dict[str, Any]:
    facts = facts_payload.get("facts", {})
    source_tags: Dict[str, Optional[str]] = {}

    ocf_fact, source_tags["operatingCashFlow"] = annual_usd_fact(facts, TAGS["operatingCashFlow"])
    capex_fact, source_tags["capitalExpenditures"] = annual_usd_fact(facts, TAGS["capitalExpenditures"])
    cash_fact, source_tags["cashAndEquivalents"] = annual_usd_fact(facts, TAGS["cashAndEquivalents"])
    short_debt_fact, source_tags["shortTermDebt"] = annual_usd_fact(facts, TAGS["shortTermDebt"])
    long_debt_fact, source_tags["longTermDebt"] = annual_usd_fact(facts, TAGS["longTermDebt"])
    shares_fact, source_tags["sharesOutstanding"] = latest_shares_fact(facts)

    operating_cash_flow = value_of(ocf_fact)
    raw_capex = value_of(capex_fact)
    capital_expenditures = abs(raw_capex) if raw_capex is not None else None
    cash = value_of(cash_fact)
    short_debt = value_of(short_debt_fact)
    long_debt = value_of(long_debt_fact)
    shares = value_of(shares_fact)

    total_debt = None
    if short_debt is not None or long_debt is not None:
      total_debt = (short_debt or 0) + (long_debt or 0)

    free_cash_flow = None
    if operating_cash_flow is not None and capital_expenditures is not None:
        free_cash_flow = operating_cash_flow - capital_expenditures

    net_debt = None
    if total_debt is not None and cash is not None:
        net_debt = total_debt - cash

    fiscal_anchor = ocf_fact or capex_fact or cash_fact or long_debt_fact or shares_fact or {}

    missing = [
        reason for reason in [
            missing_reason("operatingCashFlow", operating_cash_flow),
            missing_reason("capitalExpenditures", capital_expenditures),
            missing_reason("freeCashFlow", free_cash_flow),
            missing_reason("cashAndEquivalents", cash),
            missing_reason("totalDebt", total_debt),
            missing_reason("netDebt", net_debt),
            missing_reason("sharesOutstanding", shares),
        ]
        if reason
    ]

    return {
        "ticker": ticker,
        "cik": cik,
        "companyName": title,
        "currency": "USD",
        "fiscalYear": fiscal_anchor.get("fy"),
        "form": fiscal_anchor.get("form"),
        "filedDate": fiscal_anchor.get("filed"),
        "accessionNumber": fiscal_anchor.get("accn"),
        "operatingCashFlow": operating_cash_flow,
        "operatingCashFlowB": round_billions(operating_cash_flow),
        "capitalExpenditures": capital_expenditures,
        "capitalExpendituresB": round_billions(capital_expenditures),
        "freeCashFlow": free_cash_flow,
        "freeCashFlowB": round_billions(free_cash_flow),
        "cashAndEquivalents": cash,
        "cashAndEquivalentsB": round_billions(cash),
        "shortTermDebt": short_debt,
        "shortTermDebtB": round_billions(short_debt),
        "longTermDebt": long_debt,
        "longTermDebtB": round_billions(long_debt),
        "totalDebt": total_debt,
        "totalDebtB": round_billions(total_debt),
        "netDebt": net_debt,
        "netDebtB": round_billions(net_debt),
        "sharesOutstanding": shares,
        "sharesOutstandingB": round_billions(shares),
        "sourceTags": source_tags,
        "missingFields": missing,
        "coverageStatus": "complete" if not missing else "partial",
    }


def write_output(payload: Dict[str, Any]) -> None:
    STOCK_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STOCK_CACHE_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    API_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(STOCK_CACHE_FILE, API_DATA_FILE)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch SEC DCF fundamentals for the configured stock universe.")
    parser.add_argument("--tickers", help="Comma-separated ticker override, for example AAPL,MSFT")
    parser.add_argument("--delay", type=float, default=0.12, help="Delay between SEC requests. Default stays under 10 req/sec.")
    args = parser.parse_args()

    env = load_env()
    user_agent = env.get("SEC_USER_AGENT") or os.environ.get("SEC_USER_AGENT") or DEFAULT_USER_AGENT
    session = requests.Session()
    session.headers.update({
        "User-Agent": user_agent,
        "Accept-Encoding": "gzip, deflate",
    })

    tickers = [ticker.strip().upper() for ticker in args.tickers.split(",")] if args.tickers else read_default_tickers()
    ticker_map = load_sec_ticker_map(session, args.delay)

    data: Dict[str, Any] = {}
    skipped: Dict[str, str] = {}

    for ticker in tickers:
        normalized = ticker.replace(".", "-").upper()
        sec_entry = ticker_map.get(normalized) or ticker_map.get(ticker)
        if not sec_entry:
            skipped[ticker] = "No ticker-to-CIK mapping in SEC company_tickers.json"
            continue
        cik = sec_entry["cik"]
        url = SEC_COMPANYFACTS_URL.format(cik=cik)
        try:
            facts_payload = request_json(session, url, args.delay)
            data[ticker] = build_record(ticker, cik, sec_entry.get("title") or ticker, facts_payload)
            print(f"OK {ticker}: {data[ticker]['coverageStatus']}")
        except Exception as exc:
            skipped[ticker] = str(exc)
            print(f"FAIL {ticker}: {exc}")

    complete_count = sum(1 for record in data.values() if record.get("coverageStatus") == "complete")
    payload = {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": "SEC companyfacts",
            "userAgent": user_agent,
            "requestedTickers": len(tickers),
            "records": len(data),
            "completeRecords": complete_count,
            "coverage": complete_count / len(data) if data else 0,
            "refreshCadence": "Quarterly or after new 10-Q/10-K filings; daily refresh is not needed.",
            "skipped": skipped,
        },
        "data": data,
    }
    write_output(payload)
    print(f"Wrote {STOCK_CACHE_FILE}")
    print(f"Copied {API_DATA_FILE}")


if __name__ == "__main__":
    main()
