import {
  buildMetadata,
  createFallbackCompanyValuation,
  mapCachedCompanyToValuation,
  mapCachedIndexToValuation,
  mapHistoricalPayload,
} from '../mappers/valuationMappers';
import { loadDailyQuoteCache, loadHistoricalCache } from './cacheService';

interface MarketDataServiceDeps {
  baseDir: string;
}

export function createMarketDataService({ baseDir }: MarketDataServiceDeps) {

  async function getValuations(tickers: string[]) {
    const cacheData = loadDailyQuoteCache(baseDir);
    const cacheMap = new Map<string, any>();

    for (const company of cacheData.companies || []) {
      cacheMap.set(company.ticker, company);
    }

    const companies = tickers.map((ticker) => {
      const cached = cacheMap.get(ticker);
      if (!cached) return createFallbackCompanyValuation(ticker);

      return mapCachedCompanyToValuation(cached);
    });

    return {
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile', 'pe10yMin', 'pe10yMax', 'pe10yMedian', 'pePercentile5y', 'pePercentileAllHistory', 'priceChange10y', 'marketCap'],
        companies,
      ),
      companies,
    };
  }

  async function getIndexValuations() {
    const cacheData = loadDailyQuoteCache(baseDir);
    const indices = (cacheData.indices || []).map((idx: any) => mapCachedIndexToValuation(idx));

    return {
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'dividendYield', 'expenseRatio', 'assetsUnderManagement', 'pePercentile'],
        indices,
      ),
      indices,
    };
  }

  async function getQuotes(symbols: string[]) {
    // 从缓存读取，避免外部行情 API 限速。
    const cacheData = loadDailyQuoteCache(baseDir);
    const cacheMap = new Map<string, any>();

    for (const company of cacheData.companies || []) {
      cacheMap.set(company.ticker, company);
    }
    for (const index of cacheData.indices || []) {
      cacheMap.set(index.ticker, index);
    }

    const results = symbols.map((symbol) => {
      const ticker = symbol.trim().toUpperCase();
      const cached = cacheMap.get(ticker);
      if (cached) {
        return {
          symbol: ticker,
          shortName: cached.name || ticker,
          regularMarketPrice: cached.price || null,
          marketCap: cached.marketCap || null,
          trailingPE: cached.peTtm || null,
          forwardPE: cached.peFwd || null,
          priceToBook: cached.pb || null,
          regularMarketChangePercent: null,
          regularMarketVolume: null,
          fiftyTwoWeekHigh: null,
          fiftyTwoWeekLow: null,
        };
      }
      return { symbol: ticker, shortName: ticker };
    });

    return { quoteResponse: { result: results } };
  }

  async function getFundamentals(symbol: string) {
    // 从缓存读取，避免外部行情 API 限速。
    const cacheData = loadDailyQuoteCache(baseDir);
    const ticker = symbol.trim().toUpperCase();
    const cached = (cacheData.companies || []).find((c: any) => c.ticker === ticker) ||
                   (cacheData.indices || []).find((i: any) => i.ticker === ticker);

    if (!cached) {
      return { quoteSummary: { result: [{}] } };
    }

    const quoteSummary = {
      price: {
        regularMarketPrice: cached.price || null,
        marketCap: cached.marketCap || null,
        shortName: cached.name || ticker,
      },
      defaultKeyStatistics: {
        trailingPE: { raw: cached.peTtm },
        forwardPE: { raw: cached.peFwd },
        priceToBook: { raw: cached.pb },
        pegRatio: { raw: cached.peg || null },
      },
      summaryDetail: {
        trailingPE: { raw: cached.peTtm },
        forwardPE: { raw: cached.peFwd },
        priceToBook: { raw: cached.pb },
      },
    };

    return { quoteSummary: { result: [quoteSummary] } };
  }

  async function getHistorical(symbol: string) {
    const cacheData = loadHistoricalCache(baseDir);
    const ticker = symbol.toUpperCase();
    const tickerData = cacheData.data?.[ticker] || {
      history: [],
      splits: [],
      shares: null,
    };

    return mapHistoricalPayload(tickerData, cacheData.timestamp);
  }

  return {
    getValuations,
    getIndexValuations,
    getQuotes,
    getFundamentals,
    getHistorical,
  };
}
