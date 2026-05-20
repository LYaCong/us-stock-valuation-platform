#!/usr/bin/env python3
"""
美股数据每日抓取脚本

数据源优先级：
  1. 新浪财经 API（主数据源）— 价格、PE(TTM)、市值、中文名、OHLCV
  2. Finnhub API（补充数据源）— Forward PE、PB、ROE、52周高低
     + 新浪不支持的 ticker（如 BRK-B）由 Finnhub quote API 提供价格
  3. Alpha Vantage API（补充数据源）— Forward PE、PB、ROE、分析师评级（25次/天）

新浪财经 API 字段映射（gb_{ticker}）：
  [0]  名称        [1]  当前价       [2]  涨跌幅(%)    [3]  时间
  [4]  涨跌额      [5]  开盘价       [6]  最高价        [7]  最低价
  [8]  昨收        [9]  成交量       [10] 成交额        [12] 市值(美元)
  [14] PE(TTM)
"""

import json
import time
import os
import sys
import requests
import subprocess
from datetime import datetime
from typing import Optional, Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# --- 配置 ---
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'daily_quotes.json')
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
SINA_ENABLED = ENV.get('SINA_ENABLED', 'true').lower() == 'true'
FINNHUB_KEY = ENV.get('FINNHUB_API_KEY', '')
ALPHAVANTAGE_KEY = ENV.get('ALPHA_VANTAGE_API_KEY', '')
TWELVEDATA_KEY = ENV.get('TWELVE_DATA_API_KEY', '')
EODHD_KEY = ENV.get('EODHD_API_TOKEN', '')

HEADERS_SINA = {
    'Referer': 'https://finance.sina.com.cn/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

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
    {'id': 'vnq', 'name': 'Vanguard Real Estate', 'nameZh': '先锋房地产指数', 'ticker': 'VNQ', 'type': 'Core'},
    {'id': 'vig', 'name': 'Dividend Appreciation', 'nameZh': '股息增长指数', 'ticker': 'VIG', 'type': 'Core'},
    {'id': 'schd', 'name': 'US Dividend Equity', 'nameZh': '美股股息指数', 'ticker': 'SCHD', 'type': 'Core'},
    {'id': 'arkk', 'name': 'Innovation', 'nameZh': '创新指数', 'ticker': 'ARKK', 'type': 'Sector'},
    {'id': 'kweb', 'name': 'China Internet', 'nameZh': '中国互联网指数', 'ticker': 'KWEB', 'type': 'Sector'},
    {'id': 'gdx', 'name': 'Gold Miners', 'nameZh': '黄金矿业指数', 'ticker': 'GDX', 'type': 'Sector'},
]

# 新浪不支持的 ticker（由 Finnhub 提供全部数据）
SINA_SKIP_TICKERS = {'BRK-B'}

def sina_ticker(ticker: str) -> str:
    if ticker in SINA_SKIP_TICKERS:
        return None
    return ticker.lower().replace('-', '')


# ========== 工具函数 ==========

def safe_float(val) -> Optional[float]:
    if val is None: return None
    try:
        v = str(val).strip()
        if v in ('--', '', 'N/A', 'NA', 'null', 'NaN', 'None'): return None
        return float(v)
    except (ValueError, TypeError):
        return None

def safe_round(val, digits=2) -> Optional[float]:
    v = safe_float(val)
    return round(v, digits) if v is not None else None

def safe_int(val) -> Optional[int]:
    v = safe_float(val)
    return int(v) if v is not None else None

def format_market_cap(mc) -> Optional[str]:
    if mc is None: return None
    if mc >= 1e12: return f"${mc/1e12:.2f}T"
    if mc >= 1e9:  return f"${mc/1e9:.2f}B"
    if mc >= 1e6:  return f"${mc/1e6:.2f}M"
    return f"${mc:.0f}"

def source_map(entry: Dict) -> Dict:
    if not isinstance(entry.get('source'), dict):
        entry['source'] = {}
    return entry['source']

def load_cache(filepath: str) -> Dict:
    if not os.path.exists(filepath): return {'companies': [], 'indices': []}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            return {'companies': d.get('companies', []), 'indices': d.get('indices', [])}
    except: return {'companies': [], 'indices': []}

def merge_and_save(new_c, new_i, filepath, rate, is_final=False):
    old = load_cache(filepath)
    mc, mi, sc, si = [], [], set(), set()
    for c in new_c: mc.append(c); sc.add(c['ticker'])
    for i in new_i: mi.append(i); si.add(i['ticker'])
    for c in old.get('companies', []):
        if c['ticker'] not in sc: mc.append(c); sc.add(c['ticker'])
    for i in old.get('indices', []):
        if i['ticker'] not in si: mi.append(i); si.add(i['ticker'])
    if is_final and rate < 0.3:
        print(f"  ⚠️ 成功率 {rate:.1%} < 30%, 保留旧缓存")
        return False
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({'timestamp': datetime.now().isoformat(), 'companies': mc, 'indices': mi}, f, ensure_ascii=False, indent=2)
    return True


# ========== 新浪财经 API（主数据源）==========

def fetch_sina_batch(tickers: List[str], batch_size: int = 30) -> Dict[str, Dict]:
    """分批从新浪获取行情，跳过不支持的 ticker"""
    fetchable = [t for t in tickers if sina_ticker(t) is not None]
    skipped = [t for t in tickers if sina_ticker(t) is None]
    if skipped:
        print(f"  新浪跳过（不支持）: {skipped}")

    results = {}
    for i in range(0, len(fetchable), batch_size):
        batch = fetchable[i:i + batch_size]
        batch_data = _fetch_sina_batch_raw(batch)
        results.update(batch_data)
        if i + batch_size < len(fetchable):
            time.sleep(0.1)
    return results


def _fetch_sina_batch_raw(tickers: List[str]) -> Dict[str, Dict]:
    codes = ','.join(f'gb_{sina_ticker(t)}' for t in tickers)
    url = f'https://hq.sinajs.cn/list={codes}'
    results = {}
    try:
        resp = requests.get(url, headers=HEADERS_SINA, timeout=15)
        resp.encoding = 'gbk'
        lines = resp.text.strip().split('\n')
        for i, line in enumerate(lines):
            if i >= len(tickers): break
            ticker = tickers[i]
            try:
                data_str = line.split('="', 1)[1].rstrip('"; \r')
                if not data_str: continue
                f = data_str.split(',')
                if len(f) < 2: continue
                results[ticker] = {
                    'name': f[0],
                    'price': safe_float(f[1]),
                    'change_pct': safe_float(f[2]),
                    'change_time': f[3] if len(f) > 3 else None,
                    'change_amount': safe_float(f[4]),
                    'open': safe_float(f[5]),
                    'high': safe_float(f[6]),
                    'low': safe_float(f[7]),
                    'prev_close': safe_float(f[8]),
                    'volume': safe_float(f[9]),
                    'turnover': safe_float(f[10]),
                    'market_cap': safe_float(f[12]),
                    'pe_ttm': safe_float(f[14]),
                }
            except (IndexError, ValueError) as e:
                print(f"    ⚠️ {ticker} 新浪解析失败: {e}")
    except Exception as e:
        print(f"    ❌ 新浪请求失败: {e}")
    return results


# ========== Finnhub API（限速并发）==========

_finnhub_lock = threading.Lock()
_finnhub_last_request = 0.0
FINNHUB_MIN_INTERVAL = 1.1  # 秒，确保 < 60次/分钟

def _finnhub_throttle():
    """限速：确保请求间隔 >= FINNHUB_MIN_INTERVAL"""
    global _finnhub_last_request
    with _finnhub_lock:
        now = time.time()
        wait = FINNHUB_MIN_INTERVAL - (now - _finnhub_last_request)
        if wait > 0:
            time.sleep(wait)
        _finnhub_last_request = time.time()


def _fetch_finnhub_single(ticker: str) -> tuple:
    """单个 ticker 的 Finnhub 请求（含限速）"""
    _finnhub_throttle()
    ft = ticker.replace('-', '.')
    result = {}
    try:
        resp = requests.get(
            f'https://finnhub.io/api/v1/stock/metric?symbol={ft}&metric=all&token={FINNHUB_KEY}',
            timeout=15
        )
        data = resp.json()
        m = data.get('metric', {})
        market_cap_millions = safe_float(m.get('marketCapitalization'))
        result = {
            'forwardPE': safe_round(m.get('forwardPE')),
            'pb': safe_round(m.get('pbAnnual')),
            'roe': safe_round(m.get('roeTTM')),
            'peNormalized': safe_round(m.get('peNormalizedAnnual')),
            'marketCap': market_cap_millions * 1_000_000 if market_cap_millions is not None else None,
            '52weekHigh': safe_float(m.get('52WeekHigh')),
            '52weekLow': safe_float(m.get('52WeekLow')),
            'beta': safe_round(m.get('beta'), 3),
            'dividendYield': safe_round(m.get('currentDividendYieldTTM'), 4),
        }
    except Exception as e:
        print(f"    ⚠️ {ticker} Finnhub metric 失败: {e}")
    return (ticker, result)


def fetch_finnhub_concurrent(tickers: List[str], max_workers: int = 2) -> Dict[str, Dict]:
    """限速并发从 Finnhub 获取补充指标。2线程 + 每请求间隔1.1秒 ≈ 每分钟约55次"""
    if not FINNHUB_KEY:
        print("    ⚠️ FINNHUB_API_KEY 未配置，跳过")
        return {}

    results = {}
    total = len(tickers)
    done = 0

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_fetch_finnhub_single, t): t for t in tickers}
        for future in as_completed(futures):
            ticker, data = future.result()
            results[ticker] = data
            done += 1
            if done % 25 == 0 or done == total:
                print(f"    Finnhub 进度: {done}/{total}")

    return results


def fetch_finnhub_quote(ticker: str) -> Optional[Dict]:
    """从 Finnhub 获取实时报价（用于新浪不支持的 ticker）"""
    if not FINNHUB_KEY:
        return None
    _finnhub_throttle()
    ft = ticker.replace('-', '.')
    try:
        resp = requests.get(
            f'https://finnhub.io/api/v1/quote?symbol={ft}&token={FINNHUB_KEY}',
            timeout=15
        )
        data = resp.json()
        if data and data.get('c') and data['c'] > 0:
            return {
                'price': data['c'],
                'change_pct': safe_round(((data['c'] - data.get('pc', data['c'])) / data.get('pc', data['c'])) * 100) if data.get('pc') else None,
                'change_amount': safe_round(data.get('d')),
                'open': safe_float(data.get('o')),
                'high': safe_float(data.get('h')),
                'low': safe_float(data.get('l')),
                'prev_close': safe_float(data.get('pc')),
            }
    except Exception as e:
        print(f"    ⚠️ {ticker} Finnhub quote 失败: {e}")
    return None


# ========== Alpha Vantage API（补充数据源）==========

def fetch_alphavantage_batch(tickers: List[str]) -> Dict[str, Dict]:
    """从 Alpha Vantage 获取补充指标，限制 25次/天"""
    if not ALPHAVANTAGE_KEY:
        print("    ⚠️ ALPHA_VANTAGE_API_KEY 未配置，跳过")
        return {}

    results = {}
    for ticker in tickers:
        try:
            resp = requests.get(
                f'https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={ALPHAVANTAGE_KEY}',
                timeout=15
            )
            data = resp.json()

            if not data or 'Error Message' in data or 'Note' in data:
                msg = data.get('Note', data.get('Error Message', 'empty response'))
                print(f"    ⚠️ {ticker} Alpha Vantage: {msg}")
                if 'call frequency' in str(msg).lower() or 'thank you' in str(msg).lower():
                    print(f"    ⏹️ Alpha Vantage 限速，停止请求")
                    break
                continue

            results[ticker] = {
                'forwardPE': safe_round(data.get('ForwardPE')),
                'pb': safe_round(data.get('PriceToBookRatio')),
                'roe_raw': safe_float(data.get('ReturnOnEquityTTM')),
                'analystTargetPrice': safe_round(data.get('AnalystTargetPrice')),
                'analystStrongBuy': safe_float(data.get('AnalystRatingStrongBuy')),
                'analystBuy': safe_float(data.get('AnalystRatingBuy')),
                'analystHold': safe_float(data.get('AnalystRatingHold')),
                'analystSell': safe_float(data.get('AnalystRatingSell')),
            }
            print(f"    ✅ AV {ticker}: FwdPE={results[ticker].get('forwardPE')} PB={results[ticker].get('pb')} ROE={results[ticker].get('roe_raw')}")

        except Exception as e:
            print(f"    ⚠️ {ticker} Alpha Vantage 失败: {e}")

        time.sleep(1)

    return results


# ========== EODHD API（ETF/指数估值直给字段）==========

def get_nested(data: Dict, path: List[str]):
    cur = data
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return None
        cur = cur[key]
    return cur


def first_nested(data: Dict, paths: List[List[str]]):
    for path in paths:
        value = get_nested(data, path)
        if value is not None:
            return value
    return None


def fetch_eodhd_index_fundamentals(indices: List[Dict]) -> Dict[str, Dict]:
    """从 EODHD 读取 ETF/指数供应商直给估值字段，不做持仓加权或估算。"""
    if not EODHD_KEY:
        print("    ⚠️ EODHD_API_TOKEN 未配置，跳过指数/ETF估值直给字段")
        return {}

    results = {}
    for idx in indices:
        ticker = idx['ticker']
        symbol = f"{ticker}.US"
        url = f"https://eodhd.com/api/fundamentals/{symbol}"
        try:
            resp = requests.get(
                url,
                params={'api_token': EODHD_KEY, 'fmt': 'json'},
                timeout=20,
            )
            data = resp.json()
            if not isinstance(data, dict):
                print(f"    ⚠️ {ticker} EODHD: invalid response")
                continue
            if data.get('Message') or data.get('Error Message'):
                msg = data.get('Message') or data.get('Error Message') or 'empty response'
                print(f"    ⚠️ {ticker} EODHD: {msg}")
                continue

            etf_data = data.get('ETF_Data') if isinstance(data.get('ETF_Data'), dict) else {}
            valuation_paths = [
                ['ETF_Data', 'Valuations_Growth', 'Valuations_Rates_Portfolio'],
                ['ETF_Data', 'Valuations_Growth', 'Valuations_Rates'],
                ['ETF_Data', 'Valuations_Rates_Portfolio'],
            ]
            valuation = {}
            for path in valuation_paths:
                value = get_nested(data, path)
                if isinstance(value, dict):
                    valuation = value
                    break

            result = {
                'peTtm': safe_round(first_nested(data, [
                    ['Highlights', 'PERatio'],
                    ['Valuation', 'TrailingPE'],
                ])),
                'peFwd': safe_round(
                    valuation.get('Price/Prospective Earnings')
                    or valuation.get('Price/Forward Earnings')
                    or first_nested(data, [['Highlights', 'ForwardPE']])
                ),
                'pb': safe_round(
                    valuation.get('Price/Book')
                    or first_nested(data, [['Highlights', 'PriceBookMRQ']])
                ),
                'dividendYield': safe_round(
                    etf_data.get('Yield')
                    or first_nested(data, [['Highlights', 'DividendYield']]),
                    4,
                ),
                'expenseRatio': safe_round(
                    etf_data.get('NetExpenseRatio')
                    or etf_data.get('Ongoing_Charge'),
                    4,
                ),
                'assetsUnderManagement': safe_int(etf_data.get('TotalAssets')),
                'eodhdUpdatedAt': data.get('UpdatedAt'),
            }
            results[ticker] = {k: v for k, v in result.items() if v is not None}
            print(f"    ✅ EODHD {ticker}: PE={result.get('peTtm')} FwdPE={result.get('peFwd')} PB={result.get('pb')}")
        except Exception as e:
            print(f"    ⚠️ {ticker} EODHD 失败: {e}")

        time.sleep(0.2)

    return results


def run_pe_recalculation() -> bool:
    """行情写入后立即重算公司PE与百分位，避免每日刷新把衍生字段冲空。"""
    script_path = os.path.join(SCRIPT_DIR, 'calculate_pe_history.py')
    try:
        result = subprocess.run([sys.executable, script_path], check=False)
        return result.returncode == 0
    except Exception as e:
        print(f"  ❌ PE百分位重算失败: {e}")
        return False


# ========== 主流程 ==========

def append_valuation_history(companies, indices, cache_dir):
    """把每天的估值指标追加到 valuation_history.json（按日期分区）"""
    from datetime import date
    today = date.today().isoformat()  # "2026-05-13"
    hist_file = os.path.join(cache_dir, '..', 'stock_cache', 'valuation_history.json')
    
    # 加载已有数据
    hist = {}
    if os.path.exists(hist_file):
        try:
            with open(hist_file, 'r', encoding='utf-8') as f:
                hist = json.load(f)
        except:
            hist = {}
    
    # 构建当天的估值快照
    snapshot = {}
    for c in companies:
        if c.get('price') is None or c.get('price', 0) == 0:
            continue
        snapshot[c['ticker']] = {
            'price': c.get('price'),
            'peTtm': c.get('peTtm'),
            'peFwd': c.get('peFwd'),
            'pb': c.get('pb'),
            'roe': c.get('roe'),
            'marketCap': c.get('marketCap'),
        }
    for idx in indices:
        if idx.get('price') is None or idx.get('price', 0) == 0:
            continue
        snapshot[idx['ticker']] = {
            'price': idx.get('price'),
            'peTtm': idx.get('peTtm'),
            'marketCap': idx.get('marketCap'),
        }
    
    # 追加/覆盖当天数据
    hist[today] = snapshot
    
    # 保存
    os.makedirs(os.path.dirname(hist_file), exist_ok=True)
    with open(hist_file, 'w', encoding='utf-8') as f:
        json.dump(hist, f, ensure_ascii=False, indent=2)
    
    dates = sorted(hist.keys())
    print(f"  💾 估值历史已更新: {today} ({len(snapshot)} tickers) | 总计 {len(dates)} 天数据")

def main():
    start_time = time.time()
    print(f"📈 开始抓取数据... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")

    all_tickers = TICKERS + [idx['ticker'] for idx in INDICES]

    # ============================
    # 第 1 步：新浪财经（主数据源）
    # ============================
    print(f"\n📡 [1/3] 新浪财经 — 批量抓取 {len(all_tickers)} 个 ticker...")
    sina_data = fetch_sina_batch(all_tickers)

    companies = []
    indices = []
    c_ok, c_fail, i_ok, i_fail = 0, 0, 0, 0

    for t in TICKERS:
        sd = sina_data.get(t)
        if sd and sd.get('price') is not None and sd.get('price', 0) > 0:
            companies.append({
                'ticker': t.upper(), 'name': sd.get('name', t),
                'price': sd.get('price'), 'peTtm': sd.get('pe_ttm'),
                'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': sd.get('market_cap'),
                'marketCapStr': format_market_cap(sd.get('market_cap')),
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
                'source': {'price': 'sina', 'peTtm': 'sina', 'marketCap': 'sina'},
            })
            c_ok += 1
        else:
            companies.append({
                'ticker': t.upper(), 'name': t, 'price': None,
                'peTtm': None, 'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': None, 'marketCapStr': None,
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(), 'source': {},
            })
            c_fail += 1
            if t in SINA_SKIP_TICKERS:
                print(f"  ⏭️ {t}: 新浪不支持，将由 Finnhub 提供全部数据")
            else:
                print(f"  ❌ {t}: 新浪无数据")

    for idx in INDICES:
        t = idx['ticker']
        sd = sina_data.get(t)
        if sd and sd.get('price') is not None and sd.get('price', 0) > 0:
            indices.append({
                **idx, 'price': sd.get('price'), 'peTtm': sd.get('pe_ttm'),
                'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': sd.get('market_cap'),
                'marketCapStr': format_market_cap(sd.get('market_cap')),
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            i_ok += 1
        else:
            indices.append({
                **idx, 'price': None,
                'peTtm': None, 'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': None, 'marketCapStr': None,
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            i_fail += 1
            print(f"  ❌ {t}: 新浪无数据")

    print(f"  新浪: {c_ok} 公司 + {i_ok} 指数 成功")

    # 合并 ticker→entry 的映射
    all_entries = {c['ticker']: c for c in companies}
    for idx in indices:
        all_entries[idx['ticker']] = idx

    ok_tickers = [t for t in all_tickers if all_entries.get(t, {}).get('price') is not None]
    no_price_tickers = [t for t in all_tickers if all_entries.get(t, {}).get('price') is None]

    # ============================
    # 第 1.5 步：Finnhub 补价格（新浪不支持的 ticker）
    # ============================
    if FINNHUB_KEY and no_price_tickers:
        print(f"\n📡 [1.5/3] Finnhub quote — 补 {len(no_price_tickers)} 个新浪缺失 ticker 的价格...")
        for t in no_price_tickers:
            q = fetch_finnhub_quote(t)
            if q and q.get('price'):
                entry = all_entries.get(t)
                if entry:
                    entry['price'] = q['price']
                    if q.get('open'): entry['open'] = q['open']
                    if q.get('high'): entry['high'] = q['high']
                    if q.get('low'): entry['low'] = q['low']
                    if q.get('prev_close'): entry['prev_close'] = q['prev_close']
                    if t.upper() == 'BRK-B':
                        entry['name'] = '伯克希尔B类'
                    print(f"  ✅ {t}: Finnhub 价格 {q['price']}")
                    if t in TICKERS:
                        c_ok += 1; c_fail -= 1
                    else:
                        i_ok += 1; i_fail -= 1

    # 重新计算 ok_tickers
    ok_tickers = [t for t in all_tickers if all_entries.get(t, {}).get('price') is not None]

    # ============================
    # 第 2 步：Finnhub（限速并发补充 Forward PE, PB, ROE）
    # ============================
    finnhub_hit = 0
    if FINNHUB_KEY and ok_tickers:
        est_time = len(ok_tickers) * FINNHUB_MIN_INTERVAL / 2  # 2 threads
        print(f"\n📡 [2/3] Finnhub — 限速并发补充 {len(ok_tickers)} 个 ticker (2线程, 预计{est_time:.0f}s)...")
        fh_data = fetch_finnhub_concurrent(ok_tickers, max_workers=2)
        for ticker, fh in fh_data.items():
            entry = all_entries.get(ticker)
            if not entry or not fh: continue
            updated = False
            if fh.get('forwardPE') is not None and entry.get('peFwd') is None:
                entry['peFwd'] = fh['forwardPE']
                source_map(entry)['peFwd'] = 'finnhub'
                updated = True
            if fh.get('pb') is not None and entry.get('pb') is None:
                entry['pb'] = fh['pb']
                source_map(entry)['pb'] = 'finnhub'
                updated = True
            if fh.get('roe') is not None and entry.get('roe') is None:
                entry['roe'] = fh['roe']
                source_map(entry)['roe'] = 'finnhub'
                updated = True
            if fh.get('marketCap') is not None and not entry.get('marketCap'):
                entry['marketCap'] = fh['marketCap']
                entry['marketCapStr'] = format_market_cap(fh['marketCap'])
                source_map(entry)['marketCap'] = 'finnhub'
                updated = True
            if fh.get('52weekHigh') is not None:
                entry['52weekHigh'] = fh['52weekHigh']
            if fh.get('52weekLow') is not None:
                entry['52weekLow'] = fh['52weekLow']
            if fh.get('beta') is not None:
                entry['beta'] = fh['beta']
            if updated:
                finnhub_hit += 1
        print(f"  Finnhub: {finnhub_hit}/{len(ok_tickers)} 补充成功")

    # ============================
    # 第 3 步：Alpha Vantage（补充分析师评级、二次补充）
    # ============================
    av_hit = 0
    if ALPHAVANTAGE_KEY and ok_tickers:
        missing = [t for t in TICKERS
                   if all_entries.get(t, {}).get('peFwd') is None
                   or all_entries.get(t, {}).get('pb') is None
                   or all_entries.get(t, {}).get('roe') is None]
        av_tickers = missing[:25]
        if av_tickers:
            print(f"\n📡 [3/3] Alpha Vantage — 补充 {len(av_tickers)} 个缺失个股...")
            av_data = fetch_alphavantage_batch(av_tickers)
            for ticker, av in av_data.items():
                entry = all_entries.get(ticker)
                if not entry or not av: continue
                updated = False
                if av.get('forwardPE') is not None and entry.get('peFwd') is None:
                    entry['peFwd'] = av['forwardPE']
                    source_map(entry)['peFwd'] = 'alphavantage'
                    updated = True
                if av.get('pb') is not None and entry.get('pb') is None:
                    entry['pb'] = av['pb']
                    source_map(entry)['pb'] = 'alphavantage'
                    updated = True
                if av.get('roe_raw') is not None and entry.get('roe') is None:
                    roe = av['roe_raw']
                    entry['roe'] = round(roe * 100, 2) if roe < 5 else round(roe, 2)
                    source_map(entry)['roe'] = 'alphavantage'
                    updated = True
                if av.get('analystTargetPrice'):
                    entry['analystTargetPrice'] = av['analystTargetPrice']
                if av.get('analystStrongBuy') is not None:
                    entry['analystRating'] = {
                        'strongBuy': av.get('analystStrongBuy', 0),
                        'buy': av.get('analystBuy', 0),
                        'hold': av.get('analystHold', 0),
                        'sell': av.get('analystSell', 0),
                    }
                if updated:
                    av_hit += 1
            print(f"  Alpha Vantage: {av_hit}/{len(av_tickers)} 补充成功")
        else:
            print(f"\n📡 [3/3] Alpha Vantage — 所有个股字段已有数据，跳过")

    # ============================
    # 第 4 步：EODHD（指数/ETF估值直给字段，不使用 Yahoo）
    # ============================
    print(f"\n📡 [4/4] EODHD — 补充指数/ETF供应商直给估值字段...")
    eodhd_data = fetch_eodhd_index_fundamentals(indices)
    eodhd_hit = 0
    for ticker, data in eodhd_data.items():
        entry = all_entries.get(ticker)
        if not entry or not data:
            continue
        for field in ['peTtm', 'peFwd', 'pb', 'dividendYield', 'expenseRatio', 'assetsUnderManagement', 'eodhdUpdatedAt']:
            if data.get(field) is not None:
                entry[field] = data[field]
        entry['dataRange'] = 'EODHD direct'
        eodhd_hit += 1
    print(f"  EODHD: {eodhd_hit}/{len(indices)} 指数/ETF补充成功")

    # 清理 source 字段
    for entry in companies + indices:
        entry.pop('source', None)

    # ============================
    # 保存
    # ============================
    total = len(TICKERS) + len(INDICES)
    total_ok = c_ok + i_ok
    rate = total_ok / total if total > 0 else 0

    wrote = merge_and_save(companies, indices, CACHE_FILE, rate, is_final=True)
    elapsed = time.time() - start_time

    # 公司 PE 百分位必须在行情写入后重算；之后再记录估值历史。
    recalculated = True
    if wrote:
        print("\n📊 [PE] 重算公司PE和历史百分位...")
        recalculated = run_pe_recalculation()
        if recalculated:
            refreshed = load_cache(CACHE_FILE)
            companies = refreshed.get('companies', companies)
            indices = refreshed.get('indices', indices)
        else:
            print("  ❌ PE重算失败，停止后续流程，避免发布不完整缓存")

    # 记录估值历史
    if wrote and recalculated:
        cache_dir = os.path.join(SCRIPT_DIR, '..', 'stock_cache')
        append_valuation_history(companies, indices, cache_dir)

    if wrote:
        fwd_count = sum(1 for c in companies if c.get('peFwd') is not None)
        pb_count = sum(1 for c in companies if c.get('pb') is not None)
        roe_count = sum(1 for c in companies if c.get('roe') is not None)
        print(f"\n✅ 完成！{len(companies)} 公司 + {len(indices)} 指数 | 价格覆盖率 {rate:.1%} | 耗时 {elapsed:.1f}s")
        print(f"   字段覆盖率: FwdPE {fwd_count}/{len(companies)} | PB {pb_count}/{len(companies)} | ROE {roe_count}/{len(companies)}")
    else:
        print(f"\n⚠️ 成功率不足，保留旧缓存 | 耗时 {elapsed:.1f}s")

    return 0 if rate > 0.3 and recalculated else 1


if __name__ == '__main__':
    sys.exit(main())


# ========== 估值历史积累 ==========
