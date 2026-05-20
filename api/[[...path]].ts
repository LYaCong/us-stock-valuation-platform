import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read JSON data at module load time
const dailyQuotes = JSON.parse(fs.readFileSync(path.join(__dirname, '_data', 'daily_quotes.json'), 'utf-8'));
const historicalCache = JSON.parse(fs.readFileSync(path.join(__dirname, '_data', 'historical.json'), 'utf-8'));

// --- Helpers ---

function buildMetadata(timestamp: string | undefined, fields: string[], items: any[]) {
  return {
    lastUpdated: timestamp || new Date().toISOString(),
    availableFields: fields,
    coverage: items.length > 0 ? items.filter((i: any) => i.peTtm != null).length / items.length : 0,
  };
}

function fallback(ticker: string) {
  return { id: ticker.toLowerCase(), name: ticker, nameZh: ticker, ticker, type: ticker.includes('.') ? 'ADR' : 'US', marketCap: 'N/A', price: null, peTtm: null, peFwd: null, pb: null, peg: null, roe: null, pePercentile10y: null, pe10yMin: null, pe10yMax: null, pe10yMedian: null, pePercentile5y: null, pePercentileAllHistory: null, priceChange10y: null, status: 'Neutral' as const };
}

function formatMarketCapValue(marketCap: number | null | undefined) {
  if (marketCap == null || marketCap <= 0) return 'N/A';
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${marketCap.toFixed(0)}`;
}

function mapCompany(c: any) {
  return { id: c.ticker.toLowerCase(), name: c.name||c.ticker, nameZh: c.name||c.ticker, ticker: c.ticker, type: c.ticker.includes('.')?'ADR':'US', marketCap: c.marketCapStr||formatMarketCapValue(c.marketCap), price: c.price??null, peTtm: c.peTtm??null, peFwd: c.peFwd??null, pb: c.pb??null, peg: c.peg??null, roe: c.roe??null, pePercentile10y: c.pePercentile??null, pe10yMin: c.pe10yMin??null, pe10yMax: c.pe10yMax??null, pe10yMedian: c.pe10yMedian??null, pePercentile5y: c.pePercentile5y??null, pePercentileAllHistory: c.pePercentileAllHistory??null, priceChange10y: c.priceChange10y??null, status: c.status||'Neutral' };
}

function mapIndex(c: any) {
  return { id: c.id||c.ticker.toLowerCase(), name: c.name||c.ticker, nameZh: c.nameZh||c.name||c.ticker, ticker: c.ticker, type: c.type||'Core', peTtm: c.peTtm??null, peFwd: c.peFwd??null, pb: c.pb??null, roe: c.roe??null, pePercentile: c.pePercentile??null, dataRange: c.dataRange||'', status: c.status||'Neutral', price: c.price??null, dividendYield: c.dividendYield??null, expenseRatio: c.expenseRatio??null, assetsUnderManagement: c.assetsUnderManagement??null, eodhdUpdatedAt: c.eodhdUpdatedAt??null };
}

function send(res: ServerResponse, data: any, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function qp(req: IncomingMessage) {
  return new URL(req.url || '/', `https://${req.headers.host}`).searchParams;
}

// --- Routes ---

function handleValuation(req: IncomingMessage, res: ServerResponse) {
  const tp = qp(req).get('tickers');
  if (!tp) return send(res, { error: 'Missing tickers' }, 400);
  const tickers = tp.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean);
  const m = new Map<string, any>();
  for (const c of dailyQuotes.companies || []) m.set(c.ticker, c);
  const companies = tickers.map(t => {
    const c = m.get(t);
    if (!c) return fallback(t);
    return mapCompany(c);
  });
  send(res, { metadata: buildMetadata(dailyQuotes.timestamp, ['price','peTtm','peFwd','pb','pePercentile','pe10yMin','pe10yMax','pe10yMedian','pePercentile5y','pePercentileAllHistory','priceChange10y','marketCap'], companies), companies });
}

function handleIndexValuations(_req: IncomingMessage, res: ServerResponse) {
  const indices = (dailyQuotes.indices || []).map((i: any) => mapIndex(i));
  send(res, { metadata: buildMetadata(dailyQuotes.timestamp, ['price','peTtm','peFwd','pb','dividendYield','expenseRatio','assetsUnderManagement','pePercentile'], indices), indices });
}

function handleQuotes(req: IncomingMessage, res: ServerResponse) {
  const syms = qp(req).get('symbols');
  if (!syms) return send(res, { error: 'Missing symbols' }, 400);
  const m = new Map<string, any>();
  for (const c of dailyQuotes.companies || []) m.set(c.ticker, c);
  for (const i of dailyQuotes.indices || []) m.set(i.ticker, i);
  const results = syms.split(',').map((s: string) => {
    const t = s.trim().toUpperCase(), c = m.get(t);
    return c ? { symbol: t, shortName: c.name||t, regularMarketPrice: c.price||null, marketCap: c.marketCap||null, trailingPE: c.peTtm||null, forwardPE: c.peFwd||null, priceToBook: c.pb||null, regularMarketChangePercent: null, regularMarketVolume: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null } : { symbol: t, shortName: t };
  });
  send(res, { quoteResponse: { result: results } });
}

function handleFundamentals(req: IncomingMessage, res: ServerResponse) {
  const sym = qp(req).get('symbol');
  if (!sym) return send(res, { error: 'Missing symbol' }, 400);
  const t = sym.trim().toUpperCase();
  const c = (dailyQuotes.companies||[]).find((x:any)=>x.ticker===t) || (dailyQuotes.indices||[]).find((x:any)=>x.ticker===t);
  if (!c) return send(res, { quoteSummary: { result: [{}] } });
  send(res, { quoteSummary: { result: [{ price: { regularMarketPrice: c.price||null, marketCap: c.marketCap||null, shortName: c.name||t }, defaultKeyStatistics: { trailingPE:{raw:c.peTtm}, forwardPE:{raw:c.peFwd}, priceToBook:{raw:c.pb}, pegRatio:{raw:c.peg||null} }, summaryDetail: { trailingPE:{raw:c.peTtm}, forwardPE:{raw:c.peFwd}, priceToBook:{raw:c.pb} } }] } });
}

function handleHistorical(req: IncomingMessage, res: ServerResponse) {
  const sym = qp(req).get('symbol');
  if (!sym) return send(res, { error: 'Missing symbol' }, 400);
  const t = sym.toUpperCase(), d = historicalCache.data?.[t] || { history:[], splits:[], shares:null };
  const h = d.history || [], f = new Set<string>();
  if (h.length > 0) Object.keys(h[0]).forEach(k => f.add(k));
  send(res, { metadata: { lastUpdated: historicalCache.timestamp || new Date().toISOString(), availableFields: Array.from(f) }, history: h, splits: d.splits || [], shares: d.shares || null });
}

// --- Entry ---

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const p = (req.url || '').split('?')[0];
  try {
    if (p.startsWith('/api/valuation'))        return handleValuation(req, res);
    if (p.startsWith('/api/index-valuations')) return handleIndexValuations(req, res);
    if (p.startsWith('/api/quotes'))           return handleQuotes(req, res);
    if (p.startsWith('/api/fundamentals'))     return handleFundamentals(req, res);
    if (p.startsWith('/api/historical'))       return handleHistorical(req, res);
    send(res, { error: 'Not found' }, 404);
  } catch (e: any) {
    console.error('API Error:', e);
    send(res, { error: 'Internal server error', details: e.message }, 500);
  }
}
