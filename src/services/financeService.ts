import { type ApiMetadata, type HistoricalDataPoint } from '../types';

export interface HistoricalResponse {
  history: HistoricalDataPoint[];
  splits: any[];
  metadata: ApiMetadata;
}

export interface DcfAssumption {
  growth1to5: number;
  growth6to10: number;
  wacc: number;
  terminalGrowth: number;
  updatedAt?: string;
  note?: string;
  storage?: 'project' | 'browser';
}

const LOCAL_DCF_ASSUMPTIONS_KEY = 'us-stock-valuation-platform:dcf-assumptions';

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getBrowserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (error) {
    console.warn('Browser storage is unavailable:', error);
    return null;
  }
}

function readLocalDcfAssumptions(): Record<string, DcfAssumption> {
  const storage = getBrowserStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(LOCAL_DCF_ASSUMPTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Unable to read local DCF assumptions:', error);
    return {};
  }
}

function getLocalDcfAssumption(symbol: string): DcfAssumption | null {
  const assumption = readLocalDcfAssumptions()[normalizeSymbol(symbol)];
  return assumption ? { ...assumption, storage: 'browser' } : null;
}

function saveLocalDcfAssumption(symbol: string, assumptions: DcfAssumption): DcfAssumption | null {
  const storage = getBrowserStorage();
  if (!storage) return null;
  try {
    const saved: DcfAssumption = {
      ...assumptions,
      updatedAt: new Date().toISOString(),
      storage: 'browser',
    };
    const existing = readLocalDcfAssumptions();
    existing[normalizeSymbol(symbol)] = saved;
    storage.setItem(LOCAL_DCF_ASSUMPTIONS_KEY, JSON.stringify(existing));
    return saved;
  } catch (error) {
    console.error('Unable to save local DCF assumptions:', error);
    return null;
  }
}

export async function fetchQuotes(symbols: string[]): Promise<any[]> {
  if (symbols.length === 0) return [];
  try {
    const response = await fetch(`/api/quotes?symbols=${symbols.join(',')}`);
    if (!response.ok) throw new Error('Failed to fetch quotes');
    const data = await response.json();
    return data.quoteResponse?.result || [];
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function fetchFundamentals(symbol: string): Promise<any> {
  try {
    const response = await fetch(`/api/fundamentals?symbol=${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch fundamentals');
    const data = await response.json();
    const result = data.quoteSummary?.result?.[0] || null;
    const localAssumption = getLocalDcfAssumption(symbol);
    if (result && localAssumption) {
      result.dcfAssumptions = {
        ...(result.dcfAssumptions || {}),
        company: localAssumption,
      };
    }
    return result;
  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    return null;
  }
}

export async function saveDcfAssumptions(
  symbol: string,
  assumptions: DcfAssumption,
): Promise<DcfAssumption | null> {
  try {
    const response = await fetch('/api/dcf-assumptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, ...assumptions }),
    });
    if (!response.ok) throw new Error('Failed to save DCF assumptions');
    const data = await response.json();
    if (data.assumption) {
      return { ...data.assumption, storage: 'project' };
    }
  } catch (error) {
    console.info('Project-file DCF save unavailable, falling back to browser storage:', error);
  }
  return saveLocalDcfAssumption(symbol, assumptions);
}

export async function fetchHistorical(symbol: string): Promise<HistoricalResponse> {
  try {
    const response = await fetch(`/api/historical?symbol=${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch historical');
    const data = await response.json();
    
    return {
      history: (data.history || []).map((item: any): HistoricalDataPoint => ({
        date: item.date,
        price: item.price ?? null,
        volume: item.volume ?? null,
        marketCap: item.marketCap ?? null,
        peTtm: item.peTtm ?? null,
        percentile: item.percentile ?? null
      })),
      splits: data.splits || [],
      metadata: data.metadata || { availableFields: [] }
    };
  } catch (error) {
    console.error('Error fetching historical:', error);
    return { history: [], splits: [], metadata: { availableFields: [] } };
  }
}

export function formatMarketCap(raw: number): string {
  if (!raw) return 'N/A';
  if (raw >= 1e12) return (raw / 1e12).toFixed(2) + 'T';
  if (raw >= 1e9) return (raw / 1e9).toFixed(2) + 'B';
  if (raw >= 1e6) return (raw / 1e6).toFixed(2) + 'M';
  return raw.toString();
}
