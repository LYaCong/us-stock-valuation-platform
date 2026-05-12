import type { IncomingMessage, ServerResponse } from 'http';
import dailyQuotesRaw from '../stock_cache/daily_quotes.json';
import historicalRaw from '../stock_cache/historical.json';
import {
  buildMetadata,
  createFallbackCompanyValuation,
  mapCachedCompanyToValuation,
  mapCachedIndexToValuation,
  mapHistoricalPayload,
} from '../server/mappers/valuationMappers';

// Pre-loaded cache data (bundled at build time)
const dailyQuotes: any = dailyQuotesRaw;
const historicalCache: any = historicalRaw;

// --- PE Percentile Computation ---

function computePePercentile(currentPe: number | null): {
  percentile: number | null;
  status: 'Low' | 'Neutral' | 'High';
} {
  if (!currentPe || currentPe <= 0) return { percentile: null, status: 'Neutral' };

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

function computeIndexPePercentile(currentPe: number | null): {
  percentile: number | null;
  status: 'Low' | 'Neutral' | 'High';
} {
  if (!currentPe || currentPe <= 0) return { percentile: null, status: 'Neutral' };

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

// --- Route Handlers ---

function json(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function handleValuation(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const tickersParam = url.searchParams.get('tickers');
  if (!tickersParam) return json(res, { error: 'Missing tickers parameter' }, 400);

  const tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  const cacheMap = new Map<string, any>();
  for (const company of dailyQuotes.companies || []) {
    cacheMap.set(company.ticker, company);
  }

  const companies = tickers.map((ticker) => {
    const cached = cacheMap.get(ticker);
    if (!cached) return createFallbackCompanyValuation(ticker);
    const peResult = computePePercentile(cached.peTtm);
    return {
      ...mapCachedCompanyToValuation(cached),
      pePercentile10y: peResult.percentile,
      status: peResult.status,
    };
  });

  json(res, {
    metadata: buildMetadata(dailyQuotes.timestamp, ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile', 'marketCap'], companies),
    companies,
  });
}

function handleIndexValuations(_req: IncomingMessage, res: ServerResponse) {
  const indices = (dailyQuotes.indices || []).map((idx: any) => {
    const peResult = computeIndexPePercentile(idx.peTtm);
    return {
      ...mapCachedIndexToValuation(idx),
      pePercentile: peResult.percentile,
      status: peResult.status,
    };
  });

  json(res, {
    metadata: buildMetadata(dailyQuotes.timestamp, ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile'], indices),
    indices,
  });
}

function handleQuotes(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const symbols = url.searchParams.get('symbols');
  if (!symbols) return json(res, { error: 'Missing symbols parameter' }, 400);

  const cacheMap = new Map<string, any>();
  for (const company of dailyQuotes.companies || []) cacheMap.set(company.ticker, company);
  for (const index of dailyQuotes.indices || []) cacheMap.set(index.ticker, index);

  const results = symbols.split(',').map((symbol) => {
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

  json(res, { quoteResponse: { result: results } });
}

function handleFundamentals(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const symbol = url.searchParams.get('symbol');
  if (!symbol) return json(res, { error: 'Missing symbol parameter' }, 400);

  const ticker = symbol.trim().toUpperCase();
  const cached =
    (dailyQuotes.companies || []).find((c: any) => c.ticker === ticker) ||
    (dailyQuotes.indices || []).find((i: any) => i.ticker === ticker);

  if (!cached) return json(res, { quoteSummary: { result: [{}] } });

  json(res, {
    quoteSummary: {
      result: [{
        price: { regularMarketPrice: cached.price || null, marketCap: cached.marketCap || null, shortName: cached.name || ticker },
        defaultKeyStatistics: { trailingPE: { raw: cached.peTtm }, forwardPE: { raw: cached.peFwd }, priceToBook: { raw: cached.pb }, pegRatio: { raw: cached.peg || null } },
        summaryDetail: { trailingPE: { raw: cached.peTtm }, forwardPE: { raw: cached.peFwd }, priceToBook: { raw: cached.pb } },
      }],
    },
  });
}

function handleHistorical(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const symbol = url.searchParams.get('symbol');
  if (!symbol) return json(res, { error: 'Missing symbol parameter' }, 400);

  const ticker = symbol.toUpperCase();
  const tickerData = historicalCache.data?.[ticker] || { history: [], splits: [], shares: null };
  json(res, mapHistoricalPayload(tickerData, historicalCache.timestamp));
}

// --- Main Handler ---

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlPath = (req.url || '').split('?')[0];

  try {
    if (urlPath.startsWith('/api/valuation')) return handleValuation(req, res);
    if (urlPath.startsWith('/api/index-valuations')) return handleIndexValuations(req, res);
    if (urlPath.startsWith('/api/quotes')) return handleQuotes(req, res);
    if (urlPath.startsWith('/api/fundamentals')) return handleFundamentals(req, res);
    if (urlPath.startsWith('/api/historical')) return handleHistorical(req, res);

    json(res, { error: 'API endpoint not found' }, 404);
  } catch (error: any) {
    console.error('API Error:', error);
    json(res, { error: 'Internal server error', details: error.message }, 500);
  }
}
