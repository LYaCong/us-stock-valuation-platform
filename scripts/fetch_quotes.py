#!/usr/bin/env python3
"""
美股数据每日抓取脚本
每天早上8点自动运行，抓取所有股票实时数据并写入缓存文件

优化说明:
- 添加请求延迟避免限速
- 添加限速重试逻辑(指数退避)
- 成功请求立即写入文件(增量写入)
- 汇总成功/失败数量
"""

import yfinance as yf
import json
import time
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List

REQUEST_DELAY = 0.3
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2
RETRY_MAX_DELAY = 60
INCREMENTAL_WRITE_INTERVAL = 10

# 股票列表（与前端 src/config/tickers.ts 保持一致）
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

def load_cache(filepath: str) -> Dict:
    """加载旧缓存文件，如果不存在或格式错误返回空结构"""
    if not os.path.exists(filepath):
        return {'companies': [], 'indices': []}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return {
                'companies': data.get('companies', []),
                'indices': data.get('indices', [])
            }
    except (json.JSONDecodeError, IOError) as e:
        print(f"  ⚠️ 加载旧缓存失败: {e}, 将使用空缓存")
        return {'companies': [], 'indices': []}

def merge_and_save(
    new_companies: List[Dict],
    new_indices: List[Dict],
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
    old_cache = load_cache(filepath)

    # 合并逻辑：新数据优先，旧数据补充
    merged_companies = []
    merged_indices = []
    seen_companies = set()
    seen_indices = set()
    
    # 先加入所有新数据
    for c in new_companies:
        merged_companies.append(c)
        seen_companies.add(c['ticker'])
    
    for i in new_indices:
        merged_indices.append(i)
        seen_indices.add(i['ticker'])
    
    # 再补充旧数据中没有被新数据覆盖的条目
    for c in old_cache.get('companies', []):
        if c['ticker'] not in seen_companies:
            merged_companies.append(c)
            seen_companies.add(c['ticker'])
    
    for i in old_cache.get('indices', []):
        if i['ticker'] not in seen_indices:
            merged_indices.append(i)
            seen_indices.add(i['ticker'])
    
    # 最终写入时检查成功率
    if is_final:
        if success_rate < 0.5:
            print(f"  ⚠️ 成功率 {success_rate:.1%} < 50%, 保留旧缓存不写入")
            return False
    
    # 写入合并后的数据
    cache_dir = os.path.dirname(filepath)
    os.makedirs(cache_dir, exist_ok=True)
    output = {
        'timestamp': datetime.now().isoformat(),
        'companies': merged_companies,
        'indices': merged_indices
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
    print(f"   配置: 延迟={REQUEST_DELAY}s, 重试={MAX_RETRIES}次, 增量写入={INCREMENTAL_WRITE_INTERVAL}")
    
    companies = []
    indices = []
    success_companies = 0
    failed_companies = 0
    total_companies = len(TICKERS)
    total_indices = len(INDICES)
    total_tickers = total_companies + total_indices
    incremental_counter = 0
    
    for i, ticker in enumerate(TICKERS, 1):
        print(f"[{i}/{total_companies}] 抓取 {ticker}...", end=' ')
        quote = fetch_with_retry(ticker, fetch_quote)
        if quote:
            print(f"✅ ${quote['price']}")
            companies.append(quote)
            success_companies += 1
        else:
            print("❌ 失败")
            failed_companies += 1
        
        incremental_counter += 1
        if incremental_counter >= INCREMENTAL_WRITE_INTERVAL:
            current_success = success_companies
            current_rate = current_success / total_tickers if total_tickers > 0 else 0
            merge_and_save(companies, indices, CACHE_FILE, current_rate, is_final=False)
            print(f"  💾 增量保存: {len(companies)} 家公司 + {len(indices)} 个指数")
            incremental_counter = 0
        
        time.sleep(REQUEST_DELAY)
    
    print(f"\n📊 公司完成: {success_companies}/{total_companies} 成功, {failed_companies} 失败")
    print("📊 处理指数基金...")
    
    success_indices = 0
    failed_indices = 0
    for idx in INDICES:
        ticker = idx['ticker']
        print(f"  {ticker}...", end=' ')
        quote = fetch_with_retry(ticker, fetch_quote)
        if quote:
            idx_data = {**idx, **quote}
            indices.append(idx_data)
            print(f"✅ ${quote['price']}")
            success_indices += 1
        else:
            print("❌ 失败")
            failed_indices += 1
        
        incremental_counter += 1
        if incremental_counter >= INCREMENTAL_WRITE_INTERVAL:
            current_success = success_companies + success_indices
            current_rate = current_success / total_tickers if total_tickers > 0 else 0
            merge_and_save(companies, indices, CACHE_FILE, current_rate, is_final=False)
            print(f"  💾 增量保存: {len(companies)} 家公司 + {len(indices)} 个指数")
            incremental_counter = 0
        
        time.sleep(REQUEST_DELAY)
    
    total_success = success_companies + success_indices
    final_rate = total_success / total_tickers if total_tickers > 0 else 0
    wrote = merge_and_save(companies, indices, CACHE_FILE, final_rate, is_final=True)
    
    if wrote:
        print(f"\n✅ 完成！已保存 {len(companies)} 家公司 + {len(indices)} 个指数到 {CACHE_FILE}")
    else:
        print(f"\n⚠️ 完成！成功率不足，保留旧缓存")
    print(f"   公司: {success_companies}/{total_companies} 成功, {failed_companies} 失败")
    print(f"   指数: {success_indices}/{total_indices} 成功, {failed_indices} 失败")
    print(f"   总成功率: {final_rate:.1%}")

if __name__ == '__main__':
    main()
