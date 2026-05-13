#!/usr/bin/env python3
"""
美股历史数据抓取脚本（Twelve Data API 版）

数据源：Twelve Data API（月线，20年）
免费版限制：8次/分钟，800次/天
每月运行一次，增量更新历史数据

Twelve Data ticker 格式映射：
  BRK-B → BRK.B
"""

import json
import time
import os
import sys
import requests
from datetime import datetime
from typing import Optional, Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'historical.json')
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
TWELVEDATA_KEY = ENV.get('TWELVE_DATA_API_KEY', '')

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

INDICES = [
    'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'XLK', 'XLF', 'XLV', 'XLY', 'XLP',
    'XLE', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC', 'SOXX', 'KRE', 'IBB', 'XRT',
    'VNQ', 'VIG', 'SCHD', 'ARKK', 'KWEB', 'GDX',
]

TD_TICKER_MAP = {'BRK-B': 'BRK.B'}
def td_ticker(ticker):
    return TD_TICKER_MAP.get(ticker, ticker)

# ========== 限速控制 ==========
_td_lock = threading.Lock()
_td_request_times = []
TD_RPM = 8  # 免费版每分钟8次

def td_throttle():
    """严格限速：每分钟不超过8次请求"""
    global _td_request_times
    with _td_lock:
        now = time.time()
        # 清理1分钟前的记录
        _td_request_times = [t for t in _td_request_times if now - t < 60]
        
        if len(_td_request_times) >= TD_RPM:
            # 等到最早的请求超过60秒
            wait = 60 - (now - _td_request_times[0]) + 0.5
            if wait > 0:
                time.sleep(wait)
            now = time.time()
            _td_request_times = [t for t in _td_request_times if now - t < 60]
        
        _td_request_times.append(time.time())


# ========== 工具函数 ==========

def load_existing_data():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {'timestamp': None, 'count': 0, 'data': {}}

def save_data(data_dict, filepath):
    output = {
        'timestamp': datetime.now().isoformat(),
        'count': len(data_dict),
        'data': data_dict
    }
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)


# ========== Twelve Data API ==========

def fetch_history_single(ticker):
    """从 Twelve Data 获取月线历史数据（20年）"""
    td_throttle()
    ft = td_ticker(ticker)
    try:
        resp = requests.get(
            'https://api.twelvedata.com/time_series',
            params={
                'symbol': ft,
                'interval': '1month',
                'outputsize': '240',
                'apikey': TWELVEDATA_KEY,
            },
            timeout=30
        )
        data = resp.json()

        if 'values' not in data or not data['values']:
            msg = data.get('message', data.get('status', 'unknown'))
            return (ticker, None, f'{msg[:80]}' if msg else 'no data')

        values = data['values']
        values.reverse()

        history = []
        for v in values:
            close = v.get('close')
            if close and float(close) > 0:
                history.append({
                    'date': v['datetime'][:7],
                    'price': round(float(close), 2),
                    'open': round(float(v.get('open', 0)), 2),
                    'high': round(float(v.get('high', 0)), 2),
                    'low': round(float(v.get('low', 0)), 2),
                    'volume': int(float(v.get('volume', 0))),
                })

        return (ticker, {
            'history': history,
            'splits': [],
            'shares': None,
        }, f'{len(history)} pts')

    except Exception as e:
        return (ticker, None, str(e)[:80])


def main():
    start_time = time.time()
    print(f"📈 开始抓取历史数据... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")

    if not TWELVEDATA_KEY:
        print("❌ TWELVE_DATA_API_KEY 未配置")
        return 1

    all_tickers = TICKERS + INDICES
    print(f"   共 {len(all_tickers)} 个标的 ({len(TICKERS)} 公司 + {len(INDICES)} 指数)")
    est_min = len(all_tickers) / TD_RPM
    print(f"   预计耗时: ~{est_min:.0f} 分钟 ({TD_RPM}次/分钟)")

    # 加载已有数据
    existing = load_existing_data()
    old_data = existing.get('data', {})
    print(f"   已有 {len(old_data)} 个标的的历史数据\n")

    # 串行请求（限速太严，并发没意义）
    new_data = {}
    success = 0
    fail = 0

    for i, ticker in enumerate(all_tickers, 1):
        ticker_data, result, msg = fetch_history_single(ticker)
        if result:
            new_data[ticker] = result
            success += 1
            print(f"  [{i}/{len(all_tickers)}] {ticker}: ✅ {msg}")
        else:
            fail += 1
            print(f"  [{i}/{len(all_tickers)}] {ticker}: ❌ {msg}")
        
        # 每获取40个打印一次进度
        if i % 40 == 0:
            elapsed = time.time() - start_time
            print(f"  --- 进度 {i}/{len(all_tickers)} | 成功 {success} | 耗时 {elapsed:.0f}s ---")

    # 合并
    merged = {}
    for ticker, val in old_data.items():
        merged[ticker] = val
    for ticker, val in new_data.items():
        merged[ticker] = val

    save_data(merged, CACHE_FILE)
    elapsed = time.time() - start_time

    missing = [t for t in all_tickers if t not in merged or not merged[t].get('history')]
    print(f"\n✅ 完成！总计 {len(merged)} 个标的 | 新增/更新 {success} | 失败 {fail} | 耗时 {elapsed:.1f}s ({elapsed/60:.1f}min)")
    if missing:
        print(f"   缺失 {len(missing)}: {missing[:15]}{'...' if len(missing)>15 else ''}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
