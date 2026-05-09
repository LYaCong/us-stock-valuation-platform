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
  oneYearPeChange: number | null;
  pePercentile10y: number | null;
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
  oneYearPeChange: number | null;
  pePercentile: number | null;
  dataRange: string;
  status: 'Low' | 'Neutral' | 'High';
  price?: number | null;
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
