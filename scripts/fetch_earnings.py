#!/usr/bin/env python3
"""
历史EPS抓取脚本（Alpha Vantage EARNINGS API）

免费版限制：25次/天
每次请求返回该股票的全部历史季度EPS
分批运行：每天25个ticker，5-6天拿完全部100只个股

拿到EPS后，结合已有的月线价格算出历史PE(TTM)
"""

import json
import time
import os
import sys
import requests
from datetime import datetime
from typing import Optional, Dict, List

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'earnings.json')
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env():
    env = {}
    env_path = os.path.join(SCRIPT_DIR, '..', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

ENV = load_env()
ALPHAVANTAGE_KEY = ENV.get('ALPHA_VANTAGE_API_KEY', '')

TICKERS = [
    'NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSM', 'META', 'AVGO', 'TSLA', 'BRK-B',
    'WMT', 'LLY', 'JPM', 'V', 'MA', 'UNH', 'HD', 'PG', 'JNJ', 'ASML',
    'COST', 'ABBV', 'CRM', 'ORCL', 'AMD', 'NFLX', 'CVX', 'MRK', 'BAC', 'PEP',
    'KO', 'TMO', 'LIN', 'ADI', 'CSCO', 'MCD', 'ABT', 'DIS', 'INTU', 'QCOM',
    'TM', 'NVO', 'SAP', 'AZN', 'HDB', 'SHEL', 'NVS', 'BABA', 'PDD', 'HSBC',
    'CAT', 'GE', 'IBM', 'AMAT', 'TXN', 'NOW', 'ISRG', 'BKNG', 'GS', 'MS',
    'RTX', 'HON', 'PFE', 'AMGN', 'T', 'VZ', 'CMCSA', 'NEE', 'PM', 'UNP',
    'LOW', 'SPGI', 'INTC', 'COP', 'SYK', 'UPS', 'ELV', 'BA', 'MDT', 'LMT',
    'TJX', 'AXP', 'DE', 'C', 'PLD', 'CB', 'ABNB', 'MDLZ', 'CI', 'ZTS',
    'REGN', 'GILD', 'VRTX', 'MMC', 'AMT', 'BSX', 'PANW', 'SNPS', 'CDNS', 'KLAC',
]

DAILY_LIMIT = 25  # 免费版25次/天


def load_existing():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}


def save_earnings(data):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def fetch_earnings(ticker):
    """从 Alpha Vantage 获取历史季度和年度 EPS"""
    try:
        resp = requests.get(
            f'https://www.alphavantage.co/query?function=EARNINGS&symbol={ticker}&apikey={ALPHAVANTAGE_KEY}',
            timeout=30
        )
        data = resp.json()

        if 'quarterlyEarnings' not in data:
            msg = data.get('Information', data.get('Note', data.get('Error Message', 'unknown')))
            return None, msg

        quarterly = []
        for q in data['quarterlyEarnings']:
            eps = q.get('reportedEPS')
            if eps and eps != 'None' and eps != '0.0':
                try:
                    quarterly.append({
                        'date': q['fiscalDateEnding'],
                        'reportedEPS': float(eps),
                        'estimatedEPS': float(q['reportedEPS']) if q.get('estimatedEPS') and q['estimatedEPS'] != 'None' else None,
                    })
                except (ValueError, TypeError):
                    continue

        annual = []
        for a in data.get('annualEarnings', []):
            eps = a.get('reportedEPS')
            if eps and eps != 'None':
                try:
                    annual.append({
                        'date': a['fiscalDateEnding'],
                        'reportedEPS': float(eps),
                    })
                except (ValueError, TypeError):
                    continue

        return {
            'quarterly': quarterly,
            'annual': annual,
        }, None

    except Exception as e:
        return None, str(e)[:100]


def main():
    start_time = time.time()
    print(f"📈 开始抓取历史EPS... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")

    if not ALPHAVANTAGE_KEY:
        print("❌ ALPHA_VANTAGE_API_KEY 未配置")
        return 1

    existing = load_existing()
    already = [t for t in TICKERS if t in existing]
    remaining = [t for t in TICKERS if t not in existing]

    print(f"   已有: {len(already)} 个 | 待抓取: {len(remaining)} 个")
    print(f"   今日限额: {DAILY_LIMIT} 次\n")

    to_fetch = remaining[:DAILY_LIMIT]
    success = 0
    fail = 0

    for i, ticker in enumerate(to_fetch, 1):
        print(f"  [{i}/{len(to_fetch)}] {ticker}...", end=' ')
        data, err = fetch_earnings(ticker)
        if data:
            existing[ticker] = data
            q_count = len(data['quarterly'])
            a_count = len(data['annual'])
            print(f"✅ {q_count} 季度 + {a_count} 年度 EPS")
            success += 1
        else:
            print(f"❌ {err}")
            fail += 1
            if 'rate limit' in str(err).lower() or 'premium' in str(err).lower() or 'thank you' in str(err).lower():
                print("  ⏹️ Alpha Vantage 限速，停止")
                break
        time.sleep(1)

    save_earnings(existing)
    elapsed = time.time() - start_time

    total_done = len(existing)
    still_missing = len(TICKERS) - total_done
    print(f"\n✅ 今日完成: {success} 新增, {fail} 失败 | 耗时 {elapsed:.0f}s")
    print(f"   总进度: {total_done}/{len(TICKERS)} | 剩余: {still_missing}")
    if still_missing > 0:
        print(f"   预计还需 {(still_missing + DAILY_LIMIT - 1) // DAILY_LIMIT} 天完成")

    return 0


if __name__ == '__main__':
    sys.exit(main())
