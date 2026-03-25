import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import YahooFinance from 'yahoo-finance2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // 读取每日缓存的数据（由 Python 脚本抓取）
  const CACHE_FILE = path.join(__dirname, 'stock_cache', 'daily_quotes.json');

  app.get("/api/valuation", async (req, res) => {
    try {
      const tickersParam = req.query.tickers as string;
      if (!tickersParam) {
        return res.status(400).json({ error: "Missing tickers parameter" });
      }
      const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

      // 读取缓存文件
      let cacheData: any = null;
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
        cacheData = JSON.parse(fileContent);
      } catch (e: any) {
        console.error('Failed to read cache file:', e.message);
        return res.status(500).json({ error: 'Cache file not found or invalid. Run scripts/fetch_quotes.py first.' });
      }

      const cacheMap = new Map<string, any>();
      for (const c of cacheData.companies || []) {
        cacheMap.set(c.ticker, c);
      }

      const results: any[] = [];
      for (const ticker of tickers) {
        const cached = cacheMap.get(ticker);
        if (!cached) {
          // Ticker not in cache, return minimal data
          results.push({
            id: ticker.toLowerCase(),
            name: ticker,
            nameZh: ticker,
            ticker,
            type: ticker.includes('.') ? 'ADR' : 'US',
            marketCap: 'N/A',
            price: 0,
            peTtm: null,
            peFwd: null,
            pb: null,
            peg: 0,
            oneYearPeChange: 0,
            pePercentile10y: null,
            status: 'Neutral',
          });
          continue;
        }

        // 使用Python脚本预先计算的百分位数据
        const pePercentile10y = cached.pePercentile ?? 50;
        const status = cached.status || 'Neutral';

        results.push({
          id: cached.ticker.toLowerCase(),
          name: cached.name || cached.ticker,
          nameZh: cached.name || cached.ticker,
          ticker: cached.ticker,
          type: cached.ticker.includes('.') ? 'ADR' : 'US',
          marketCap: cached.marketCapStr || 'N/A',
          price: cached.price ?? 0,
          peTtm: cached.peTtm || null,
          peFwd: cached.peFwd || null,
          pb: cached.pb || null,
          peg: 0,
          oneYearPeChange: 0,
          pePercentile10y,
          status,
        });
      }

      res.json({ companies: results });
    } catch (error: any) {
      console.error("Error in /api/valuation:", error.message || error);
      res.status(500).json({ error: "Failed to fetch valuation data", details: error.message });
    }
  });

  app.get("/api/index-valuations", async (req, res) => {
    try {
      // 读取缓存文件
      let cacheData: any = null;
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
        cacheData = JSON.parse(fileContent);
      } catch (e: any) {
        console.error('Failed to read cache file:', e.message);
        return res.status(500).json({ error: 'Cache file not found or invalid. Run scripts/fetch_quotes.py first.' });
      }

      const indices = cacheData.indices || [];
      res.json({ indices });
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
      
      const HIST_CACHE_FILE = path.join(__dirname, 'stock_cache', 'historical.json');
      let cacheData: any = null;
      try {
        const fileContent = fs.readFileSync(HIST_CACHE_FILE, 'utf-8');
        cacheData = JSON.parse(fileContent);
      } catch (e: any) {
        return res.status(500).json({ error: 'Historical cache not found. Run scripts/fetch_history.py first.' });
      }
      
      const ticker = symbol.toUpperCase();
      const history = cacheData.data?.[ticker] || [];
      res.json({ history });
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
