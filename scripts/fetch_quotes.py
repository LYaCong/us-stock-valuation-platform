#!/usr/bin/env python3
"""
美股数据每日抓取脚本
主数据源：新浪财经 API（国内直连、免费无限制）
补充数据源：Yahoo Finance（可选，补充新浪缺失字段 forwardPE/PB/ROE）

新浪财经 API 字段映射（gb_{ticker}）：
  [0]  名称        [1]  当前价       [2]  涨跌幅(%)    [3]  时间
  [4]  涨跌额      [5]  开盘价       [6]  最高价        [7]  最低价
  [8]  昨收        [9]  成交量       [10] 成交额        [11] ?
  [12] 市值(美元)  [13] ?           [14] PE(TTM)
"""

import json
import time
import os
import sys
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

# --- 配置 ---
SINA_DELAY = 0.2
YAHOO_DELAY = 0.5
YAHOO_ENABLED = os.environ.get('YAHOO_ENABLED', 'true').lower() == 'true'
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'stock_cache', 'daily_quotes.json')

HEADERS = {
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


# ========== 新浪财经 API ==========

def sina_ticker(ticker: str) -> str:
    return ticker.lower().replace('-', '')


def fetch_sina_batch(tickers: List[str]) -> Dict[str, Dict]:
    """批量从新浪财经获取行情（支持一次请求多个 ticker）"""
    codes = ','.join(f'gb_{sina_ticker(t)}' for t in tickers)
    url = f'https://hq.sinajs.cn/list={codes}'
    results = {}

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.encoding = 'gbk'
        lines = resp.text.strip().split('\n')

        for i, line in enumerate(lines):
            if i >= len(tickers):
                break
            ticker = tickers[i]
            try:
                data_str = line.split('="', 1)[1].rstrip('"; \r')
                if not data_str:
                    continue
                f = data_str.split(',')
                if len(f) < 2:
                    continue

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
                    'volume': safe_float(f[9]),       # 成交量
                    'turnover': safe_float(f[10]),     # 成交额
                    'market_cap': safe_float(f[12]),   # 市值（美元）
                    'pe_ttm': safe_float(f[14]),       # PE(TTM)
                }
            except (IndexError, ValueError) as e:
                print(f"    ⚠️ {ticker} 新浪解析失败: {e}")
    except Exception as e:
        print(f"    ❌ 新浪请求失败: {e}")

    return results


# ========== Yahoo Finance（补充数据源） ==========

def fetch_yahoo_supplement(tickers: List[str]) -> Dict[str, Dict]:
    if not YAHOO_ENABLED:
        return {}
    try:
        import yfinance as yf
    except ImportError:
        print("    ⚠️ yfinance 未安装，跳过 Yahoo 补充")
        return {}

    results = {}
    for ticker in tickers:
        try:
            info = yf.Ticker(ticker).info
            results[ticker] = {
                'peFwd': safe_round(info.get('forwardPE')),
                'pb': safe_round(info.get('priceToBook')),
                'roe_raw': info.get('returnOnEquity'),
                'marketCap': info.get('marketCap'),
                'shortName': info.get('shortName') or info.get('longName'),
            }
        except Exception as e:
            print(f"    ⚠️ {ticker} Yahoo 失败: {e}")
        time.sleep(YAHOO_DELAY)
    return results


# ========== 工具函数 ==========

def safe_float(val) -> Optional[float]:
    if val is None: return None
    try:
        v = str(val).strip()
        if v in ('--', '', 'N/A', 'NA', 'null', 'NaN'): return None
        return float(v)
    except (ValueError, TypeError):
        return None

def safe_round(val, digits=2) -> Optional[float]:
    v = safe_float(val)
    return round(v, digits) if v is not None else None

def format_market_cap(mc) -> Optional[str]:
    if mc is None: return None
    if mc >= 1e12: return f"${mc/1e12:.2f}T"
    if mc >= 1e9:  return f"${mc/1e9:.2f}B"
    if mc >= 1e6:  return f"${mc/1e6:.2f}M"
    return f"${mc:.0f}"

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


# ========== 主流程 ==========

def main():
    print(f"📈 开始抓取数据... ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print(f"   主数据源: 新浪财经 | 补充: {'Yahoo' if YAHOO_ENABLED else '禁用'}")

    # --- 公司：新浪批量 ---
    print(f"\n📊 新浪抓取 {len(TICKERS)} 家公司...")
    sina_data = fetch_sina_batch(TICKERS)

    companies = []
    c_ok, c_fail = 0, 0
    for t in TICKERS:
        sd = sina_data.get(t)
        if sd and sd.get('price') is not None:
            companies.append({
                'ticker': t.upper(),
                'name': sd.get('name', t),
                'price': sd.get('price'),
                'peTtm': sd.get('pe_ttm'),
                'peFwd': None,
                'pb': None,
                'roe': None,
                'marketCap': sd.get('market_cap'),
                'marketCapStr': format_market_cap(sd.get('market_cap')),
                'pePercentile': None,
                'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            c_ok += 1
            print(f"  ✅ {t}: ${sd['price']} PE={sd.get('pe_ttm') or 'N/A'} Cap={format_market_cap(sd.get('market_cap'))}")
        else:
            companies.append({
                'ticker': t.upper(), 'name': t, 'price': None,
                'peTtm': None, 'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': None, 'marketCapStr': None,
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            c_fail += 1
            print(f"  ❌ {t}: 无数据")
    print(f"  公司: {c_ok}/{len(TICKERS)} 成功")

    # --- 指数：新浪批量 ---
    print(f"\n📊 新浪抓取 {len(INDICES)} 个指数...")
    idx_tickers = [idx['ticker'] for idx in INDICES]
    sina_idx = fetch_sina_batch(idx_tickers)

    indices = []
    i_ok, i_fail = 0, 0
    for idx in INDICES:
        t = idx['ticker']
        sd = sina_idx.get(t)
        if sd and sd.get('price') is not None:
            indices.append({
                **idx,
                'price': sd.get('price'),
                'peTtm': sd.get('pe_ttm'),
                'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': sd.get('market_cap'),
                'marketCapStr': format_market_cap(sd.get('market_cap')),
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            i_ok += 1
            print(f"  ✅ {t}: ${sd['price']}")
        else:
            indices.append({**idx, 'price': None,
                'peTtm': None, 'peFwd': None, 'pb': None, 'roe': None,
                'marketCap': None, 'marketCapStr': None,
                'pePercentile': None, 'status': 'Neutral',
                'timestamp': datetime.now().isoformat(),
            })
            i_fail += 1
            print(f"  ❌ {t}: 无数据")
    print(f"  指数: {i_ok}/{len(INDICES)} 成功")

    # --- Yahoo 补充 ---
    yahoo_ok_tickers = [c['ticker'] for c in companies if c['price'] is not None]
    yahoo_ok_tickers += [idx['ticker'] for idx in indices if idx.get('price') is not None]

    if yahoo_ok_tickers and YAHOO_ENABLED:
        print(f"\n📊 Yahoo 补充 {len(yahoo_ok_tickers)} 个 ticker (forwardPE/PB/ROE)...")
        yahoo_data = fetch_yahoo_supplement(yahoo_ok_tickers)
        yahoo_hit = 0
        for c in companies:
            yd = yahoo_data.get(c['ticker'])
            if yd:
                if yd.get('peFwd') is not None: c['peFwd'] = yd['peFwd']
                if yd.get('pb') is not None: c['pb'] = yd['pb']
                if yd.get('roe_raw') is not None:
                    roe = yd['roe_raw']
                    c['roe'] = round(roe * 100, 2) if roe < 1 else round(roe, 2)
                if not c.get('marketCap') and yd.get('marketCap'):
                    c['marketCap'] = yd['marketCap']
                    c['marketCapStr'] = format_market_cap(yd['marketCap'])
                yahoo_hit += 1
        for idx in indices:
            yd = yahoo_data.get(idx['ticker'])
            if yd:
                if yd.get('peFwd') is not None: idx['peFwd'] = yd['peFwd']
                if yd.get('pb') is not None: idx['pb'] = yd['pb']
                if yd.get('roe_raw') is not None:
                    roe = yd['roe_raw']
                    idx['roe'] = round(roe * 100, 2) if roe < 1 else round(roe, 2)
                yahoo_hit += 1
        print(f"  Yahoo 补充: {yahoo_hit}/{len(yahoo_ok_tickers)} 成功")
    elif not YAHOO_ENABLED:
        print("\n  ⏭️ Yahoo 补充已禁用（设置 YAHOO_ENABLED=true 启用）")

    # --- 保存 ---
    total = len(TICKERS) + len(INDICES)
    total_ok = c_ok + i_ok
    rate = total_ok / total if total > 0 else 0

    wrote = merge_and_save(companies, indices, CACHE_FILE, rate, is_final=True)
    if wrote:
        print(f"\n✅ 完成！{len(companies)} 公司 + {len(indices)} 指数 | 成功率 {rate:.1%}")
    else:
        print(f"\n⚠️ 成功率不足，保留旧缓存")

    return 0 if rate > 0.3 else 1


if __name__ == '__main__':
    sys.exit(main())
