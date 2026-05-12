import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';
import {
  loadDailyQuoteCache,
  loadHistoricalCache,
} from '../server/services/cacheService';
import {
  buildMetadata,
  createFallbackCompanyValuation,
  mapCachedCompanyToValuation,
  mapCachedIndexToValuation,
  mapHistoricalPayload,
} from '../server/mappers/valuationMappers';

// --- PE Percentile Computation (from marketDataService, no heavy deps) ---

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

const BASE_DIR = process.cwd();

function handleValuation(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const tickersParam = url.searchParams.get('tickers');
  if (!tickersParam) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing tickers parameter' }));
    return;
  }

  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  const cacheData = loadDailyQuoteCache(BASE_DIR);
  const cacheMap = new Map<string, any>();
  for (const company of cacheData.companies || []) {
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

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile', 'marketCap'],
        companies,
      ),
      companies,
    }),
  );
}

function handleIndexValuations(_req: IncomingMessage, res: ServerResponse) {
  const cacheData = loadDailyQuoteCache(BASE_DIR);
  const indices = (cacheData.indices || []).map((idx: any) => {
    const peResult = computeIndexPePercentile(idx.peTtm);
    return {
      ...mapCachedIndexToValuation(idx),
      pePercentile: peResult.percentile,
      status: peResult.status,
    };
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      metadata: buildMetadata(
        cacheData.timestamp,
        ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile'],
        indices,
      ),
      indices,
    }),
  );
}

function handleQuotes(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const symbols = url.searchParams.get('symbols');
  if (!symbols) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing symbols parameter' }));
    return;
  }

  const cacheData = loadDailyQuoteCache(BASE_DIR);
  const cacheMap = new Map<string, any>();
  for (const company of cacheData.companies || []) cacheMap.set(company.ticker, company);
  for (const index of cacheData.indices || []) cacheMap.set(index.ticker, index);

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

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ quoteResponse: { result: results } }));
}

function handleFundamentals(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const symbol = url.searchParams.get('symbol');
  if (!symbol) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
    return;
  }

  const cacheData = loadDailyQuoteCache(BASE_DIR);
  const ticker = symbol.trim().toUpperCase();
  const cached =
    (cacheData.companies || []).find((c: any) => c.ticker === ticker) ||
    (cacheData.indices || []).find((i: any) => i.ticker === ticker);

  if (!cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ quoteSummary: { result: [{}] } }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      quoteSummary: {
        result: [
          {
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
          },
        ],
      },
    }),
  );
}

function handleHistorical(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  const symbol = url.searchParams.get('symbol');
  if (!symbol) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
    return;
  }

  const cacheData = loadHistoricalCache(BASE_DIR);
  const ticker = symbol.toUpperCase();
  const tickerData = cacheData.data?.[ticker] || {
    history: [],
    splits: [],
    shares: null,
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(mapHistoricalPayload(tickerData, cacheData.timestamp)));
}

// --- Main Handler ---

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlPath = req.url || '';

  try {
    if (urlPath.startsWith('/api/valuation')) return handleValuation(req, res);
    if (urlPath.startsWith('/api/index-valuations')) return handleIndexValuations(req, res);
    if (urlPath.startsWith('/api/quotes')) return handleQuotes(req, res);
    if (urlPath.startsWith('/api/fundamentals')) return handleFundamentals(req, res);
    if (urlPath.startsWith('/api/historical')) return handleHistorical(req, res);

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
  } catch (error: any) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
  }
}
