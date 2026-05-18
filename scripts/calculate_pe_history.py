#!/usr/bin/env python3
"""
历史PE(TTM)计算脚本

读取 earnings.json + historical.json，对每个月计算滚动TTM EPS，
然后算出历史PE = 月收盘价 / TTM EPS，以及10年百分位等统计指标。

输出：
  - 更新 historical.json 中每个月度数据，新增 peTtm / percentile 字段
  - 更新 daily_quotes.json 中每个 company，新增真实百分位和统计字段
"""

import json
import os
import sys
from datetime import datetime
from typing import Optional, Dict, List, Tuple

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
STOCK_CACHE = os.path.join(PROJECT_DIR, 'stock_cache')

EARNINGS_FILE = os.path.join(STOCK_CACHE, 'earnings.json')
HISTORICAL_FILE = os.path.join(STOCK_CACHE, 'historical.json')
DAILY_QUOTES_FILE = os.path.join(STOCK_CACHE, 'daily_quotes.json')


def load_json(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path: str, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def compute_ttm_eps(quarterly_eps: List[dict], month_date: str) -> Optional[float]:
    """
    计算给定月份的滚动TTM EPS：该月之前最近4个季度的reportedEPS之和。
    如果不足4个季度，返回None。
    """
    parts = month_date.split('-')
    year, month = int(parts[0]), int(parts[1])
    month_start = (year, month)

    valid_quarters = []
    for q in quarterly_eps:
        q_parts = q['date'].split('-')
        q_year, q_month = int(q_parts[0]), int(q_parts[1])
        q_ym = (q_year, q_month)

        if q_ym <= month_start:
            eps_val = q.get('reportedEPS')
            if eps_val is not None:
                valid_quarters.append((q_ym, eps_val))

    valid_quarters.sort(key=lambda x: x[0], reverse=True)

    if len(valid_quarters) < 4:
        return None

    ttm = sum(v[1] for v in valid_quarters[:4])
    return ttm


def compute_percentile(value: float, all_values: List[float]) -> Optional[float]:
    """
    计算 value 在 all_values 中的百分位排名（0-100）。
    使用线性插值方法。
    """
    if not all_values:
        return None

    sorted_vals = sorted(all_values)
    n = len(sorted_vals)

    if value <= sorted_vals[0]:
        return 0.0
    if value >= sorted_vals[-1]:
        return 100.0

    count_below = sum(1 for v in sorted_vals if v < value)
    count_equal = sum(1 for v in sorted_vals if v == value)

    if count_equal > 1:
        percentile = (count_below + (count_equal - 1) / 2.0) / (n - 1) * 100
    else:
        percentile = count_below / (n - 1) * 100

    return round(percentile, 1)


def compute_stats(pe_values: List[float], current_pe: Optional[float]) -> dict:
    """
    计算统计指标：PE最小值、最大值、中位数、当前百分位
    """
    if not pe_values:
        return {
            'pe10yMin': None,
            'pe10yMax': None,
            'pe10yMedian': None,
            'pePercentile': None,
        }

    sorted_pe = sorted(pe_values)
    n = len(sorted_pe)
    median = sorted_pe[n // 2] if n % 2 == 1 else (sorted_pe[n // 2 - 1] + sorted_pe[n // 2]) / 2

    percentile = None
    if current_pe is not None:
        percentile = compute_percentile(current_pe, pe_values)

    return {
        'pe10yMin': round(sorted_pe[0], 2),
        'pe10yMax': round(sorted_pe[-1], 2),
        'pe10yMedian': round(median, 2),
        'pePercentile': percentile,
    }


def main():
    start_time = datetime.now()
    print(f"📊 开始计算历史PE... ({start_time.strftime('%Y-%m-%d %H:%M:%S')})")

    # 加载数据
    earnings = load_json(EARNINGS_FILE)
    historical = load_json(HISTORICAL_FILE)
    daily_quotes = load_json(DAILY_QUOTES_FILE)

    earnings_tickers = set(earnings.keys())
    historical_tickers = set(historical.get('data', {}).keys())
    common_tickers = earnings_tickers & historical_tickers

    print(f"   Earnings: {len(earnings_tickers)} tickers")
    print(f"   Historical: {len(historical_tickers)} tickers")
    print(f"   可计算: {len(common_tickers)} tickers")

    # 构建 daily_quotes 的 ticker 映射
    company_map = {}
    for c in daily_quotes.get('companies', []):
        company_map[c['ticker']] = c

    success_count = 0
    total_pe_months = 0
    total_months = 0

    # 当前日期用于计算10年/5年范围
    now = datetime.now()
    ten_years_ago = (now.year - 10, now.month)
    five_years_ago = (now.year - 5, now.month)

    for ticker in sorted(common_tickers):
        if ticker == 'MMC':
            continue

        q_eps = earnings[ticker].get('quarterly', [])
        if len(q_eps) < 4:
            print(f"  ⚠️ {ticker}: 季度EPS不足4个，跳过")
            continue

        hist_entry = historical['data'].get(ticker)
        if not hist_entry or 'history' not in hist_entry:
            continue

        history = hist_entry['history']
        if not history:
            continue

        # 计算每个月的TTM PE
        pe_values_10y = []
        pe_values_5y = []

        for month_data in history:
            month_date = month_data['date']
            total_months += 1

            ttm_eps = compute_ttm_eps(q_eps, month_date)

            if ttm_eps is not None and ttm_eps != 0:
                price = month_data.get('price')
                if price is not None and price > 0:
                    pe = price / ttm_eps
                    month_data['peTtm'] = round(pe, 2)
                    total_pe_months += 1

                    parts = month_date.split('-')
                    ym = (int(parts[0]), int(parts[1]))
                    if ym >= ten_years_ago:
                        pe_values_10y.append(pe)
                    if ym >= five_years_ago:
                        pe_values_5y.append(pe)
                else:
                    month_data['peTtm'] = None
            else:
                month_data['peTtm'] = None

        # 计算每月百分位（基于到该月为止的所有历史PE）
        running_pe = []
        for month_data in history:
            pe_val = month_data.get('peTtm')
            if pe_val is not None:
                running_pe.append(pe_val)

            if pe_val is not None and len(running_pe) >= 2:
                pct = compute_percentile(pe_val, running_pe)
                month_data['percentile'] = pct
            else:
                month_data['percentile'] = None if pe_val is None else 100.0

        # 计算当前PE的10年百分位等统计
        company = company_map.get(ticker)
        current_pe = None
        if company and company.get('peTtm') is not None:
            current_pe = company['peTtm']

        stats = compute_stats(pe_values_10y, current_pe)

        if company:
            company['pePercentile'] = stats['pePercentile']
            company['pe10yMin'] = stats['pe10yMin']
            company['pe10yMax'] = stats['pe10yMax']
            company['pe10yMedian'] = stats['pe10yMedian']

            # 5年滚动百分位
            if pe_values_5y and current_pe is not None:
                company['pePercentile5y'] = compute_percentile(current_pe, pe_values_5y)
            else:
                company['pePercentile5y'] = None

            # 10年区间涨跌幅
            if len(history) >= 2:
                first_price_10y = None
                last_price = history[-1].get('price')
                for h in history:
                    parts = h['date'].split('-')
                    ym = (int(parts[0]), int(parts[1]))
                    if ym >= ten_years_ago:
                        first_price_10y = h.get('price')
                        break

                if first_price_10y and last_price and first_price_10y > 0:
                    change_pct = (last_price - first_price_10y) / first_price_10y * 100
                    company['priceChange10y'] = round(change_pct, 2)
                else:
                    company['priceChange10y'] = None
            else:
                company['priceChange10y'] = None

            # 根据百分位更新status
            pct = stats.get('pePercentile')
            if pct is not None:
                if pct <= 25:
                    company['status'] = 'Low'
                elif pct <= 75:
                    company['status'] = 'Neutral'
                else:
                    company['status'] = 'High'

        success_count += 1
        if success_count % 20 == 0:
            print(f"  ✅ 已处理 {success_count} 个 ticker...")

    # 保存结果
    save_json(HISTORICAL_FILE, historical)
    save_json(DAILY_QUOTES_FILE, daily_quotes)

    elapsed = (datetime.now() - start_time).total_seconds()

    companies_with_pct = sum(1 for c in daily_quotes.get('companies', []) if c.get('pePercentile') is not None)
    total_companies = len(daily_quotes.get('companies', []))

    print(f"\n✅ 计算完成! 耗时 {elapsed:.1f}s")
    print(f"   成功计算: {success_count} 个 ticker")
    print(f"   月度PE覆盖: {total_pe_months}/{total_months} ({total_pe_months/total_months*100:.1f}%)")
    print(f"   公司百分位覆盖: {companies_with_pct}/{total_companies}")

    print(f"\n📋 样例数据:")
    for ticker in ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN']:
        c = company_map.get(ticker)
        if c:
            print(f"   {ticker}: PE={c.get('peTtm')}, "
                  f"百分位={c.get('pePercentile')}%, "
                  f"10年范围=[{c.get('pe10yMin')}, {c.get('pe10yMax')}], "
                  f"中位数={c.get('pe10yMedian')}, "
                  f"涨跌幅={c.get('priceChange10y')}%, "
                  f"状态={c.get('status')}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
