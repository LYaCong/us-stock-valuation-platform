import { CompanyValuation, IndexValuation } from '../types';
import { COMPANY_NAME_ZH, INDEX_NAME_ZH, INDEX_NAME_EN } from '../data/tickerMappings';

const API_BASE = '';

interface YahooValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'US' | 'ADR';
  marketCap: string;
  price: number;
  peTtm: number | null;
  peFwd: number | null;
  pb: number | null;
  peg: number;
  oneYearPeChange: number;
  pePercentile10y: number;
  status: 'Low' | 'Neutral' | 'High';
}

export async function fetchValuations(tickers: string[]): Promise<CompanyValuation[]> {
  if (tickers.length === 0) return [];

  try {
    const tickersParam = tickers.join(',');
    const url = `${API_BASE}/api/valuation?tickers=${encodeURIComponent(tickersParam)}`;
    console.log('[fetchValuations] 请求URL:', url);
    const resp = await fetch(url);
    console.log('[fetchValuations] 响应状态:', resp.status, resp.statusText);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    console.log('[fetchValuations] 返回数据条数:', data.companies?.length);
    const companies: YahooValuation[] = data.companies || [];

    if (companies.length === 0) {
      console.warn('[fetchValuations] 无数据');
      return [];
    }

    const nameZhMap = COMPANY_NAME_ZH;

    // Merge: use Yahoo data, keep nameZh from TOP_COMPANIES
    return companies.map(yc => ({
      id: yc.id,
      name: yc.name || yc.ticker,
      nameZh: nameZhMap[yc.ticker] || yc.name || yc.ticker,
      ticker: yc.ticker,
      type: yc.type,
      marketCap: yc.marketCap,
      price: yc.price ?? null,
      peTtm: yc.peTtm ?? null,
      peFwd: yc.peFwd ?? null,
      pb: yc.pb ?? null,
      peg: yc.peg ?? null,
      oneYearPeChange: yc.oneYearPeChange ?? null,
      pePercentile10y: yc.pePercentile10y ?? null,
      status: yc.status || 'Neutral',
    })) as CompanyValuation[];
  } catch (err) {
    console.error('[fetchValuations] 失败:', err);
    return [];
  }
}

interface YahooIndexValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'Core' | 'Sector';
  peTtm: number | null;
  peFwd: number | null;
  pb: number | null;
  oneYearPeChange: number;
  pePercentile: number;
  dataRange: string;
  status: 'Low' | 'Neutral' | 'High';
  price?: number;
}

export async function fetchIndexValuations(): Promise<IndexValuation[]> {
  try {
    const url = `${API_BASE}/api/index-valuations`;
    console.log('[fetchIndexValuations] 请求URL:', url);
    const resp = await fetch(url);
    console.log('[fetchIndexValuations] 响应状态:', resp.status, resp.statusText);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    console.log('[fetchIndexValuations] 返回数据条数:', data.indices?.length);
    const indices: YahooIndexValuation[] = data.indices || [];

    if (indices.length === 0) {
      console.warn('[fetchIndexValuations] 无数据');
      return [];
    }

    const nameZhMap = INDEX_NAME_ZH;
    const tickerMap = INDEX_NAME_EN;

    return indices.map(yi => ({
      id: yi.id,
      name: tickerMap[yi.ticker] || yi.name || yi.ticker,
      nameZh: nameZhMap[yi.ticker] || yi.name || yi.ticker,
      ticker: yi.ticker,
      type: yi.type || 'Core',
      peTtm: yi.peTtm ?? null,
      peFwd: yi.peFwd ?? null,
      pb: yi.pb ?? null,
      oneYearPeChange: yi.oneYearPeChange ?? null,
      pePercentile: yi.pePercentile ?? null,
      dataRange: yi.dataRange || '',
      status: yi.status || 'Neutral',
      price: yi.price ?? null,
    })) as IndexValuation[];
  } catch (err) {
    console.error('[fetchIndexValuations] 失败:', err);
    return [];
  }
}


// DEBUG: expose to window for testing
(window as any).debugFetchValuations = fetchValuations;
