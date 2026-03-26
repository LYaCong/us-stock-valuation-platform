#!/usr/bin/env python3
"""
美股历史数据抓取脚本
每月运行一次，抓取20年历史数据并追加到缓存文件

优化说明:
- 添加请求延迟和重试逻辑(指数退避)
- 分批处理,每标的完成后短暂休息
- 增量追加:支持部分成功后下次继续
- 限速时等待后继续,不立即放弃
"""

import yfinance as yf
import json
import os
import time
from datetime import datetime
from typing import Optional, Dict, Any

REQUEST_DELAY = 0.5
BATCH_DELAY = 3
MAX_RETRIES = 3
RETRY_BASE_DELAY = 3
RETRY_MAX_DELAY = 120
INCREMENTAL_WRITE_INTERVAL = 10

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
    'VNQ', 'VIG', 'SCHD', 'ARKK', 'KWEB', 'GDX'
]

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'historical.json')

def load_existing_data() -> Dict:
    """加载已存在的数据,支持增量追加"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {'timestamp': None, 'count': 0, 'data': {}}

def merge_and_save(
    new_data: Dict,
    filepath: str,
    success_rate: float,
    is_final: bool = False
) -> bool:
    """
    合并旧缓存与新数据后写入。

    逻辑:
    1. 加载旧缓存
    2. 按 ticker 合并：新数据有就用新的，没有就保留旧的
    3. 非最终写入：始终合并（增量保存，不丢数据）
    4. 最终写入：仅当成功率 > 50% 时写入，否则保留旧数据

    Returns: True 如果实际写入了新数据
    """
    old_cache = load_existing_data()
    old_data = old_cache.get('data', {})

    merged_data = {}
    for ticker, val in old_data.items():
        merged_data[ticker] = val
    for ticker, val in new_data.items():
        merged_data[ticker] = val

    if is_final:
        if success_rate < 0.5:
            print(f"  ⚠️ 成功率 {success_rate:.1%} < 50%, 保留旧缓存不写入")
            return False

    cache_dir = os.path.dirname(filepath)
    os.makedirs(cache_dir, exist_ok=True)
    output = {
        'timestamp': datetime.now().isoformat(),
        'count': len(merged_data),
        'data': merged_data
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return True

def fetch_with_retry(ticker: str, fetch_func, max_retries: int = MAX_RETRIES) -> Optional[Any]:
    """带指数退避重试的请求封装"""
    for attempt in range(max_retries):
        try:
            result = fetch_func(ticker)
            if result is not None:
                return result
            if attempt < max_retries - 1:
                wait_time = min(RETRY_BASE_DELAY * (2 ** attempt), RETRY_MAX_DELAY)
                print(f"  ⏳ {ticker} 无数据, {wait_time}s后重试({attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
        except Exception as e:
            error_msg = str(e).lower()
            if '429' in error_msg or 'too many requests' in error_msg or 'rate limit' in error_msg:
                wait_time = min(RETRY_BASE_DELAY * (2 ** attempt), RETRY_MAX_DELAY)
                print(f"  ⚠️ {ticker} 限速(429), {wait_time}s后重试({attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
            elif attempt < max_retries - 1:
                wait_time = RETRY_BASE_DELAY * (attempt + 1)
                print(f"  ⚠️ {ticker} 错误: {e}, {wait_time}s后重试({attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                raise
    return None

def fetch_history(ticker, period_years=20):
    try:
        t = yf.Ticker(ticker)
        period1 = datetime.now().replace(year=datetime.now().year - period_years)
        
        # 获取历史价格和拆股事件
        hist = t.history(start=period1, interval='1mo', actions=True)
        
        if hist.empty:
            return {'history': [], 'splits': [], 'shares': None}
        
        # 获取当前流通股数
        try:
            info = t.info
            shares = info.get('sharesOutstanding')
        except:
            shares = None
        
        # 获取拆股事件
        splits = []
        if 'Stock Splits' in hist.columns:
            split_events = hist[hist['Stock Splits'] > 0]
            for date, row in split_events.iterrows():
                ratio = row['Stock Splits']
                if ratio > 0:
                    splits.append({
                        'date': date.strftime('%Y-%m-%d'),
                        'ratio': ratio,
                        'label': f"{int(ratio)}:1" if ratio >= 1 else f"1:{int(1/ratio)}"
                    })
        
        # 计算调整后的市值
        # 拆股调整系数：从最早到现在累积的拆股倍数
        cumulative_ratio = 1
        for split in reversed(splits):
            cumulative_ratio *= split['ratio']
        
        # 为每个数据点计算当时的调整系数
        data = []
        current_ratio = 1
        split_index = len(splits) - 1
        
        for date, row in hist.iterrows():
            if row['Close'] and row['Close'] > 0:
                date_str = date.strftime('%Y-%m-%d')
                
                # 检查是否需要更新调整系数
                while split_index >= 0 and splits[split_index]['date'] >= date_str:
                    current_ratio *= splits[split_index]['ratio']
                    split_index -= 1
                
                # 计算市值（调整后）
                market_cap = None
                if shares:
                    market_cap = round(row['Close'] * shares * current_ratio / 1e9, 2)  # 单位：B
                
                data.append({
                    'date': date_str,
                    'price': round(row['Close'], 2),
                    'volume': int(row['Volume']) if row['Volume'] else 0,
                    'marketCap': market_cap
                })
        
        return {
            'history': data,
            'splits': splits,
            'shares': shares
        }
    except Exception as e:
        print(f"  ⚠️ {ticker}: {e}")
        return {'history': [], 'splits': [], 'shares': None}

def main():
    print(f"📈 开始抓取历史数据... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print(f"   配置: 延迟={REQUEST_DELAY}s, 批延迟={BATCH_DELAY}s, 重试={MAX_RETRIES}次")
    print(f"   股票: {len(TICKERS)} 只")
    print(f"   指数: {len(INDICES)} 个")

    existing = load_existing_data()
    old_data = existing.get('data', {})
    new_data = {}
    existing_count = len(old_data)

    if existing_count > 0:
        print(f"   已有: {existing_count} 个标的,将继续增量抓取...")

    all_tickers = TICKERS + INDICES
    success = 0
    failed = 0
    skipped = 0
    incremental_counter = 0

    for i, ticker in enumerate(all_tickers, 1):
        if ticker in old_data:
            print(f"[{i}/{len(all_tickers)}] {ticker}... ⏭️ 已存在,跳过")
            skipped += 1
            continue

        print(f"[{i}/{len(all_tickers)}] {ticker}...", end=' ')
        data = fetch_with_retry(ticker, lambda t: fetch_history(t))

        if data and data['history']:
            new_data[ticker] = data
            split_count = len(data['splits'])
            split_info = f" ({split_count}次拆股)" if split_count > 0 else ""
            print(f"✅ {len(data['history'])} 条{split_info}")
            success += 1
        else:
            print("❌ 失败")
            failed += 1

        incremental_counter += 1
        if incremental_counter >= INCREMENTAL_WRITE_INTERVAL:
            current_total = success + skipped
            current_rate = current_total / len(all_tickers) if all_tickers else 0
            merge_and_save(new_data, CACHE_FILE, current_rate, is_final=False)
            print(f"  💾 增量保存: {success} 新增 + {skipped} 已有 = {len(old_data) + len(new_data)} 总计")
            incremental_counter = 0

        time.sleep(REQUEST_DELAY)

        if (i + skipped) % 10 == 0:
            print(f"  ⏸️ 批处理休息 {BATCH_DELAY}s...")
            time.sleep(BATCH_DELAY)

    total_count = len(old_data) + len(new_data)
    final_rate = total_count / len(all_tickers) if all_tickers else 0
    wrote = merge_and_save(new_data, CACHE_FILE, final_rate, is_final=True)

    if wrote:
        print(f"\n✅ 完成！已保存 {total_count} 个标的的历史数据到 {CACHE_FILE}")
    else:
        print(f"\n⚠️ 完成！成功率不足，保留旧缓存")
    print(f"   新增: {success}")
    print(f"   失败: {failed}")
    print(f"   已有跳过: {skipped}")
    print(f"   总成功率: {final_rate:.1%}")

if __name__ == '__main__':
    main()
