import { CompanyValuation, IndexValuation } from '../data/mockData';
import { TOP_COMPANIES, INDICES } from '../data/mockData';

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
  if (tickers.length === 0) return TOP_COMPANIES;

  try {
    const tickersParam = tickers.join(',');
    const resp = await fetch(`${API_BASE}/api/valuation?tickers=${encodeURIComponent(tickersParam)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const companies: YahooValuation[] = data.companies || [];

    if (companies.length === 0) return TOP_COMPANIES;

    // Build nameZh lookup from TOP_COMPANIES
    const nameZhMap: Record<string, string> = {};
    TOP_COMPANIES.forEach(c => { nameZhMap[c.ticker] = c.nameZh || c.name; });

    // Merge: use Yahoo data, keep nameZh from TOP_COMPANIES
    return companies.map(yc => ({
      id: yc.id,
      name: yc.name || yc.ticker,
      nameZh: nameZhMap[yc.ticker] || yc.name || yc.ticker,
      ticker: yc.ticker,
      type: yc.type,
      marketCap: yc.marketCap,
      price: yc.price ?? 0,
      peTtm: yc.peTtm ?? 0,
      peFwd: yc.peFwd ?? 0,
      pb: yc.pb ?? 0,
      peg: yc.peg ?? 0,
      oneYearPeChange: yc.oneYearPeChange ?? 0,
      pePercentile10y: yc.pePercentile10y ?? 50,
      status: yc.status || 'Neutral',
    })) as CompanyValuation[];
  } catch (err) {
    console.error('fetchValuations failed, falling back to mock:', err);
    return TOP_COMPANIES;
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
    const resp = await fetch(`${API_BASE}/api/index-valuations`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const indices: YahooIndexValuation[] = data.indices || [];

    if (indices.length === 0) return INDICES;

    // Build nameZh lookup from INDICES
    const nameZhMap: Record<string, string> = {};
    const tickerMap: Record<string, string> = {};
    INDICES.forEach(idx => {
      nameZhMap[idx.ticker] = idx.nameZh || idx.name;
      tickerMap[idx.ticker] = idx.name;
    });

    return indices.map(yi => ({
      id: yi.id,
      name: tickerMap[yi.ticker] || yi.name || yi.ticker,
      nameZh: nameZhMap[yi.ticker] || yi.name || yi.ticker,
      ticker: yi.ticker,
      type: yi.type || 'Core',
      peTtm: yi.peTtm ?? 0,
      peFwd: yi.peFwd ?? 0,
      pb: yi.pb ?? 0,
      oneYearPeChange: yi.oneYearPeChange ?? 0,
      pePercentile: yi.pePercentile ?? 50,
      dataRange: yi.dataRange || '',
      status: yi.status || 'Neutral',
      price: yi.price ?? 0,
    })) as IndexValuation[];
  } catch (err) {
    console.error('fetchIndexValuations failed, falling back to mock:', err);
    return INDICES;
  }
}

