import fs from 'fs';
import path from 'path';

export interface DailyQuoteCache {
  timestamp?: string;
  companies?: any[];
  indices?: any[];
}

export interface HistoricalTickerData {
  history?: any[];
  splits?: any[];
  shares?: number | null;
}

export interface HistoricalCache {
  timestamp?: string;
  count?: number;
  data?: Record<string, HistoricalTickerData>;
}

function readJsonFile<T>(filePath: string, errorMessage: string): T {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error: any) {
    throw new Error(`${errorMessage}: ${error.message}`);
  }
}

export function loadDailyQuoteCache(baseDir: string): DailyQuoteCache {
  const filePath = path.join(baseDir, 'stock_cache', 'daily_quotes.json');
  return readJsonFile<DailyQuoteCache>(
    filePath,
    'Cache file not found or invalid. Run scripts/fetch_quotes.py first.',
  );
}

export function loadHistoricalCache(baseDir: string): HistoricalCache {
  const filePath = path.join(baseDir, 'stock_cache', 'historical.json');
  return readJsonFile<HistoricalCache>(
    filePath,
    'Historical cache not found. Run scripts/fetch_history.py first.',
  );
}
