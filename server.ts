import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';
import { createMarketDataService } from './server/services/marketDataService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const marketDataService = createMarketDataService({
    baseDir: __dirname,
    yahooFinance,
  });

  app.get('/api/valuation', async (req, res) => {
    try {
      const tickersParam = req.query.tickers as string;
      if (!tickersParam) {
        return res.status(400).json({ error: 'Missing tickers parameter' });
      }

      const tickers = tickersParam
        .split(',')
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean);

      const payload = await marketDataService.getValuations(tickers);
      res.json(payload);
    } catch (error: any) {
      console.error('Error in /api/valuation:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch valuation data', details: error.message });
    }
  });

  app.get('/api/index-valuations', async (_req, res) => {
    try {
      const payload = await marketDataService.getIndexValuations();
      res.json(payload);
    } catch (error: any) {
      console.error('Error in /api/index-valuations:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch index valuations', details: error.message });
    }
  });

  app.get('/api/quotes', async (req, res) => {
    try {
      const symbols = req.query.symbols as string;
      if (!symbols) {
        return res.status(400).json({ error: 'Missing symbols parameter' });
      }

      const payload = await marketDataService.getQuotes(symbols.split(','));
      res.json(payload);
    } catch (error: any) {
      console.error('Error fetching quotes:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
    }
  });

  app.get('/api/fundamentals', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol parameter' });
      }

      const payload = await marketDataService.getFundamentals(symbol);
      res.json(payload);
    } catch (error: any) {
      console.error('Error fetching fundamentals:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch fundamentals', details: error.message });
    }
  });

  app.get('/api/historical', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol parameter' });
      }

      const payload = await marketDataService.getHistorical(symbol);
      res.json(payload);
    } catch (error: any) {
      console.error('Error fetching historical:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch historical data', details: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
