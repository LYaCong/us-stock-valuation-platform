import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ─── Helper: compute PE percentile from historical monthly data ──────────────
  async function computePePercentile(symbol: string, currentPe: number): Promise<number> {
    try {
      const period1 = new Date();
      period1.setFullYear(period1.getFullYear() - 10);
      const chart = await yahooFinance.chart(symbol, {
        period1,
        interval: '1mo',
      });

      const quotes = chart.quotes;
      if (quotes.length < 12) return 50;

      // Use price percentile as PE percentile proxy
      // (exact PE needs earnings data which is sparse)
      const prices = quotes.map(q => q.close).filter((p): p is number => p != null && p > 0);
      if (prices.length < 12) return 50;

      const sorted = [...prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Simple percentile: what fraction of historical prices are below current
      const currentPrice = prices[prices.length - 1];
      let below = 0;
      for (const p of prices) { if (p <= currentPrice) below++; }
      return Math.round((below / prices.length) * 100);
    } catch {
      return 50; // fallback
    }
  }

  // ─── Batch valuation endpoint ────────────────────────────────────────────────
  // Index tickers (ETF proxies for indices)
  const INDEX_TICKERS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC', 'SOXX', 'KRE', 'IBB', 'XRT', 'VNQ', 'VIG', 'SCHD', 'ARKK', 'KWEB', 'GDX'];

  app.get("/api/valuation", async (req, res) => {
    try {
      const tickersParam = req.query.tickers as string;
      if (!tickersParam) {
        return res.status(400).json({ error: "Missing tickers parameter" });
      }
      const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

      // Fetch in batches of 10 to avoid Yahoo rate limits
      const BATCH = 10;
      const results: any[] = [];

      for (let i = 0; i < tickers.length; i += BATCH) {
        const batch = tickers.slice(i, i + BATCH);
        try {
          const quotes = await yahooFinance.quote(batch, { fields: ['shortName', 'regularMarketPrice', 'marketCap', 'trailingPE', 'forwardPE', 'priceToBook', 'earningsPerShare'] });

          const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

          for (const q of quoteArray) {
            if (!q || !q.symbol) continue;
            const sym = q.symbol;
            const peTtm = q.trailingPE ?? null;
            const peFwd = q.forwardPE ?? null;
            const pb = q.priceToBook ?? null;
            const eps = q.earningsPerShare?.trailing ?? null;
            // PEG: forwardPE / growthRate - simplified estimate
            const price = q.regularMarketPrice ?? null;
            const marketCap = q.marketCap ?? null;

            // Compute 1Y PE change (approximate from current vs 1Y ago)
            let oneYearPeChange = 0;
            try {
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              const oldChart = await yahooFinance.chart(sym, {
                period1: oneYearAgo,
                interval: '1d',
              });
              const oldQuotes = oldChart.quotes.filter(q2 => q2.close != null);
              if (oldQuotes.length > 0 && peTtm && price) {
                const oldPrice = oldQuotes[0].close!;
                const oldPeEst = oldPrice > 0 && eps ? oldPrice / eps : null;
                if (oldPeEst && peTtm > 0) {
                  oneYearPeChange = parseFloat(((peTtm - oldPeEst) / oldPeEst * 100).toFixed(1));
                }
              }
            } catch { /* skip */ }

            // Compute PE percentile
            const pePercentile10y = await computePePercentile(sym, peTtm ?? 20);

            // Determine status
            let status: 'Low' | 'Neutral' | 'High' = 'Neutral';
            if (pePercentile10y !== null) {
              if (pePercentile10y < 30) status = 'Low';
              else if (pePercentile10y > 70) status = 'High';
              else status = 'Neutral';
            }

            results.push({
              id: sym.toLowerCase(),
              name: q.shortName || sym,
              nameZh: q.shortName || sym,  // backend doesn't know Chinese, frontend will use nameZh from mockData
              ticker: sym,
              type: sym.includes('.') ? 'ADR' : 'US',
              marketCap: marketCap ? formatMarketCap(marketCap) : 'N/A',
              price: price ?? 0,
              peTtm: peTtm ? parseFloat(peTtm.toFixed(2)) : null,
              peFwd: peFwd ? parseFloat(peFwd.toFixed(2)) : null,
              pb: pb ? parseFloat(pb.toFixed(2)) : null,
              peg: 0,
              oneYearPeChange,
              pePercentile10y,
              status,
            });
          }
        } catch (err: any) {
          console.error(`Batch error for ${batch.join(',')}:`, err.message);
        }
        // Small delay between batches to avoid rate limit
        if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 500));
      }

      res.json({ companies: results });
    } catch (error: any) {
      console.error("Error in /api/valuation:", error.message || error);
      res.status(500).json({ error: "Failed to fetch valuation data", details: error.message });
    }
  });

  app.get("/api/index-valuations", async (req, res) => {
    try {
      const BATCH = 5;
      const results: any[] = [];

      for (let i = 0; i < INDEX_TICKERS.length; i += BATCH) {
        const batch = INDEX_TICKERS.slice(i, i + BATCH);
        try {
          const quotes = await yahooFinance.quote(batch);
          const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
          for (const q of quoteArray) {
            if (!q || !q.symbol) continue;
            const peTtm = q.trailingPE ?? null;
            const peFwd = q.forwardPE ?? null;
            const pb = q.priceToBook ?? null;
            const price = q.regularMarketPrice ?? null;

            let oneYearPeChange = 0;
            try {
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              const oldChart = await yahooFinance.chart(q.symbol, { period1: oneYearAgo, interval: '1mo' });
              const oldClose = oldChart.quotes[0]?.close;
              if (oldClose && peTtm && price && oldClose > 0) {
                const oldPe = peTtm * (oldClose / price);
                oneYearPeChange = parseFloat(((peTtm - oldPe) / oldPe * 100).toFixed(1));
              }
            } catch { /* skip */ }

            const pePercentile = await computePePercentile(q.symbol, peTtm ?? 20);
            let status: 'Low' | 'Neutral' | 'High' = 'Neutral';
            if (pePercentile < 30) status = 'Low';
            else if (pePercentile > 70) status = 'High';

            results.push({
              id: q.symbol.toLowerCase(),
              name: q.shortName || q.symbol,
              nameZh: q.shortName || q.symbol,
              ticker: q.symbol,
              type: 'Core',
              peTtm: peTtm ? parseFloat(peTtm.toFixed(2)) : null,
              peFwd: peFwd ? parseFloat(peFwd.toFixed(2)) : null,
              pb: pb ? parseFloat(pb.toFixed(2)) : null,
              oneYearPeChange,
              pePercentile,
              price: price ?? 0,
              status,
            });
          }
        } catch (err: any) {
          console.error(`Index batch error ${batch.join(',')}:`, err.message);
        }
        if (i + BATCH < INDEX_TICKERS.length) await new Promise(r => setTimeout(r, 500));
      }

      res.json({ indices: results });
    } catch (error: any) {
      console.error("Error in /api/index-valuations:", error.message || error);
      res.status(500).json({ error: "Failed to fetch index valuations", details: error.message });
    }
  });

  // ─── Individual endpoints (keep existing) ───────────────────────────────────
  app.get("/api/quotes", async (req, res) => {
    try {
      const symbols = req.query.symbols as string;
      if (!symbols) return res.status(400).json({ error: "Missing symbols parameter" });
      const symbolArray = symbols.split(',');
      const quotes = await yahooFinance.quote(symbolArray);
      const results = Array.isArray(quotes) ? quotes : [quotes];
      res.json({ quoteResponse: { result: results } });
    } catch (error: any) {
      console.error("Error fetching quotes:", error.message || error);
      res.status(500).json({ error: "Failed to fetch quotes", details: error.message });
    }
  });

  app.get("/api/fundamentals", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) return res.status(400).json({ error: "Missing symbol parameter" });
      const quoteSummary = await yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail']
      });
      res.json({ quoteSummary: { result: [quoteSummary] } });
    } catch (error: any) {
      console.error("Error fetching fundamentals:", error.message || error);
      res.status(500).json({ error: "Failed to fetch fundamentals", details: error.message });
    }
  });

  app.get("/api/historical", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) return res.status(400).json({ error: "Missing symbol parameter" });
      const period1 = new Date();
      period1.setFullYear(period1.getFullYear() - 20);
      const chart = await yahooFinance.chart(symbol, {
        period1,
        interval: '1mo'
      });
      const timestamps = chart.quotes.map(q => new Date(q.date).getTime() / 1000);
      const closePrices = chart.quotes.map(q => q.close);
      res.json({
        chart: {
          result: [{
            timestamp: timestamps,
            indicators: {
              quote: [{ close: closePrices }]
            }
          }]
        }
      });
    } catch (error: any) {
      console.error("Error fetching historical:", error.message || error);
      res.status(500).json({ error: "Failed to fetch historical data", details: error.message });
    }
  });

  // ─── Vite middleware ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

function formatMarketCap(raw: number): string {
  if (!raw) return 'N/A';
  if (raw >= 1e12) return (raw / 1e12).toFixed(2) + 'T';
  if (raw >= 1e9) return (raw / 1e9).toFixed(2) + 'B';
  if (raw >= 1e6) return (raw / 1e6).toFixed(2) + 'M';
  return raw.toString();
}

startServer();
