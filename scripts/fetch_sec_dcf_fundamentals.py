#!/usr/bin/env python3
"""
Fetch DCF inputs from SEC companyfacts.

Policy:
- Free cash flow uses the latest annual filing.
- Cash, debt, and net debt use the latest reported balance-sheet instant.
- Shares outstanding uses the latest reported shares fact.
- Missing fields stay null. The script records why instead of estimating.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TICKERS_FILE = PROJECT_ROOT / "src" / "config" / "tickers.ts"
STOCK_CACHE_FILE = PROJECT_ROOT / "stock_cache" / "dcf_fundamentals.json"
API_DATA_FILE = PROJECT_ROOT / "api" / "_data" / "dcf_fundamentals.json"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_COMPANYFACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

DEFAULT_USER_AGENT = (
    "LiYacong us-stock-valuation-platform dcf-data "
    "LYaCong@users.noreply.github.com "
    "https://github.com/LYaCong/us-stock-valuation-platform"
)

ANNUAL_FORMS = {"10-K", "20-F", "40-F"}
LATEST_FORMS = {"10-K", "10-Q", "20-F", "40-F", "6-K"}
MONETARY_UNITS = [
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "JPY",
    "DKK",
    "TWD",
    "CNY",
    "KRW",
    "AUD",
    "CHF",
    "SEK",
    "HKD",
    "SGD",
    "NOK",
    "NZD",
    "MXN",
    "BRL",
    "ZAR",
    "INR",
]

TAGS = {
    "operatingCashFlow": [
        ("us-gaap", "NetCashProvidedByUsedInOperatingActivities"),
        ("us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"),
        ("ifrs-full", "CashFlowsFromUsedInOperatingActivities"),
    ],
    "capitalExpenditures": [
        ("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"),
        ("us-gaap", "PaymentsToAcquireProductiveAssets"),
        ("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets"),
        ("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipmentAndFiniteLivedIntangibleAssets"),
        ("us-gaap", "PaymentsToAcquirePropertyAndEquipment"),
        ("us-gaap", "PaymentsToAcquirePropertyAndEquipmentAndIntangibleAssets"),
        ("us-gaap", "PaymentsForProceedsFromProductiveAssets"),
        ("ifrs-full", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"),
        ("ifrs-full", "PaymentsToAcquirePropertyPlantAndEquipment"),
        ("ifrs-full", "PurchaseOfPropertyAndEquipment"),
    ],
    "cashAndEquivalents": [
        ("us-gaap", "CashAndCashEquivalentsAtCarryingValue"),
        ("us-gaap", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"),
        ("us-gaap", "Cash"),
        ("ifrs-full", "CashAndCashEquivalents"),
        ("ifrs-full", "Cash"),
    ],
    "totalDebt": [
        ("us-gaap", "DebtAndFinanceLeaseObligations"),
        ("us-gaap", "DebtAndCapitalLeaseObligations"),
        ("us-gaap", "LongTermDebtAndFinanceLeaseObligationsIncludingCurrentMaturities"),
        ("us-gaap", "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities"),
        ("us-gaap", "LongTermDebtAndFinanceLeaseObligations"),
        ("us-gaap", "LongTermDebtAndCapitalLeaseObligations"),
        ("ifrs-full", "Borrowings"),
        ("ifrs-full", "FinancialLiabilitiesAtAmortisedCost"),
    ],
    "shortTermDebt": [
        ("us-gaap", "ShortTermBorrowings"),
        ("us-gaap", "ShortTermDebt"),
        ("us-gaap", "LongTermDebtCurrent"),
        ("us-gaap", "CurrentPortionOfLongTermDebt"),
        ("us-gaap", "CommercialPaper"),
        ("us-gaap", "LongTermDebtAndFinanceLeaseObligationsCurrent"),
        ("us-gaap", "LongTermDebtAndCapitalLeaseObligationsCurrent"),
        ("ifrs-full", "CurrentBorrowings"),
        ("ifrs-full", "CurrentPortionOfLongtermBorrowings"),
    ],
    "longTermDebt": [
        ("us-gaap", "LongTermDebtNoncurrent"),
        ("us-gaap", "LongTermDebtAndFinanceLeaseObligationsNoncurrent"),
        ("us-gaap", "LongTermDebtAndCapitalLeaseObligations"),
        ("us-gaap", "LongTermDebt"),
        ("ifrs-full", "NoncurrentBorrowings"),
        ("ifrs-full", "LongtermBorrowings"),
    ],
    "sharesOutstanding": [
        ("dei", "EntityCommonStockSharesOutstanding"),
        ("us-gaap", "CommonStockSharesOutstanding"),
        ("ifrs-full", "NumberOfSharesIssuedAndFullyPaid"),
        ("ifrs-full", "AdjustedWeightedAverageShares"),
        ("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding"),
        ("us-gaap", "WeightedAverageNumberOfSharesOutstandingBasic"),
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


def request_json(url: str, delay_seconds: float, user_agent: str) -> Any:
    time.sleep(delay_seconds)
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status} for {url}")
        return json.loads(response.read().decode("utf-8"))


def load_sec_ticker_map(delay_seconds: float, user_agent: str) -> Dict[str, Dict[str, Any]]:
    payload = request_json(SEC_TICKERS_URL, delay_seconds, user_agent)
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


def clone_fact(item: Dict[str, Any], taxonomy: str, tag: str, unit: str) -> Dict[str, Any]:
    fact = dict(item)
    fact["_taxonomy"] = taxonomy
    fact["_tag"] = tag
    fact["_unit"] = unit
    fact["_sourceTag"] = f"{taxonomy}:{tag}"
    return fact


def facts_for_candidates(
    facts: Dict[str, Any],
    tag_candidates: Iterable[Tuple[str, str]],
    allowed_units: Iterable[str],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for taxonomy, tag in tag_candidates:
        units = get_units(facts, taxonomy, tag)
        for unit in allowed_units:
            for item in units.get(unit, []):
                if item.get("val") is not None:
                    rows.append(clone_fact(item, taxonomy, tag, unit))
    return rows


def pick_annual_fact(
    facts: Dict[str, Any],
    tag_candidates: Iterable[Tuple[str, str]],
    preferred_fy: Optional[int] = None,
    preferred_unit: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    rows = facts_for_candidates(facts, tag_candidates, MONETARY_UNITS)
    annual = [
        item for item in rows
        if item.get("form") in ANNUAL_FORMS and item.get("fp") == "FY"
    ]
    if preferred_fy is not None:
        annual = [item for item in annual if item.get("fy") == preferred_fy]
    if preferred_unit is not None:
        unit_matches = [item for item in annual if item.get("_unit") == preferred_unit]
        if unit_matches:
            annual = unit_matches
    annual.sort(
        key=lambda item: (
            item.get("fy") or 0,
            item.get("end") or "",
            item.get("filed") or "",
            -MONETARY_UNITS.index(item.get("_unit")) if item.get("_unit") in MONETARY_UNITS else -999,
        ),
        reverse=True,
    )
    return annual[0] if annual else None


def pick_latest_fact(
    facts: Dict[str, Any],
    tag_candidates: Iterable[Tuple[str, str]],
    allowed_units: Iterable[str],
    preferred_unit: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    rows = facts_for_candidates(facts, tag_candidates, allowed_units)
    latest = [item for item in rows if item.get("form") in LATEST_FORMS]
    if preferred_unit is not None:
        unit_matches = [item for item in latest if item.get("_unit") == preferred_unit]
        if unit_matches:
            latest = unit_matches
    latest.sort(
        key=lambda item: (
            item.get("end") or "",
            item.get("filed") or "",
            item.get("fy") or 0,
        ),
        reverse=True,
    )
    return latest[0] if latest else None


def value_of(fact: Optional[Dict[str, Any]]) -> Optional[float]:
    if fact is None:
        return None
    value = fact.get("val")
    return float(value) if value is not None else None


def round_billions(value: Optional[float]) -> Optional[float]:
    return round(value / 1_000_000_000, 2) if value is not None else None


def fact_meta(fact: Optional[Dict[str, Any]], period_type: str) -> Dict[str, Any]:
    if fact is None:
        return {
            "periodType": period_type,
            "fiscalYear": None,
            "fiscalPeriod": None,
            "form": None,
            "filedDate": None,
            "endDate": None,
            "accessionNumber": None,
            "currency": None,
        }
    return {
        "periodType": period_type,
        "fiscalYear": fact.get("fy"),
        "fiscalPeriod": fact.get("fp"),
        "form": fact.get("form"),
        "filedDate": fact.get("filed"),
        "endDate": fact.get("end"),
        "accessionNumber": fact.get("accn"),
        "currency": fact.get("_unit"),
    }


def source_tags_for(**facts: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    return {
        key: fact.get("_sourceTag") if fact else None
        for key, fact in facts.items()
    }


def field_payload(
    value: Optional[float],
    fact: Optional[Dict[str, Any]],
    period_type: str,
    source_key: str,
) -> Dict[str, Any]:
    return {
        "value": value,
        "valueB": round_billions(value),
        "sourceTag": fact.get("_sourceTag") if fact else None,
        "sourceTags": source_tags_for(**{source_key: fact}),
        **fact_meta(fact, period_type),
    }


def missing_reason(field: str, value: Optional[float], source: str) -> Optional[str]:
    if value is not None:
        return None
    return f"{field}: no supported {source} SEC XBRL tag found"


def build_record(ticker: str, cik: str, title: str, facts_payload: Dict[str, Any]) -> Dict[str, Any]:
    facts = facts_payload.get("facts", {})

    ocf_fact = pick_annual_fact(facts, TAGS["operatingCashFlow"])
    capex_fact = pick_annual_fact(
        facts,
        TAGS["capitalExpenditures"],
        preferred_fy=ocf_fact.get("fy") if ocf_fact else None,
        preferred_unit=ocf_fact.get("_unit") if ocf_fact else None,
    )
    if capex_fact is None:
        capex_fact = pick_annual_fact(facts, TAGS["capitalExpenditures"])

    operating_cash_flow = value_of(ocf_fact)
    raw_capex = value_of(capex_fact)
    capital_expenditures = abs(raw_capex) if raw_capex is not None else None
    free_cash_flow = (
        operating_cash_flow - capital_expenditures
        if operating_cash_flow is not None and capital_expenditures is not None
        else None
    )

    balance_unit = ocf_fact.get("_unit") if ocf_fact else None
    cash_fact = pick_latest_fact(facts, TAGS["cashAndEquivalents"], MONETARY_UNITS, balance_unit)
    total_debt_fact = pick_latest_fact(facts, TAGS["totalDebt"], MONETARY_UNITS, cash_fact.get("_unit") if cash_fact else balance_unit)
    short_debt_fact = pick_latest_fact(facts, TAGS["shortTermDebt"], MONETARY_UNITS, cash_fact.get("_unit") if cash_fact else balance_unit)
    long_debt_fact = pick_latest_fact(facts, TAGS["longTermDebt"], MONETARY_UNITS, cash_fact.get("_unit") if cash_fact else balance_unit)

    cash = value_of(cash_fact)
    total_debt = value_of(total_debt_fact)
    short_debt = value_of(short_debt_fact)
    long_debt = value_of(long_debt_fact)
    total_debt_source_fact = total_debt_fact
    if total_debt is None and (short_debt is not None or long_debt is not None):
        total_debt = (short_debt or 0) + (long_debt or 0)
        total_debt_source_fact = short_debt_fact or long_debt_fact

    net_debt = total_debt - cash if total_debt is not None and cash is not None else None

    shares_fact = pick_latest_fact(facts, TAGS["sharesOutstanding"], ["shares"])
    shares = value_of(shares_fact)

    annual_cash_flow = {
        "periodType": "annual",
        "policy": "FCF comes from the latest annual filing.",
        "fiscalYear": (ocf_fact or capex_fact or {}).get("fy"),
        "fiscalPeriod": (ocf_fact or capex_fact or {}).get("fp"),
        "form": (ocf_fact or capex_fact or {}).get("form"),
        "filedDate": (ocf_fact or capex_fact or {}).get("filed"),
        "endDate": (ocf_fact or capex_fact or {}).get("end"),
        "accessionNumber": (ocf_fact or capex_fact or {}).get("accn"),
        "currency": (ocf_fact or capex_fact or {}).get("_unit"),
        "operatingCashFlow": field_payload(operating_cash_flow, ocf_fact, "annual", "operatingCashFlow"),
        "capitalExpenditures": field_payload(capital_expenditures, capex_fact, "annual", "capitalExpenditures"),
        "freeCashFlow": {
            "value": free_cash_flow,
            "valueB": round_billions(free_cash_flow),
            "formula": "operatingCashFlow - capitalExpenditures",
            "sourceTags": source_tags_for(
                operatingCashFlow=ocf_fact,
                capitalExpenditures=capex_fact,
            ),
            **fact_meta(ocf_fact or capex_fact, "annual"),
        },
    }

    latest_balance_sheet = {
        "periodType": "latestInstant",
        "policy": "Cash, debt, and net debt use the latest reported balance-sheet instant.",
        "fiscalYear": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("fy"),
        "fiscalPeriod": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("fp"),
        "form": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("form"),
        "filedDate": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("filed"),
        "endDate": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("end"),
        "accessionNumber": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("accn"),
        "currency": (cash_fact or total_debt_fact or short_debt_fact or long_debt_fact or {}).get("_unit"),
        "cashAndEquivalents": field_payload(cash, cash_fact, "latestInstant", "cashAndEquivalents"),
        "shortTermDebt": field_payload(short_debt, short_debt_fact, "latestInstant", "shortTermDebt"),
        "longTermDebt": field_payload(long_debt, long_debt_fact, "latestInstant", "longTermDebt"),
        "totalDebt": {
            **field_payload(total_debt, total_debt_source_fact, "latestInstant", "totalDebt"),
            "sourceTags": source_tags_for(
                totalDebt=total_debt_fact,
                shortTermDebt=short_debt_fact,
                longTermDebt=long_debt_fact,
            ),
            **(
                {"formula": "shortTermDebt + longTermDebt"}
                if total_debt_fact is None and total_debt is not None
                else {}
            ),
        },
        "netDebt": {
            "value": net_debt,
            "valueB": round_billions(net_debt),
            "formula": "totalDebt - cashAndEquivalents",
            "sourceTags": source_tags_for(
                cashAndEquivalents=cash_fact,
                totalDebt=total_debt_fact,
                shortTermDebt=short_debt_fact,
                longTermDebt=long_debt_fact,
            ),
            **fact_meta(cash_fact or total_debt_source_fact or short_debt_fact or long_debt_fact, "latestInstant"),
        },
    }

    latest_shares = {
        "policy": "Shares outstanding uses the latest reported shares fact.",
        **field_payload(shares, shares_fact, "latestDisclosure", "sharesOutstanding"),
    }

    missing = [
        reason for reason in [
            missing_reason("operatingCashFlow", operating_cash_flow, "annual"),
            missing_reason("capitalExpenditures", capital_expenditures, "annual"),
            missing_reason("freeCashFlow", free_cash_flow, "annual"),
            missing_reason("cashAndEquivalents", cash, "latest instant"),
            missing_reason("totalDebt", total_debt, "latest instant"),
            missing_reason("netDebt", net_debt, "latest instant"),
            missing_reason("sharesOutstanding", shares, "latest shares"),
        ]
        if reason
    ]

    return {
        "ticker": ticker,
        "cik": cik,
        "companyName": title,
        "currency": annual_cash_flow.get("currency") or latest_balance_sheet.get("currency"),
        "fiscalYear": annual_cash_flow.get("fiscalYear"),
        "form": annual_cash_flow.get("form"),
        "filedDate": annual_cash_flow.get("filedDate"),
        "accessionNumber": annual_cash_flow.get("accessionNumber"),
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
        "annualCashFlow": annual_cash_flow,
        "latestBalanceSheet": latest_balance_sheet,
        "latestShares": latest_shares,
        "sourceTags": {
            "operatingCashFlow": ocf_fact.get("_sourceTag") if ocf_fact else None,
            "capitalExpenditures": capex_fact.get("_sourceTag") if capex_fact else None,
            "cashAndEquivalents": cash_fact.get("_sourceTag") if cash_fact else None,
            "totalDebt": total_debt_fact.get("_sourceTag") if total_debt_fact else None,
            "shortTermDebt": short_debt_fact.get("_sourceTag") if short_debt_fact else None,
            "longTermDebt": long_debt_fact.get("_sourceTag") if long_debt_fact else None,
            "sharesOutstanding": shares_fact.get("_sourceTag") if shares_fact else None,
        },
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
    tickers = [ticker.strip().upper() for ticker in args.tickers.split(",")] if args.tickers else read_default_tickers()
    ticker_map = load_sec_ticker_map(args.delay, user_agent)

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
            facts_payload = request_json(url, args.delay, user_agent)
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
            "policies": {
                "freeCashFlow": "Latest annual filing.",
                "cashDebtNetDebt": "Latest reported balance-sheet instant.",
                "sharesOutstanding": "Latest reported shares fact.",
            },
            "refreshCadence": "Refresh after new quarterly or annual filings; daily refresh is not needed.",
            "skipped": skipped,
        },
        "data": data,
    }
    write_output(payload)
    print(f"Wrote {STOCK_CACHE_FILE}")
    print(f"Copied {API_DATA_FILE}")


if __name__ == "__main__":
    main()
