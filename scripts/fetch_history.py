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
        hist = t.history(start=period1, interval='1mo')
        
        if hist.empty:
            return []
        
        data = []
        for date, row in hist.iterrows():
            if row['Close'] and row['Close'] > 0:
                data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'price': round(row['Close'], 2),
                    'volume': int(row['Volume']) if row['Volume'] else 0
                })
        
        return data
    except Exception as e:
        print(f"  ⚠️ {ticker}: {e}")
        return []

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
        if data:
            result[ticker] = data
            print(f"✅ {len(data)} 条")
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
