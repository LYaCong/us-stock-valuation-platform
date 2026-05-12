import type { IncomingMessage, ServerResponse } from 'http';
import dailyQuotesData from '../stock_cache/daily_quotes.json';
import historicalData from '../stock_cache/historical.json';

const dailyQuotes: any = dailyQuotesData;
const historicalCache: any = historicalData;

// --- Inlined helpers (from server/mappers/valuationMappers.ts) ---

interface CoverageItem { peTtm?: number | null; }

function buildMetadata(timestamp: string | undefined, availableFields: string[], items: CoverageItem[]) {
  return {
    lastUpdated: timestamp || new Date().toISOString(),
    availableFields,
    coverage: items.length > 0 ? items.filter((item) => item.peTtm != null).length / items.length : 0,
  };
}

function createFallbackCompanyValuation(ticker: string) {
  return {
    id: ticker.toLowerCase(), name: ticker, nameZh: ticker, ticker,
    type: ticker.includes('.') ? 'ADR' : 'US', marketCap: 'N/A',
    price: null, peTtm: null, peFwd: null, pb: null, peg: null, roe: null,
    pePercentile10y: null, status: 'Neutral' as const,
  };
}

function mapCachedCompanyToValuation(cached: any) {
  return {
    id: cached.ticker.toLowerCase(), name: cached.name || cached.ticker,
    nameZh: cached.name || cached.ticker, ticker: cached.ticker,
    type: cached.ticker.includes('.') ? 'ADR' : 'US',
    marketCap: cached.marketCapStr || 'N/A',
    price: cached.price ?? null, peTtm: cached.peTtm ?? null,
    peFwd: cached.peFwd ?? null, pb: cached.pb ?? null,
    peg: cached.peg ?? null, roe: cached.roe ?? null,
    pePercentile10y: cached.pePercentile ?? null, status: cached.status || 'Neutral',
  };
}

function mapCachedIndexToValuation(cached: any) {
  return {
    id: cached.id || cached.ticker.toLowerCase(), name: cached.name || cached.ticker,
    nameZh: cached.nameZh || cached.name || cached.ticker, ticker: cached.ticker,
    type: cached.type || 'Core', peTtm: cached.peTtm ?? null,
    peFwd: cached.peFwd ?? null, pb: cached.pb ?? null,
    roe: cached.roe ?? null, pePercentile: cached.pePercentile ?? null,
    dataRange: cached.dataRange || '', status: cached.status || 'Neutral',
    price: cached.price ?? null,
  };
}

function mapHistoricalPayload(tickerData: any, timestamp?: string) {
  const history = tickerData.history || [];
  const fields = new Set<string>();
  if (history.length > 0) Object.keys(history[0]).forEach((key) => fields.add(key));
  return {
    metadata: { lastUpdated: timestamp || new Date().toISOString(), availableFields: Array.from(fields) },
    history, splits: tickerData.splits || [], shares: tickerData.shares || null,
  };
}

// --- PE Percentile ---

function computePePercentile(currentPe: number | null) {
  if (!currentPe || currentPe <= 0) return { percentile: null, status: 'Neutral' as const };
  let p: number, s: 'Low' | 'Neutral' | 'High';
  if (currentPe < 12)       { p = Math.round(10 + (currentPe / 12) * 15); s = 'Low'; }
  else if (currentPe < 15)  { p = Math.round(25 + ((currentPe - 12) / 3) * 10); s = 'Low'; }
  else if (currentPe < 20)  { p = Math.round(35 + ((currentPe - 15) / 5) * 15); s = 'Neutral'; }
  else if (currentPe < 25)  { p = Math.round(50 + ((currentPe - 20) / 5) * 20); s = 'Neutral'; }
  else if (currentPe < 30)  { p = Math.round(70 + ((currentPe - 25) / 5) * 10); s = 'High'; }
  else if (currentPe < 40)  { p = Math.round(80 + ((currentPe - 30) / 10) * 10); s = 'High'; }
  else                      { p = Math.min(99, Math.round(90 + ((currentPe - 40) / 20) * 9)); s = 'High'; }
  return { percentile: p, status: s };
}

function computeIndexPePercentile(currentPe: number | null) {
  if (!currentPe || currentPe <= 0) return { percentile: null, status: 'Neutral' as const };
  let p: number, s: 'Low' | 'Neutral' | 'High';
  if (currentPe < 14)       { p = Math.round(10 + (currentPe / 14) * 20); s = 'Low'; }
  else if (currentPe < 18)  { p = Math.round(30 + ((currentPe - 14) / 4) * 20); s = 'Neutral'; }
  else if (currentPe < 22)  { p = Math.round(50 + ((currentPe - 18) / 4) * 15); s = 'Neutral'; }
  else if (currentPe < 28)  { p = Math.round(65 + ((currentPe - 22) / 6) * 15); s = 'High'; }
  else if (currentPe < 35)  { p = Math.round(80 + ((currentPe - 28) / 7) * 10); s = 'High'; }
  else                      { p = Math.min(99, Math.round(90 + ((currentPe - 35) / 15) * 9)); s = 'High'; }
  return { percentile: p, status: s };
}

// --- Helpers ---

function send(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseQuery(req: IncomingMessage) {
  return new URL(req.url || '/', `https://${req.headers.host}`).searchParams;
}

// --- Routes ---

function handleValuation(req: IncomingMessage, res: ServerResponse) {
  const tickersParam = parseQuery(req).get('tickers');
  if (!tickersParam) return send(res, { error: 'Missing tickers parameter' }, 400);

  const tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  const cacheMap = new Map<string, any>();
  for (const c of dailyQuotes.companies || []) cacheMap.set(c.ticker, c);

  const companies = tickers.map((ticker) => {
    const cached = cacheMap.get(ticker);
    if (!cached) return createFallbackCompanyValuation(ticker);
    const pe = computePePercentile(cached.peTtm);
    return { ...mapCachedCompanyToValuation(cached), pePercentile10y: pe.percentile, status: pe.status };
  });

  send(res, {
    metadata: buildMetadata(dailyQuotes.timestamp, ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile', 'marketCap'], companies),
    companies,
  });
}

function handleIndexValuations(_req: IncomingMessage, res: ServerResponse) {
  const indices = (dailyQuotes.indices || []).map((idx: any) => {
    const pe = computeIndexPePercentile(idx.peTtm);
    return { ...mapCachedIndexToValuation(idx), pePercentile: pe.percentile, status: pe.status };
  });
  send(res, {
    metadata: buildMetadata(dailyQuotes.timestamp, ['price', 'peTtm', 'peFwd', 'pb', 'pePercentile'], indices),
    indices,
  });
}

function handleQuotes(req: IncomingMessage, res: ServerResponse) {
  const symbols = parseQuery(req).get('symbols');
  if (!symbols) return send(res, { error: 'Missing symbols parameter' }, 400);

  const cacheMap = new Map<string, any>();
  for (const c of dailyQuotes.companies || []) cacheMap.set(c.ticker, c);
  for (const i of dailyQuotes.indices || []) cacheMap.set(i.ticker, i);

  const results = symbols.split(',').map((sym: string) => {
    const t = sym.trim().toUpperCase();
    const c = cacheMap.get(t);
    if (c) return { symbol: t, shortName: c.name || t, regularMarketPrice: c.price || null, marketCap: c.marketCap || null, trailingPE: c.peTtm || null, forwardPE: c.peFwd || null, priceToBook: c.pb || null, regularMarketChangePercent: null, regularMarketVolume: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null };
    return { symbol: t, shortName: t };
  });
  send(res, { quoteResponse: { result: results } });
}

function handleFundamentals(req: IncomingMessage, res: ServerResponse) {
  const symbol = parseQuery(req).get('symbol');
  if (!symbol) return send(res, { error: 'Missing symbol parameter' }, 400);
  const t = symbol.trim().toUpperCase();
  const c = (dailyQuotes.companies || []).find((x: any) => x.ticker === t) ||
            (dailyQuotes.indices || []).find((x: any) => x.ticker === t);
  if (!c) return send(res, { quoteSummary: { result: [{}] } });
  send(res, { quoteSummary: { result: [{
    price: { regularMarketPrice: c.price || null, marketCap: c.marketCap || null, shortName: c.name || t },
    defaultKeyStatistics: { trailingPE: { raw: c.peTtm }, forwardPE: { raw: c.peFwd }, priceToBook: { raw: c.pb }, pegRatio: { raw: c.peg || null } },
    summaryDetail: { trailingPE: { raw: c.peTtm }, forwardPE: { raw: c.peFwd }, priceToBook: { raw: c.pb } },
  }] } });
}

function handleHistorical(req: IncomingMessage, res: ServerResponse) {
  const symbol = parseQuery(req).get('symbol');
  if (!symbol) return send(res, { error: 'Missing symbol parameter' }, 400);
  const t = symbol.toUpperCase();
  const d = historicalCache.data?.[t] || { history: [], splits: [], shares: null };
  send(res, mapHistoricalPayload(d, historicalCache.timestamp));
}

// --- Entry ---

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlPath = (req.url || '').split('?')[0];
  try {
    if (urlPath.startsWith('/api/valuation'))        return handleValuation(req, res);
    if (urlPath.startsWith('/api/index-valuations'))  return handleIndexValuations(req, res);
    if (urlPath.startsWith('/api/quotes'))            return handleQuotes(req, res);
    if (urlPath.startsWith('/api/fundamentals'))      return handleFundamentals(req, res);
    if (urlPath.startsWith('/api/historical'))         return handleHistorical(req, res);
    send(res, { error: 'API endpoint not found' }, 404);
  } catch (error: any) {
    console.error('API Error:', error);
    send(res, { error: 'Internal server error', details: error.message }, 500);
  }
}
