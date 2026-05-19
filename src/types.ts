export interface CompanyValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'US' | 'ADR';
  marketCap: string | null;
  peTtm: number | null;
  peFwd: number | null;
  pb: number | null;
  peg: number | null;
  roe: number | null;
  pePercentile10y: number | null;
  pe10yMin: number | null;
  pe10yMax: number | null;
  pe10yMedian: number | null;
  pePercentile5y: number | null;
  pePercentileAllHistory: number | null;
  priceChange10y: number | null;
  status: 'Low' | 'Neutral' | 'High';
  logo?: string;
  price?: number | null;
}

export interface IndexValuation {
  id: string;
  name: string;
  nameZh: string;
  ticker: string;
  type: 'Core' | 'Sector';
  peTtm: number | null;
  peFwd: number | null;
  pb: number | null;
  roe: number | null;
  pePercentile: number | null;
  dataRange: string;
  status: 'Low' | 'Neutral' | 'High';
  price?: number | null;
  dividendYield?: number | null;
  expenseRatio?: number | null;
  assetsUnderManagement?: number | null;
  eodhdUpdatedAt?: string | null;
}

export interface HistoricalDataPoint {
  date: string;
  peTtm: number | null;
  percentile: number | null;
  price?: number | null;
  marketCap?: number | null;
  volume?: number | null;
}

export interface ApiMetadata {
  lastUpdated?: string;
  availableFields?: string[];
  coverage?: number;
}

export type Theme = 'dark' | 'light';
export type Lang = 'zh' | 'en';
export type TranslationMap = Record<string, string>;

export interface FilterOption {
  value: string;
  label: string;
}
