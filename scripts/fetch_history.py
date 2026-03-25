#!/usr/bin/env python3
"""
美股历史数据抓取脚本
每月运行一次，抓取20年历史数据并追加到缓存文件
"""

import yfinance as yf
import json
import os
from datetime import datetime

TICKERS = [
    'NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSM', 'META', 'AVGO', 'TSLA', 'BRK-B',
    'WMT', 'LLY', 'JPM', 'V', 'MA', 'UNH', 'HD', 'PG', 'JNJ', 'ASML',
    'COST', 'ABBV', 'CRM', 'ORCL', 'AMD', 'NFLX', 'CVX', 'MRK', 'BAC', 'PEP',
    'KO', 'TMO', 'LIN', 'ADI', 'CSCO', 'MCD', 'ABT', 'DIS', 'INTU', 'QCOM',
    'TM', 'NVO', 'SAP', 'AZN', 'HDB', 'SHEL', 'DHR', 'PM', 'NEE', 'ACN',
    'UPS', 'ADBE', 'TXN', 'AMGN', 'HON', 'MS', 'GS', 'BLK', 'SCHW', 'AXP',
    'C', 'PNC', 'TFC', 'USB', 'COF', 'RTX', 'LOW', 'SPGI', 'DE', 'CAT',
    'NOW', 'MDLZ', 'VRTX', 'REGN', 'GILD', 'ISRG', 'LRCX', 'MMC', 'AMAT', 'KLAC',
    'SNPS', 'CDNS', 'PANW', 'BSX', 'BMY', 'SYK', 'CB', 'ZTS', 'CI', 'AOGO',
    'A', 'APD', 'BSY', 'VRSK', 'CDW', 'MCHP', 'PAYX', 'MSI', 'TEL', 'NOC',
    'ROP', 'FDX', 'PH', 'CMG', 'EL', 'GPN', 'TTD', 'WDAY', 'OTIS', 'TT'
]

INDICES = [
    'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'XLK', 'XLF', 'XLV', 'XLY', 'XLP',
    'XLE', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC', 'SOXX', 'KRE', 'IBB', 'XRT',
    'VNQ', 'VIG', 'SCHD', 'ARKK', 'KWEB', 'GDX'
]

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'historical.json')

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
    print(f"   股票: {len(TICKERS)} 只")
    print(f"   指数: {len(INDICES)} 个")
    
    all_tickers = TICKERS + INDICES
    result = {}
    success = 0
    failed = 0
    
    for i, ticker in enumerate(all_tickers, 1):
        print(f"[{i}/{len(all_tickers)}] {ticker}...", end=' ')
        data = fetch_history(ticker)
        if data['history']:
            result[ticker] = data
            split_count = len(data['splits'])
            split_info = f" ({split_count}次拆股)" if split_count > 0 else ""
            print(f"✅ {len(data['history'])} 条{split_info}")
            success += 1
        else:
            print("❌")
            failed += 1
    
    cache_dir = os.path.dirname(CACHE_FILE)
    os.makedirs(cache_dir, exist_ok=True)
    
    output = {
        'timestamp': datetime.now().isoformat(),
        'count': len(result),
        'data': result
    }
    
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)
    
    print(f"\n✅ 完成！已保存 {success} 个标的的历史数据到 {CACHE_FILE}")
    print(f"   成功: {success}")
    print(f"   失败: {failed}")

if __name__ == '__main__':
    main()
