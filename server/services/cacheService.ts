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

export interface DcfFundamentalRecord {
  ticker: string;
  cik?: string | null;
  fiscalYear?: number | null;
  form?: string | null;
  filedDate?: string | null;
  accessionNumber?: string | null;
  operatingCashFlow?: number | null;
  capitalExpenditures?: number | null;
  freeCashFlow?: number | null;
  cashAndEquivalents?: number | null;
  shortTermDebt?: number | null;
  longTermDebt?: number | null;
  totalDebt?: number | null;
  netDebt?: number | null;
  sharesOutstanding?: number | null;
  annualCashFlow?: Record<string, any>;
  latestBalanceSheet?: Record<string, any>;
  latestShares?: Record<string, any>;
  supplementalSources?: Record<string, any>;
  sourceTags?: Record<string, string | null>;
  missingFields?: string[];
  coverageStatus?: string;
}

export interface DcfFundamentalsCache {
  metadata?: Record<string, any>;
  data?: Record<string, DcfFundamentalRecord>;
}

export interface DcfAssumption {
  growth1to5: number;
  growth6to10: number;
  wacc: number;
  terminalGrowth: number;
  updatedAt?: string;
  note?: string;
}

export interface DcfAssumptionsCache {
  metadata?: Record<string, any>;
  defaults?: DcfAssumption;
  companies?: Record<string, DcfAssumption>;
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

export function loadDcfFundamentalsCache(baseDir: string): DcfFundamentalsCache {
  const filePath = path.join(baseDir, 'stock_cache', 'dcf_fundamentals.json');
  try {
    return readJsonFile<DcfFundamentalsCache>(
      filePath,
      'DCF fundamentals cache not found. Run scripts/fetch_sec_dcf_fundamentals.py first.',
    );
  } catch {
    return { metadata: {}, data: {} };
  }
}

export function loadDcfAssumptionsCache(baseDir: string): DcfAssumptionsCache {
  const filePath = path.join(baseDir, 'stock_cache', 'dcf_assumptions.json');
  try {
    return readJsonFile<DcfAssumptionsCache>(
      filePath,
      'DCF assumptions cache not found.',
    );
  } catch {
    return {
      metadata: {},
      defaults: {
        growth1to5: 15,
        growth6to10: 10,
        wacc: 10,
        terminalGrowth: 2.5,
      },
      companies: {},
    };
  }
}

export function saveDcfAssumption(baseDir: string, ticker: string, assumption: DcfAssumption) {
  const filePath = path.join(baseDir, 'stock_cache', 'dcf_assumptions.json');
  const apiDataPath = path.join(baseDir, 'api', '_data', 'dcf_assumptions.json');
  const cache = loadDcfAssumptionsCache(baseDir);
  const normalizedTicker = ticker.trim().toUpperCase();
  const nextCache: DcfAssumptionsCache = {
    metadata: {
      ...(cache.metadata || {}),
      updatedAt: new Date().toISOString(),
      description: 'Company-level default DCF assumptions. These are human judgments, not market data.',
    },
    defaults: cache.defaults || {
      growth1to5: 15,
      growth6to10: 10,
      wacc: 10,
      terminalGrowth: 2.5,
    },
    companies: {
      ...(cache.companies || {}),
      [normalizedTicker]: {
        ...assumption,
        updatedAt: assumption.updatedAt || new Date().toISOString(),
      },
    },
  };

  fs.writeFileSync(filePath, `${JSON.stringify(nextCache, null, 2)}\n`, 'utf-8');
  if (fs.existsSync(path.dirname(apiDataPath))) {
    fs.writeFileSync(apiDataPath, `${JSON.stringify(nextCache, null, 2)}\n`, 'utf-8');
  }

  return nextCache.companies?.[normalizedTicker] || null;
}
