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
    roe: null,
    pePercentile10y: null,
    pe10yMin: null,
    pe10yMax: null,
    pe10yMedian: null,
    pePercentile5y: null,
    pePercentileAllHistory: null,
    priceChange10y: null,
    status: 'Neutral' as const,
  };
}

function formatMarketCapValue(marketCap: number | null | undefined) {
  if (marketCap == null || marketCap <= 0) return 'N/A';
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${marketCap.toFixed(0)}`;
}

export function mapCachedCompanyToValuation(cached: any) {
  return {
    id: cached.ticker.toLowerCase(),
    name: cached.name || cached.ticker,
    nameZh: cached.name || cached.ticker,
    ticker: cached.ticker,
    type: cached.ticker.includes('.') ? 'ADR' : 'US',
    marketCap: cached.marketCapStr || formatMarketCapValue(cached.marketCap),
    price: cached.price ?? null,
    peTtm: cached.peTtm ?? null,
    peFwd: cached.peFwd ?? null,
    pb: cached.pb ?? null,
    peg: cached.peg ?? null,
    roe: cached.roe ?? null,
    pePercentile10y: cached.pePercentile ?? null,
    pe10yMin: cached.pe10yMin ?? null,
    pe10yMax: cached.pe10yMax ?? null,
    pe10yMedian: cached.pe10yMedian ?? null,
    pePercentile5y: cached.pePercentile5y ?? null,
    pePercentileAllHistory: cached.pePercentileAllHistory ?? null,
    priceChange10y: cached.priceChange10y ?? null,
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
    roe: cached.roe ?? null,
    pePercentile: cached.pePercentile ?? null,
    dataRange: cached.dataRange || '',
    status: cached.status || 'Neutral',
    price: cached.price ?? null,
    dividendYield: cached.dividendYield ?? null,
    expenseRatio: cached.expenseRatio ?? null,
    assetsUnderManagement: cached.assetsUnderManagement ?? null,
    eodhdUpdatedAt: cached.eodhdUpdatedAt ?? null,
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
