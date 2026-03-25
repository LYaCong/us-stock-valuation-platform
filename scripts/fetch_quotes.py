#!/usr/bin/env python3
"""
美股数据每日抓取脚本
每天早上8点自动运行，抓取所有股票实时数据并写入缓存文件
"""

import yfinance as yf
import json
import time
import os
from datetime import datetime

# 股票列表（与 mockData.ts 保持一致）
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
    'ROP', 'FDX', 'PH', 'CMG', 'EL', 'GPN', 'TTD', 'WDAY', 'OTIS', 'TT',
    'BABA', 'PDD', 'HSBC', 'NVS'
]

# 指数基金（与 server.ts 的 INDEX_TICKERS 保持一致）
INDICES = [
    {'id': 'spy', 'name': 'S&P 500', 'nameZh': '标普500指数', 'ticker': 'SPY', 'type': 'Core'},
    {'id': 'qqq', 'name': 'Nasdaq 100', 'nameZh': '纳斯达克100指数', 'ticker': 'QQQ', 'type': 'Core'},
    {'id': 'dia', 'name': 'Dow Jones 30', 'nameZh': '道琼斯工业平均指数', 'ticker': 'DIA', 'type': 'Core'},
    {'id': 'iwm', 'name': 'Russell 2000', 'nameZh': '罗素2000指数', 'ticker': 'IWM', 'type': 'Core'},
    {'id': 'vti', 'name': 'Total Stock Market', 'nameZh': '全美股市指数', 'ticker': 'VTI', 'type': 'Core'},
    {'id': 'xlk', 'name': 'Information Technology', 'nameZh': '信息技术指数', 'ticker': 'XLK', 'type': 'Sector'},
    {'id': 'xlf', 'name': 'Financials', 'nameZh': '金融指数', 'ticker': 'XLF', 'type': 'Sector'},
    {'id': 'xlv', 'name': 'Health Care', 'nameZh': '医疗保健指数', 'ticker': 'XLV', 'type': 'Sector'},
    {'id': 'xly', 'name': 'Consumer Discretionary', 'nameZh': '可选消费指数', 'ticker': 'XLY', 'type': 'Sector'},
    {'id': 'xlp', 'name': 'Consumer Staples', 'nameZh': '必需消费指数', 'ticker': 'XLP', 'type': 'Sector'},
    {'id': 'xle', 'name': 'Energy', 'nameZh': '能源指数', 'ticker': 'XLE', 'type': 'Sector'},
    {'id': 'xli', 'name': 'Industrials', 'nameZh': '工业指数', 'ticker': 'XLI', 'type': 'Sector'},
    {'id': 'xlb', 'name': 'Materials', 'nameZh': '材料指数', 'ticker': 'XLB', 'type': 'Sector'},
    {'id': 'xlre', 'name': 'Real Estate', 'nameZh': '房地产指数', 'ticker': 'XLRE', 'type': 'Sector'},
    {'id': 'xlu', 'name': 'Utilities', 'nameZh': '公用事业指数', 'ticker': 'XLU', 'type': 'Sector'},
    {'id': 'xlc', 'name': 'Communication Services', 'nameZh': '通信服务指数', 'ticker': 'XLC', 'type': 'Sector'},
    {'id': 'soxx', 'name': 'Semiconductors', 'nameZh': '半导体指数', 'ticker': 'SOXX', 'type': 'Sector'},
    {'id': 'kre', 'name': 'Regional Banks', 'nameZh': '区域银行指数', 'ticker': 'KRE', 'type': 'Sector'},
    {'id': 'ibb', 'name': 'Biotechnology', 'nameZh': '生物技术指数', 'ticker': 'IBB', 'type': 'Sector'},
    {'id': 'xrt', 'name': 'Retail', 'nameZh': '零售指数', 'ticker': 'XRT', 'type': 'Sector'},
    {'id': 'vnq', 'name': 'Vanguard Real Estate', 'nameZh': '先锋房地产指数', 'ticker': 'VNQ', 'type': 'Sector'},
    {'id': 'vig', 'name': 'Dividend Appreciation', 'nameZh': '股息增长指数', 'ticker': 'VIG', 'type': 'Core'},
    {'id': 'schd', 'name': 'US Dividend Equity', 'nameZh': '美股股息指数', 'ticker': 'SCHD', 'type': 'Core'},
    {'id': 'arkk', 'name': 'Innovation', 'nameZh': '创新指数', 'ticker': 'ARKK', 'type': 'Sector'},
    {'id': 'kweb', 'name': 'China Internet', 'nameZh': '中国互联网指数', 'ticker': 'KWEB', 'type': 'Sector'},
    {'id': 'gdx', 'name': 'Gold Miners', 'nameZh': '黄金矿业指数', 'ticker': 'GDX', 'type': 'Sector'},
]

CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'daily_quotes.json')

FIELDS = [
    'currentPrice', 'regularMarketPrice', 'trailingPE', 'forwardPE',
    'marketCap', 'priceToBook', 'shortName', 'longName'
]

def format_market_cap(market_cap):
    """Format market cap to string like $1.23T or $456.78B"""
    if market_cap is None:
        return None
    if market_cap >= 1e12:
        return f"${market_cap/1e12:.2f}T"
    elif market_cap >= 1e9:
        return f"${market_cap/1e9:.2f}B"
    elif market_cap >= 1e6:
        return f"${market_cap/1e6:.2f}M"
    else:
        return f"${market_cap:.0f}"

def compute_pe_percentile(ticker):
    """计算PE百分位 - 基于5年历史价格"""
    try:
        t = yf.Ticker(ticker)
        # 获取5年历史数据
        hist = t.history(period="5y")
        if hist.empty or len(hist) < 50:
            return 50
        
        # 使用价格百分位作为PE百分位的代理
        current_price = hist['Close'].iloc[-1]
        prices = hist['Close'].dropna()
        
        # 计算当前价格在历史中的百分位
        below = (prices <= current_price).sum()
        percentile = round((below / len(prices)) * 100)
        
        return percentile
    except Exception as e:
        print(f"  ⚠️ 计算百分位失败 {ticker}: {e}")
        return 50

def fetch_quote(ticker):
    """Fetch quote for a single ticker"""
    try:
        t = yf.Ticker(ticker)
        info = t.info
        
        price = info.get('currentPrice') or info.get('regularMarketPrice')
        if price is None:
            return None
        
        # 计算PE百分位
        pe_percentile = compute_pe_percentile(ticker)
        
        # 根据百分位判断状态
        status = 'Neutral'
        if pe_percentile < 30:
            status = 'Low'
        elif pe_percentile > 70:
            status = 'High'
        
        result = {
            'ticker': ticker.upper(),
            'price': round(price, 2) if price is not None else None,
            'peTtm': round(info.get('trailingPE'), 2) if info.get('trailingPE') is not None else None,
            'peFwd': round(info.get('forwardPE'), 2) if info.get('forwardPE') is not None else None,
            'pb': round(info.get('priceToBook'), 2) if info.get('priceToBook') is not None else None,
            'marketCap': info.get('marketCap'),
            'marketCapStr': format_market_cap(info.get('marketCap')),
            'name': info.get('shortName') or info.get('longName') or ticker,
            'pePercentile': pe_percentile,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        return result
    except Exception as e:
        print(f"  ⚠️ {ticker}: {e}")
        return None

def main():
    print(f"📈 开始抓取数据... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    
    companies = []
    indices = []
    total = len(TICKERS)
    
    for i, ticker in enumerate(TICKERS, 1):
        print(f"[{i}/{total}] 抓取 {ticker}...", end=' ')
        quote = fetch_quote(ticker)
        if quote:
            print(f"✅ ${quote['price']}")
            companies.append(quote)
        else:
            print("❌ 失败")
        # Be nice to Yahoo
        if i % 10 == 0:
            time.sleep(0.5)
    
    # 处理指数
    print("\n📊 处理指数基金...")
    for idx in INDICES:
        ticker = idx['ticker']
        print(f"  {ticker}...", end=' ')
        quote = fetch_quote(ticker)
        if quote:
            idx_data = {**idx, **quote}
            indices.append(idx_data)
            print(f"✅ ${quote['price']}")
        else:
            print("❌ 失败")
    
    # 保存
    cache_dir = os.path.dirname(CACHE_FILE)
    os.makedirs(cache_dir, exist_ok=True)
    
    output = {
        'timestamp': datetime.now().isoformat(),
        'companies': companies,
        'indices': indices
    }
    
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 完成！已保存 {len(companies)} 家公司 + {len(indices)} 个指数到 {CACHE_FILE}")
    
    # 打印摘要
    success_companies = [r for r in companies if r.get('price')]
    success_indices = [r for r in indices if r.get('price')]
    print(f"   公司: {len(success_companies)}/{total} 成功")
    print(f"   指数: {len(success_indices)}/{len(INDICES)} 成功")

if __name__ == '__main__':
    main()
