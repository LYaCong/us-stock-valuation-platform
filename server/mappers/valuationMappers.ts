import type { HistoricalTickerData } from '../services/cacheService.ts';

interface CoverageItem {
  peTtm?: number | null;
}

export function buildMetadata(
  timestamp: string | undefined,
  availableFields: string[],
  items: CoverageItem[],
) {
  return {
    lastUpdated: timestamp || new Date().toISOString(),
    availableFields,
    coverage: items.length > 0 ? items.filter((item) => item.peTtm != null).length / items.length : 0,
  };
}

export function createFallbackCompanyValuation(ticker: string) {
  return {
    id: ticker.toLowerCase(),
    name: ticker,
    nameZh: ticker,
    ticker,
    type: ticker.includes('.') ? 'ADR' : 'US',
    marketCap: 'N/A',
    price: null,
    peTtm: null,
    peFwd: null,
    pb: null,
    peg: null,
    oneYearPeChange: null,
    pePercentile10y: null,
    status: 'Neutral' as const,
  };
}

export function mapCachedCompanyToValuation(cached: any) {
  return {
    id: cached.ticker.toLowerCase(),
    name: cached.name || cached.ticker,
    nameZh: cached.name || cached.ticker,
    ticker: cached.ticker,
    type: cached.ticker.includes('.') ? 'ADR' : 'US',
    marketCap: cached.marketCapStr || 'N/A',
    price: cached.price ?? null,
    peTtm: cached.peTtm ?? null,
    peFwd: cached.peFwd ?? null,
    pb: cached.pb ?? null,
    peg: cached.peg ?? null,
    oneYearPeChange: cached.oneYearPeChange ?? null,
    pePercentile10y: cached.pePercentile ?? null,
    status: cached.status || 'Neutral',
  };
}

export function mapCachedIndexToValuation(cached: any) {
  return {
    id: cached.id || cached.ticker.toLowerCase(),
    name: cached.name || cached.ticker,
    nameZh: cached.nameZh || cached.name || cached.ticker,
    ticker: cached.ticker,
    type: cached.type || 'Core',
    peTtm: cached.peTtm ?? null,
    peFwd: cached.peFwd ?? null,
    pb: cached.pb ?? null,
    oneYearPeChange: cached.oneYearPeChange ?? null,
    pePercentile: cached.pePercentile ?? null,
    dataRange: cached.dataRange || '',
    status: cached.status || 'Neutral',
    price: cached.price ?? null,
  };
}

export function mapHistoricalPayload(tickerData: HistoricalTickerData, timestamp?: string) {
  const history = tickerData.history || [];
  const fields = new Set<string>();
  if (history.length > 0) {
    Object.keys(history[0]).forEach((key) => fields.add(key));
  }

  return {
    metadata: {
      lastUpdated: timestamp || new Date().toISOString(),
      availableFields: Array.from(fields),
    },
    history,
    splits: tickerData.splits || [],
    shares: tickerData.shares || null,
  };
}
