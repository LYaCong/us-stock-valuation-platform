import YahooFinance from 'yahoo-finance2';
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
  yahooFinance: InstanceType<typeof YahooFinance>;
}

export function createMarketDataService({ baseDir, yahooFinance }: MarketDataServiceDeps) {
  /**
   * 根据当前PE估算估值百分位和状态
   * 使用基于S&P 500历史分布的经验阈值：
   * - 大盘股长期PE中位数约18-20
   * - 低于15通常被视为低估
   * - 高于25通常被视为高估
   */
  function computePePercentile(_ticker: string, currentPe: number | null, _currentPrice: number | null): { percentile: number | null; status: 'Low' | 'Neutral' | 'High' } {
    if (!currentPe || currentPe <= 0) {
      return { percentile: null, status: 'Neutral' };
    }

    // 基于绝对PE阈值的估值判断（适用于大多数美股大盘股）
    // PE < 12: 极度低估 → 10th percentile
    // PE 12-15: 低估 → 25th percentile
    // PE 15-20: 合理 → 45th percentile
    // PE 20-25: 偏高 → 65th percentile
    // PE 25-30: 高估 → 80th percentile
    // PE 30-40: 显著高估 → 90th percentile
    // PE > 40: 极度高估 → 95th+ percentile
    let percentile: number;
    let status: 'Low' | 'Neutral' | 'High';

    if (currentPe < 12) {
      percentile = Math.round(10 + (currentPe / 12) * 15);
      status = 'Low';
    } else if (currentPe < 15) {
      percentile = Math.round(25 + ((currentPe - 12) / 3) * 10);
      status = 'Low';
    } else if (currentPe < 20) {
      percentile = Math.round(35 + ((currentPe - 15) / 5) * 15);
      status = 'Neutral';
    } else if (currentPe < 25) {
      percentile = Math.round(50 + ((currentPe - 20) / 5) * 20);
      status = 'Neutral';
    } else if (currentPe < 30) {
      percentile = Math.round(70 + ((currentPe - 25) / 5) * 10);
      status = 'High';
    } else if (currentPe < 40) {
      percentile = Math.round(80 + ((currentPe - 30) / 10) * 10);
      status = 'High';
    } else {
      percentile = Math.min(99, Math.round(90 + ((currentPe - 40) / 20) * 9));
      status = 'High';
    }

    return { percentile, status };
  }

  async function getValuations(tickers: string[]) {
    const cacheData = loadDailyQuoteCache(baseDir);
    const cacheMap = new Map<string, any>();

    for (const company of cacheData.companies || []) {
      cacheMap.set(company.ticker, company);
    }

    const companies = tickers.map((ticker) => {
      const cached = cacheMap.get(ticker);
      if (!cached) return createFallbackCompanyValuation(ticker);

      // 计算PE百分位
      const peResult = computePePercentile(ticker, cached.peTtm, cached.price);

      return {
        ...mapCachedCompanyToValuation(cached),
        pePercentile10y: peResult.percentile,
        status: peResult.status,
      };
    });

    return {
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile', 'marketCap'],
        companies,
      ),
      companies,
    };
  }

  /**
   * 根据当前PE估算指数估值百分位和状态
   * 指数/ETF的PE阈值比个股更宽：
   * - 指数PE < 14: 低估
   * - 指数PE 14-22: 合理
   * - 指数PE > 22: 高估
   */
  function computeIndexPePercentile(_ticker: string, currentPe: number | null, _currentPrice: number | null): { percentile: number | null; status: 'Low' | 'Neutral' | 'High' } {
    if (!currentPe || currentPe <= 0) {
      return { percentile: null, status: 'Neutral' };
    }

    let percentile: number;
    let status: 'Low' | 'Neutral' | 'High';

    if (currentPe < 14) {
      percentile = Math.round(10 + (currentPe / 14) * 20);
      status = 'Low';
    } else if (currentPe < 18) {
      percentile = Math.round(30 + ((currentPe - 14) / 4) * 20);
      status = 'Neutral';
    } else if (currentPe < 22) {
      percentile = Math.round(50 + ((currentPe - 18) / 4) * 15);
      status = 'Neutral';
    } else if (currentPe < 28) {
      percentile = Math.round(65 + ((currentPe - 22) / 6) * 15);
      status = 'High';
    } else if (currentPe < 35) {
      percentile = Math.round(80 + ((currentPe - 28) / 7) * 10);
      status = 'High';
    } else {
      percentile = Math.min(99, Math.round(90 + ((currentPe - 35) / 15) * 9));
      status = 'High';
    }

    return { percentile, status };
  }

  async function getIndexValuations() {
    const cacheData = loadDailyQuoteCache(baseDir);
    const indices = (cacheData.indices || []).map((idx: any) => {
      const peResult = computeIndexPePercentile(idx.ticker, idx.peTtm, idx.price);
      return {
        ...mapCachedIndexToValuation(idx),
        pePercentile: peResult.percentile,
        status: peResult.status,
      };
    });

    return {
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile'],
        indices,
      ),
      indices,
    };
  }

  async function getQuotes(symbols: string[]) {
    // 从缓存读取，避免Yahoo Finance API限速(429)
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
    // 从缓存读取，避免Yahoo Finance API限速(429)
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
