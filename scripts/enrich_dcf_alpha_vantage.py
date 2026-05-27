#!/usr/bin/env python3
"""
Fill missing DCF fields from Alpha Vantage without overwriting SEC data.

Run this after fetch_sec_dcf_fundamentals.py. SEC remains the primary source;
Alpha Vantage is only used for fields that are missing from the SEC cache.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STOCK_CACHE_FILE = PROJECT_ROOT / "stock_cache" / "dcf_fundamentals.json"
API_DATA_FILE = PROJECT_ROOT / "api" / "_data" / "dcf_fundamentals.json"
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"

ANNUAL_PERIOD = "annual"
LATEST_PERIOD = "latestInstant"
SHARES_PERIOD = "latestDisclosure"


def load_env() -> Dict[str, str]:
    env: Dict[str, str] = {}
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def read_cache() -> Dict[str, Any]:
    return json.loads(STOCK_CACHE_FILE.read_text(encoding="utf-8"))


def write_cache(payload: Dict[str, Any]) -> None:
    STOCK_CACHE_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    API_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(STOCK_CACHE_FILE, API_DATA_FILE)


def request_alpha(function: str, ticker: str, api_key: str, delay: float) -> Dict[str, Any]:
    time.sleep(delay)
    params = urllib.parse.urlencode({
        "function": function,
        "symbol": ticker,
        "apikey": api_key,
    })
    request = urllib.request.Request(
        f"{ALPHA_VANTAGE_URL}?{params}",
        headers={"User-Agent": "us-stock-valuation-platform dcf-supplement"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if "Error Message" in payload:
        raise RuntimeError(str(payload["Error Message"]))
    if "Note" in payload:
        raise RuntimeError(str(payload["Note"]))
    if "Information" in payload:
        raise RuntimeError(str(payload["Information"]))
    return payload


def number_from(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.lower() in {"none", "null", "nan"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def first_number(row: Dict[str, Any], keys: Iterable[str]) -> Optional[float]:
    for key in keys:
        value = number_from(row.get(key))
        if value is not None:
            return value
    return None


def first_key(row: Dict[str, Any], keys: Iterable[str]) -> Optional[str]:
    for key in keys:
        if number_from(row.get(key)) is not None:
            return key
    return None


def round_billions(value: Optional[float]) -> Optional[float]:
    return round(value / 1_000_000_000, 2) if value is not None else None


def latest_report(payload: Dict[str, Any], key: str) -> Dict[str, Any]:
    reports = payload.get(key)
    if isinstance(reports, list) and reports:
        return reports[0] if isinstance(reports[0], dict) else {}
    return {}


def av_meta(
    value: Optional[float],
    row: Dict[str, Any],
    period_type: str,
    endpoint: str,
    field: str,
    applied_at: str,
) -> Dict[str, Any]:
    fiscal_date = row.get("fiscalDateEnding")
    return {
        "value": value,
        "valueB": round_billions(value),
        "periodType": period_type,
        "fiscalYear": int(str(fiscal_date)[:4]) if fiscal_date and str(fiscal_date)[:4].isdigit() else None,
        "fiscalPeriod": "FY" if period_type == ANNUAL_PERIOD else None,
        "form": None,
        "filedDate": row.get("reportedCurrencyDate") or fiscal_date,
        "endDate": fiscal_date,
        "accessionNumber": None,
        "currency": row.get("reportedCurrency"),
        "sourceTag": None,
        "sourceTags": {},
        "sourceType": "supplemental",
        "sourceProvider": "Alpha Vantage",
        "sourceEndpoint": endpoint,
        "sourceField": field,
        "supplementedAt": applied_at,
    }


def ensure_record(payload: Dict[str, Any], ticker: str) -> Dict[str, Any]:
    data = payload.setdefault("data", {})
    if ticker not in data:
        data[ticker] = {
            "ticker": ticker,
            "companyName": ticker,
            "currency": None,
            "missingFields": [],
            "coverageStatus": "partial",
            "sourceTags": {},
        }
    record = data[ticker]
    record.setdefault("ticker", ticker)
    record.setdefault("sourceTags", {})
    record.setdefault("missingFields", [])
    record.setdefault("annualCashFlow", {"periodType": ANNUAL_PERIOD})
    record.setdefault("latestBalanceSheet", {"periodType": LATEST_PERIOD})
    record.setdefault("latestShares", {"periodType": SHARES_PERIOD})
    record.setdefault("supplementalSources", {})
    return record


def set_supplement(record: Dict[str, Any], field: str, payload: Dict[str, Any]) -> None:
    record.setdefault("supplementalSources", {})[field] = {
        "provider": payload.get("sourceProvider"),
        "endpoint": payload.get("sourceEndpoint"),
        "field": payload.get("sourceField"),
        "periodType": payload.get("periodType"),
        "fiscalYear": payload.get("fiscalYear"),
        "endDate": payload.get("endDate"),
        "supplementedAt": payload.get("supplementedAt"),
    }


def apply_cash_flow(record: Dict[str, Any], cash_flow: Dict[str, Any], applied_at: str) -> bool:
    row = latest_report(cash_flow, "annualReports")
    if not row:
        return False
    changed = False
    annual = record.setdefault("annualCashFlow", {"periodType": ANNUAL_PERIOD})

    ocf_field = first_key(row, ["operatingCashflow", "operatingCashFlow"])
    ocf = first_number(row, ["operatingCashflow", "operatingCashFlow"])
    capex_field = first_key(row, ["capitalExpenditures", "capitalExpenditure", "capitalExpense"])
    capex_raw = first_number(row, ["capitalExpenditures", "capitalExpenditure", "capitalExpense"])
    capex = abs(capex_raw) if capex_raw is not None else None

    if record.get("operatingCashFlow") is None and ocf is not None and ocf_field:
        meta = av_meta(ocf, row, ANNUAL_PERIOD, "CASH_FLOW", ocf_field, applied_at)
        record["operatingCashFlow"] = ocf
        record["operatingCashFlowB"] = round_billions(ocf)
        annual["operatingCashFlow"] = meta
        set_supplement(record, "operatingCashFlow", meta)
        changed = True

    if record.get("capitalExpenditures") is None and capex is not None and capex_field:
        meta = av_meta(capex, row, ANNUAL_PERIOD, "CASH_FLOW", capex_field, applied_at)
        record["capitalExpenditures"] = capex
        record["capitalExpendituresB"] = round_billions(capex)
        annual["capitalExpenditures"] = meta
        set_supplement(record, "capitalExpenditures", meta)
        changed = True

    current_ocf = number_from(record.get("operatingCashFlow"))
    current_capex = number_from(record.get("capitalExpenditures"))
    if record.get("freeCashFlow") is None and current_ocf is not None and current_capex is not None:
        fcf = current_ocf - current_capex
        source_payload = av_meta(fcf, row, ANNUAL_PERIOD, "CASH_FLOW", "derivedFreeCashFlow", applied_at)
        source_payload["formula"] = "operatingCashFlow - capitalExpenditures"
        source_payload["sourceTags"] = {
            "operatingCashFlow": record.get("sourceTags", {}).get("operatingCashFlow"),
            "capitalExpenditures": record.get("sourceTags", {}).get("capitalExpenditures"),
        }
        record["freeCashFlow"] = fcf
        record["freeCashFlowB"] = round_billions(fcf)
        annual["freeCashFlow"] = source_payload
        set_supplement(record, "freeCashFlow", source_payload)
        changed = True

    if changed:
        annual.setdefault("periodType", ANNUAL_PERIOD)
        annual.setdefault("policy", "FCF comes from the latest annual filing.")
        annual.setdefault("fiscalYear", int(row["fiscalDateEnding"][:4]) if row.get("fiscalDateEnding") else None)
        annual.setdefault("fiscalPeriod", "FY")
        annual.setdefault("filedDate", row.get("fiscalDateEnding"))
        annual.setdefault("endDate", row.get("fiscalDateEnding"))
        annual.setdefault("currency", row.get("reportedCurrency"))
        record["currency"] = record.get("currency") or row.get("reportedCurrency")
    return changed


def apply_balance_sheet(record: Dict[str, Any], balance_sheet: Dict[str, Any], applied_at: str) -> bool:
    row = latest_report(balance_sheet, "quarterlyReports") or latest_report(balance_sheet, "annualReports")
    if not row:
        return False
    changed = False
    latest = record.setdefault("latestBalanceSheet", {"periodType": LATEST_PERIOD})

    cash_field = first_key(row, ["cashAndCashEquivalentsAtCarryingValue", "cashAndShortTermInvestments", "cash"])
    cash = first_number(row, ["cashAndCashEquivalentsAtCarryingValue", "cashAndShortTermInvestments", "cash"])
    total_debt_field = first_key(row, ["shortLongTermDebtTotal", "totalDebt"])
    total_debt = first_number(row, ["shortLongTermDebtTotal", "totalDebt"])
    short_debt_field = first_key(row, ["shortTermDebt", "currentDebt", "shortLongTermDebt"])
    short_debt = first_number(row, ["shortTermDebt", "currentDebt", "shortLongTermDebt"])
    long_debt_field = first_key(row, ["longTermDebtNoncurrent", "longTermDebt"])
    long_debt = first_number(row, ["longTermDebtNoncurrent", "longTermDebt"])

    if total_debt is None and (short_debt is not None or long_debt is not None):
        total_debt = (short_debt or 0) + (long_debt or 0)
        total_debt_field = "shortTermDebt + longTermDebt"

    if record.get("cashAndEquivalents") is None and cash is not None and cash_field:
        meta = av_meta(cash, row, LATEST_PERIOD, "BALANCE_SHEET", cash_field, applied_at)
        record["cashAndEquivalents"] = cash
        record["cashAndEquivalentsB"] = round_billions(cash)
        latest["cashAndEquivalents"] = meta
        set_supplement(record, "cashAndEquivalents", meta)
        changed = True

    if record.get("shortTermDebt") is None and short_debt is not None and short_debt_field:
        meta = av_meta(short_debt, row, LATEST_PERIOD, "BALANCE_SHEET", short_debt_field, applied_at)
        record["shortTermDebt"] = short_debt
        record["shortTermDebtB"] = round_billions(short_debt)
        latest["shortTermDebt"] = meta
        set_supplement(record, "shortTermDebt", meta)
        changed = True

    if record.get("longTermDebt") is None and long_debt is not None and long_debt_field:
        meta = av_meta(long_debt, row, LATEST_PERIOD, "BALANCE_SHEET", long_debt_field, applied_at)
        record["longTermDebt"] = long_debt
        record["longTermDebtB"] = round_billions(long_debt)
        latest["longTermDebt"] = meta
        set_supplement(record, "longTermDebt", meta)
        changed = True

    if record.get("totalDebt") is None and total_debt is not None and total_debt_field:
        meta = av_meta(total_debt, row, LATEST_PERIOD, "BALANCE_SHEET", total_debt_field, applied_at)
        if total_debt_field == "shortTermDebt + longTermDebt":
            meta["formula"] = total_debt_field
        record["totalDebt"] = total_debt
        record["totalDebtB"] = round_billions(total_debt)
        latest["totalDebt"] = meta
        set_supplement(record, "totalDebt", meta)
        changed = True

    current_cash = number_from(record.get("cashAndEquivalents"))
    current_debt = number_from(record.get("totalDebt"))
    if record.get("netDebt") is None and current_cash is not None and current_debt is not None:
        net_debt = current_debt - current_cash
        meta = av_meta(net_debt, row, LATEST_PERIOD, "BALANCE_SHEET", "derivedNetDebt", applied_at)
        meta["formula"] = "totalDebt - cashAndEquivalents"
        record["netDebt"] = net_debt
        record["netDebtB"] = round_billions(net_debt)
        latest["netDebt"] = meta
        set_supplement(record, "netDebt", meta)
        changed = True

    if changed:
        latest.setdefault("periodType", LATEST_PERIOD)
        latest.setdefault("policy", "Cash, debt, and net debt use the latest reported balance-sheet instant.")
        latest.setdefault("fiscalYear", int(row["fiscalDateEnding"][:4]) if row.get("fiscalDateEnding") else None)
        latest.setdefault("filedDate", row.get("fiscalDateEnding"))
        latest.setdefault("endDate", row.get("fiscalDateEnding"))
        latest.setdefault("currency", row.get("reportedCurrency"))
        record["currency"] = record.get("currency") or row.get("reportedCurrency")
    return changed


def apply_overview(record: Dict[str, Any], overview: Dict[str, Any], applied_at: str) -> bool:
    shares = number_from(overview.get("SharesOutstanding"))
    if record.get("sharesOutstanding") is not None or shares is None:
        return False
    meta = {
        "value": shares,
        "valueB": round_billions(shares),
        "periodType": SHARES_PERIOD,
        "fiscalYear": None,
        "fiscalPeriod": None,
        "form": None,
        "filedDate": overview.get("LatestQuarter"),
        "endDate": overview.get("LatestQuarter"),
        "accessionNumber": None,
        "currency": "shares",
        "sourceTag": None,
        "sourceTags": {},
        "sourceType": "supplemental",
        "sourceProvider": "Alpha Vantage",
        "sourceEndpoint": "OVERVIEW",
        "sourceField": "SharesOutstanding",
        "supplementedAt": applied_at,
    }
    record["sharesOutstanding"] = shares
    record["sharesOutstandingB"] = round_billions(shares)
    record["latestShares"] = {
        "policy": "Shares outstanding uses the latest reported shares fact.",
        **meta,
    }
    set_supplement(record, "sharesOutstanding", meta)
    return True


def recompute_missing(record: Dict[str, Any]) -> None:
    missing: List[str] = []
    checks = [
        ("operatingCashFlow", "annual"),
        ("capitalExpenditures", "annual"),
        ("freeCashFlow", "annual"),
        ("cashAndEquivalents", "latest instant"),
        ("totalDebt", "latest instant"),
        ("netDebt", "latest instant"),
        ("sharesOutstanding", "latest shares"),
    ]
    for field, source in checks:
        if record.get(field) is None:
            missing.append(f"{field}: no supported SEC or supplemental {source} data found")
    record["missingFields"] = missing
    record["coverageStatus"] = "complete" if not missing else "partial"


def needs_cash_flow(record: Dict[str, Any]) -> bool:
    return any(record.get(field) is None for field in ["operatingCashFlow", "capitalExpenditures", "freeCashFlow"])


def needs_balance_sheet(record: Dict[str, Any]) -> bool:
    return any(record.get(field) is None for field in ["cashAndEquivalents", "totalDebt", "netDebt"])


def needs_overview(record: Dict[str, Any]) -> bool:
    return record.get("sharesOutstanding") is None


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill missing DCF fields from Alpha Vantage.")
    parser.add_argument("--tickers", help="Comma-separated ticker override.")
    parser.add_argument("--delay", type=float, default=12.5, help="Delay between Alpha Vantage requests.")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and report without writing cache files.")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("ALPHA_VANTAGE_API_KEY") or os.environ.get("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        raise RuntimeError("ALPHA_VANTAGE_API_KEY is not configured.")

    payload = read_cache()
    skipped = payload.get("metadata", {}).get("skipped", {})
    data = payload.setdefault("data", {})
    if args.tickers:
        tickers = [item.strip().upper() for item in args.tickers.split(",") if item.strip()]
    else:
        tickers = sorted({
            *(ticker for ticker, record in data.items() if record.get("coverageStatus") != "complete"),
            *skipped.keys(),
        })

    applied_at = datetime.now(timezone.utc).isoformat()
    report: Dict[str, Any] = {"changed": [], "unchanged": [], "failed": {}}

    for ticker in tickers:
        record = ensure_record(payload, ticker)
        changed = False
        try:
            if needs_cash_flow(record):
                cash_flow = request_alpha("CASH_FLOW", ticker, api_key, args.delay)
                changed = apply_cash_flow(record, cash_flow, applied_at) or changed
            if needs_balance_sheet(record):
                balance_sheet = request_alpha("BALANCE_SHEET", ticker, api_key, args.delay)
                changed = apply_balance_sheet(record, balance_sheet, applied_at) or changed
            if needs_overview(record):
                overview = request_alpha("OVERVIEW", ticker, api_key, args.delay)
                changed = apply_overview(record, overview, applied_at) or changed
            recompute_missing(record)
            if not record.get("missingFields") and ticker in skipped:
                skipped.pop(ticker, None)
                changed = True
            if changed:
                report["changed"].append(ticker)
            else:
                report["unchanged"].append(ticker)
        except Exception as exc:
            report["failed"][ticker] = str(exc)

    complete_count = sum(1 for record in payload.get("data", {}).values() if record.get("coverageStatus") == "complete")
    supplemented_records = {
        ticker: sorted(
            field
            for field, details in (record.get("supplementalSources") or {}).items()
            if details
        )
        for ticker, record in payload.get("data", {}).items()
        if any((record.get("supplementalSources") or {}).values())
    }
    payload["metadata"] = {
        **(payload.get("metadata") or {}),
        "records": len(payload.get("data", {})),
        "completeRecords": complete_count,
        "coverage": complete_count / len(payload.get("data", {})) if payload.get("data") else 0,
        "supplementalUpdatedAt": applied_at,
        "supplementalSources": {
            **((payload.get("metadata") or {}).get("supplementalSources") or {}),
            "Alpha Vantage": {
                "endpoints": ["CASH_FLOW", "BALANCE_SHEET", "OVERVIEW"],
                "policy": "Only fills fields missing from SEC companyfacts; never overwrites SEC values.",
            },
        },
        "supplementalRun": report,
        "supplementalSummary": {
            "supplementedRecords": len(supplemented_records),
            "records": supplemented_records,
        },
    }

    if not args.dry_run:
        write_cache(payload)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
