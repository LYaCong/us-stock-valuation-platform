/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Search,
  TrendingUp,
  BarChart3,
  Settings,
  LayoutGrid,
  Info,
  Calculator,
} from 'lucide-react';
import { NavButton } from './components/common/NavButton';
import { ComparisonView } from './components/views/ComparisonView';
import { DcfView } from './components/views/DcfView';
import { DetailsView } from './components/views/DetailsView';
import { IndexDetailsView } from './components/views/IndexDetailsView';
import { IndexView } from './components/views/IndexView';
import { OverviewView } from './components/views/OverviewView';
import { SettingsView } from './components/views/SettingsView';
import { useHistoricalData } from './hooks/useHistoricalData';
import { useMarketData } from './hooks/useMarketData';
import {
  type CompanyValuation,
  type IndexValuation,
  type Lang,
  type Theme,
} from './types';
import { cn } from './utils/cn';

type Tab = 'overview' | 'details' | 'comparison' | 'indices' | 'indexDetails' | 'settings' | 'dcf';

const translations = {
  zh: {
    overview: '公司总览',
    details: '公司详情',
    comparison: '对比分析',
    indices: '指数总览',
    indexDetails: '指数详情',
    dcf: 'DCF 模型',
    settings: '偏好设置',
    searchPlaceholder: '公司名称 / 股票代码',
    updatedAt: '数据更新时间:',
    companyValuation: '公司估值卡片',
    indexValuation: '指数估值卡片',
    group: '组别',
    sort: '排序',
    all: '全部',
    core: '核心',
    industry: '行业',
    refreshChart: '刷新图表',
    percentileTrend: '百分位走势',
    currentPercentilePosition: '当前百分位位置',
    undervalued: '低估',
    overvalued: '高估',
    currentValue: '当前值',
    percentileCurrentRange: '百分位 (当前区间)',
    percentileAllHistory: '百分位 (全历史)',
    rollingPercentile5Y: '滚动百分位 (5年)',
    rollingPercentile10Y: '滚动百分位 (10年)',
    rangeChange: '区间变动',
    rangeMin: '区间最低',
    rangeMax: '区间最高',
    companyValuationTimeSeries: '公司估值时序',
    indexValuationTimeSeries: '指数估值时序',
    searchComparison: '搜索添加对比公司...',
    peComparison: 'PE (TTM) 对比',
    remove: '移除',
    dcfDescription: '基于自由现金流贴现的绝对估值模型',
    loadingFundamentals: '加载财务数据中...',
    assumptions: '核心假设',
    discountRate: '折现率 (WACC)',
    terminalGrowthRate: '永续增长率',
    growthRateYears1to5: '1-5年增长率',
    growthRateYears6to10: '6-10年增长率',
    financialData: '财务数据 (十亿美元)',
    initialFcf: '初始自由现金流 (FCF)',
    sharesOutstanding: '总股本',
    netDebt: '净债务',
    valuationResult: '估值结果',
    impliedValuePerShare: '隐含每股价值',
    currentPrice: '当前股价',
    marginOfSafety: '安全边际',
    fcfProjection: '自由现金流预测',
    year: '年份',
    fcf: 'FCF',
    pvOfFcf: 'FCF现值',
    terminalValue: '永续价值',
    pvOfTerminalValue: '永续价值现值',
    enterpriseValue: '企业价值 (EV)',
    equityValue: '股权价值',
    add: '添加',
    compareCompanies: '对比公司',
    companiesCount: '家',
    alignPeriod: '对齐区间',
    medianPercentile: '中位百分位',
    currentCrossSection: '当前横截面',
    dcfModel: 'DCF 估值模型',
    loadingRealData: '加载真实财务数据中...',
    dcfDataQuality: '数据质量',
    dcfValidationErrors: '参数或输入数据存在问题',
    dcfWarnings: '提示',
    dcfUsingEstimatedData: '以下字段正在使用估算值',
    dcfDataReady: '真实数据已就绪',
    dcfCannotCalculate: '当前条件下无法计算 DCF',
    dcfProjectionUnavailable: '请先修正输入，再显示现金流预测',
    dcfSensitivityUnavailable: '请先修正输入，再显示敏感性分析',
    dcfMissingCurrentPrice: '缺少当前股价，安全边际将显示为 N/A',
    dcfMissingShares: '缺少总股本，无法计算每股价值',
    dcfMissingFcf: '缺少基准自由现金流，无法进行贴现',
    dcfInvalidWacc: '折现率必须大于 0',
    dcfInvalidTerminalGrowth: '永续增长率不能小于 0',
    dcfTerminalGrowthTooHigh: '永续增长率必须严格小于折现率',
    dcfFieldPrice: '股价',
    dcfFieldShares: '总股本',
    dcfFieldFcf: '自由现金流',
    dcfFieldNetDebt: '净债务',
    coreAssumptions: '核心假设',
    growth1to5: '1-5年 预期增长率',
    growth6to10: '6-10年 预期增长率',
    wacc: '折现率 (WACC)',
    terminalGrowth: '永续增长率',
    baseFcf: '基准自由现金流 (FCF)',
    totalShares: '总股本',
    impliedPrice: '内在价值',
    futureFcf: '未来现金流折现 (十亿美元)',
    sensitivityAnalysis: '敏感性分析 (内在价值)',
    waccVsTg: 'WACC \\ 永续增长',
    marketCap: '市值',
    peTtm: '市盈率 (TTM)',
    peFwd: '市盈率 (FWD)',
    pb: '市净率 (PB)',
    price: '实时股价',
    roe: 'ROE (净资产收益率)',
    dividendYield: '股息率',
    expenseRatio: '费率',
    assetsUnderManagement: '资产规模',
    pePercentile10y: 'PE百分位 (近十年)',
    low: '低估',
    neutral: '中性',
    high: '高估',
    adr: 'ADR',
    usCompany: '美股公司',
    sortByMarketCap: '市值从高到低',
    sortByPeLow: 'PE最低',
    sortByPeHigh: 'PE最高',
    marketHeat: '市场热度',
    range: '范围',
    emptyComparison: '请搜索并添加公司进行对比',
    loadingComparisonHistory: '正在加载真实历史数据...',
    noComparisonHistory: '当前选中公司没有可对齐的真实历史数据',
    realHistoryMode: '真实历史模式',
    priceComparison: '价格历史对比',
    marketCapComparison: '市值历史对比',
    appearance: '外观与主题',
    themeMode: '主题模式',
    themeDescription: '选择您喜欢的界面外观',
    lightMode: '浅色模式',
    darkMode: '深色模式',
    percentile: '百分位',
    dataRange: '数据区间',
  },
  en: {
    overview: 'Company Overview',
    details: 'Company Details',
    comparison: 'Comparison',
    indices: 'Index Overview',
    indexDetails: 'Index Details',
    dcf: 'DCF Model',
    settings: 'Settings',
    searchPlaceholder: 'Company Name / Ticker',
    updatedAt: 'Updated at',
    companyValuation: 'Company Valuation Cards',
    indexValuation: 'Index Valuation Cards',
    group: 'Group',
    sort: 'Sort',
    all: 'All',
    core: 'Core',
    industry: 'Industry',
    refreshChart: 'Refresh Chart',
    percentileTrend: 'Percentile Trend',
    currentPercentilePosition: 'Current Percentile Position',
    undervalued: 'Undervalued',
    overvalued: 'Overvalued',
    currentValue: 'Current Value',
    percentileCurrentRange: 'Percentile (Range)',
    percentileAllHistory: 'Percentile (All)',
    rollingPercentile5Y: 'Rolling (5Y)',
    rollingPercentile10Y: 'Rolling (10Y)',
    rangeChange: 'Range Change',
    rangeMin: 'Range Min',
    rangeMax: 'Range Max',
    companyValuationTimeSeries: 'Company Valuation Time Series',
    indexValuationTimeSeries: 'Index Valuation Time Series',
    searchComparison: 'Search to add comparison company...',
    peComparison: 'PE (TTM) Comparison',
    remove: 'Remove',
    dcfDescription: 'Absolute valuation model based on discounted free cash flow',
    loadingFundamentals: 'Loading financial data...',
    assumptions: 'Core Assumptions',
    discountRate: 'Discount Rate (WACC)',
    terminalGrowthRate: 'Terminal Growth Rate',
    growthRateYears1to5: 'Growth Rate (Years 1-5)',
    growthRateYears6to10: 'Growth Rate (Years 6-10)',
    financialData: 'Financial Data (Billions)',
    initialFcf: 'Initial Free Cash Flow (FCF)',
    sharesOutstanding: 'Shares Outstanding',
    netDebt: 'Net Debt',
    valuationResult: 'Valuation Result',
    impliedValuePerShare: 'Implied Value Per Share',
    currentPrice: 'Current Price',
    marginOfSafety: 'Margin of Safety',
    fcfProjection: 'Free Cash Flow Projection',
    year: 'Year',
    fcf: 'FCF',
    pvOfFcf: 'PV of FCF',
    terminalValue: 'Terminal Value',
    pvOfTerminalValue: 'PV of Terminal Value',
    enterpriseValue: 'Enterprise Value (EV)',
    equityValue: 'Equity Value',
    add: 'Add',
    compareCompanies: 'Compare Companies',
    companiesCount: 'Companies',
    alignPeriod: 'Align Period',
    medianPercentile: 'Median Percentile',
    currentCrossSection: 'Current Cross Section',
    dcfModel: 'DCF Valuation Model',
    loadingRealData: 'Loading real financial data...',
    dcfDataQuality: 'Data Quality',
    dcfValidationErrors: 'There are problems with the assumptions or inputs',
    dcfWarnings: 'Warnings',
    dcfUsingEstimatedData: 'The following fields are using estimated values',
    dcfDataReady: 'Real financial inputs loaded',
    dcfCannotCalculate: 'DCF cannot be calculated with the current inputs',
    dcfProjectionUnavailable: 'Fix the inputs before showing the cash flow projection',
    dcfSensitivityUnavailable: 'Fix the inputs before showing the sensitivity analysis',
    dcfMissingCurrentPrice: 'Current price is missing, so margin of safety is shown as N/A',
    dcfMissingShares: 'Shares outstanding is missing, so per-share value cannot be calculated',
    dcfMissingFcf: 'Base free cash flow is missing, so discounting cannot proceed',
    dcfInvalidWacc: 'Discount rate must be greater than 0',
    dcfInvalidTerminalGrowth: 'Terminal growth rate cannot be below 0',
    dcfTerminalGrowthTooHigh: 'Terminal growth rate must stay below WACC',
    dcfFieldPrice: 'Price',
    dcfFieldShares: 'Shares',
    dcfFieldFcf: 'Free Cash Flow',
    dcfFieldNetDebt: 'Net Debt',
    coreAssumptions: 'Core Assumptions',
    growth1to5: '1-5 Yrs Expected Growth Rate',
    growth6to10: '6-10 Yrs Expected Growth Rate',
    wacc: 'Discount Rate (WACC)',
    terminalGrowth: 'Terminal Growth Rate',
    baseFcf: 'Base Free Cash Flow (FCF)',
    totalShares: 'Total Shares',
    impliedPrice: 'Implied Price',
    futureFcf: 'Discounted Future Cash Flow (Billions)',
    sensitivityAnalysis: 'Sensitivity Analysis (Implied Price)',
    waccVsTg: 'WACC \\ Terminal Growth',
    marketCap: 'Market Cap',
    peTtm: 'PE (TTM)',
    peFwd: 'PE (FWD)',
    pb: 'PB',
    price: 'Price',
    roe: 'ROE',
    dividendYield: 'Yield',
    expenseRatio: 'Expense',
    assetsUnderManagement: 'AUM',
    pePercentile10y: 'PE Percentile (10Y)',
    low: 'Low',
    neutral: 'Neutral',
    high: 'High',
    adr: 'ADR',
    usCompany: 'US Company',
    sortByMarketCap: 'Market Cap (High to Low)',
    sortByPeLow: 'PE (Low to High)',
    sortByPeHigh: 'PE (High to Low)',
    marketHeat: 'Market Heat',
    range: 'Range',
    emptyComparison: 'Search and add companies to compare',
    loadingComparisonHistory: 'Loading real historical data...',
    noComparisonHistory: 'No aligned real historical data for the selected companies',
    realHistoryMode: 'Real history mode',
    priceComparison: 'Price History Comparison',
    marketCapComparison: 'Market Cap History Comparison',
    appearance: 'Appearance & Theme',
    themeMode: 'Theme Mode',
    themeDescription: 'Choose your preferred interface appearance',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    percentile: 'Percentile',
    dataRange: 'Data Range',
  }
};

function parseMarketCapForSort(marketCap: string | null) {
  if (!marketCap) return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ''));
  if (marketCap.includes('T')) return value * 1000;
  if (marketCap.includes('B')) return value;
  if (marketCap.includes('M')) return value / 1000;
  return value;
}

const FALLBACK_INDEX: IndexValuation = {
  id: 'spy',
  name: 'S&P 500',
  nameZh: '标普500指数',
  ticker: 'SPY',
  type: 'Core',
  peTtm: null,
  peFwd: null,
  pb: null,
  roe: null,
  pePercentile: null,
  dataRange: '',
  status: 'Neutral',
  price: null,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('nvda');
  const [selectedIndexId, setSelectedIndexId] = useState('spx');
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Lang>('zh');
  const [overviewScope, setOverviewScope] = useState('all');
  const [overviewSort, setOverviewSort] = useState('marketCap');
  const [indicesGroup, setIndicesGroup] = useState('all');
  const [indicesSort, setIndicesSort] = useState('marketHeat');
  const [comparisonCompanies, setComparisonCompanies] = useState<string[]>(['nvda', 'aapl', 'msft']);

  const { companies, indices, isLoadingQuotes, lastUpdated } = useMarketData();
  const t = translations[lang];

  const filteredCompanies = useMemo(() => {
    let result = companies.filter((company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (overviewScope === 'adr') {
      result = result.filter((company) => company.type === 'ADR');
    } else if (overviewScope === 'us') {
      result = result.filter((company) => company.type === 'US');
    }

    if (overviewSort === 'marketCap') {
      result = [...result].sort((left, right) => parseMarketCapForSort(right.marketCap) - parseMarketCapForSort(left.marketCap));
    } else if (overviewSort === 'peLow') {
      result = [...result].sort((left, right) => (left.peTtm ?? Number.POSITIVE_INFINITY) - (right.peTtm ?? Number.POSITIVE_INFINITY));
    } else if (overviewSort === 'peHigh') {
      result = [...result].sort((left, right) => (right.peTtm ?? Number.NEGATIVE_INFINITY) - (left.peTtm ?? Number.NEGATIVE_INFINITY));
    }

    return result;
  }, [companies, overviewScope, overviewSort, searchQuery]);

  const filteredIndices = useMemo(() => {
    let result = [...indices];
    if (indicesGroup === 'core') {
      result = result.filter((index) => index.type === 'Core');
    } else if (indicesGroup === 'industry') {
      result = result.filter((index) => index.type === 'Sector');
    }

    if (indicesSort === 'peLow') {
      result.sort((left, right) => (left.peTtm ?? Number.POSITIVE_INFINITY) - (right.peTtm ?? Number.POSITIVE_INFINITY));
    } else if (indicesSort === 'peHigh') {
      result.sort((left, right) => (right.peTtm ?? Number.NEGATIVE_INFINITY) - (left.peTtm ?? Number.NEGATIVE_INFINITY));
    }

    return result;
  }, [indices, indicesGroup, indicesSort]);

  const selectedCompany = useMemo(() => {
    if (companies.length === 0) return null;
    return companies.find((company) => company.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  const selectedIndex = useMemo(() => {
    if (indices.length === 0) return FALLBACK_INDEX;
    return indices.find((index) => index.id === selectedIndexId) || indices[0];
  }, [indices, selectedIndexId]);

  const {
    historicalData,
    historicalSplits,
    historicalMetadata,
  } = useHistoricalData(selectedCompany?.ticker);
  const {
    historicalData: indexHistoricalData,
    historicalSplits: indexSplits,
    historicalMetadata: indexHistoricalMetadata,
  } = useHistoricalData(selectedIndex?.ticker);

  return (
    <div className={cn(
      'min-h-screen font-sans transition-colors duration-300',
      theme === 'dark'
        ? 'bg-[#0a0e1a] text-slate-200 selection:bg-blue-500/30 dark'
        : 'bg-slate-50 text-slate-900 selection:bg-blue-500/30'
    )}>
      <header className={cn(
        'sticky top-0 z-50 border-b px-6 py-4 backdrop-blur-md transition-colors duration-300 overflow-x-auto scrollbar-hide',
        theme === 'dark' ? 'border-white/5 bg-[#0a0e1a]/80' : 'border-slate-200 bg-white/80'
      )}>
        <div className="flex items-center justify-between max-w-[1600px] mx-auto flex-nowrap">
          <div className={cn('flex items-center flex-nowrap', lang === 'en' ? 'gap-1 md:gap-2' : 'gap-2 md:gap-4')}>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent whitespace-nowrap shrink-0">
              US Stock Valuation
            </h1>
            <nav className={cn(
              'flex items-center flex-nowrap p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-hide gap-1',
              theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
            )}>
              <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutGrid size={18} />} label={t.overview} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<BarChart3 size={18} />} label={t.details} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'comparison'} onClick={() => setActiveTab('comparison')} icon={<TrendingUp size={18} />} label={t.comparison} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'indices'} onClick={() => setActiveTab('indices')} icon={<Info size={18} />} label={t.indices} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'indexDetails'} onClick={() => setActiveTab('indexDetails')} icon={<BarChart3 size={18} />} label={t.indexDetails} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'dcf'} onClick={() => setActiveTab('dcf')} icon={<Calculator size={18} />} label={t.dcf} theme={theme} lang={lang} />
              <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label={t.settings} theme={theme} lang={lang} />
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn('flex items-center p-1 rounded-full', theme === 'dark' ? 'bg-white/10' : 'bg-slate-200')}>
                <button
                  onClick={() => setLang('en')}
                  className={cn('px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-full transition-all', lang === 'en' ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('zh')}
                  className={cn('px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-full transition-all', lang === 'zh' ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}
                >
                  中
                </button>
              </div>

              <div className="relative group shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={cn(
                    'border rounded-xl pl-8 pr-3 py-1.5 w-32 md:w-48 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all',
                    theme === 'dark' ? 'bg-white/5 border-white/10 placeholder:text-slate-600' : 'bg-white border-slate-200 placeholder:text-slate-400'
                  )}
                />
              </div>
            </div>

            <div className="text-[10px] md:text-xs text-slate-500 text-right whitespace-nowrap leading-tight shrink-0">
              <div className="opacity-70">{t.updatedAt}</div>
              <div className="font-mono">{lastUpdated}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {isLoadingQuotes ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className={cn('w-16 h-16 border-4 rounded-full animate-spin mb-6', theme === 'dark' ? 'border-blue-500/30 border-t-blue-500' : 'border-blue-200 border-t-blue-600')} />
            <h2 className={cn('text-xl font-semibold mb-2', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
              {lang === 'zh' ? '加载数据中...' : 'Loading data...'}
            </h2>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              {lang === 'zh' ? '正在获取最新市场数据' : 'Fetching latest market data'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView
                companies={filteredCompanies}
                onSelectCompany={(id) => {
                  setSelectedCompanyId(id);
                  setActiveTab('details');
                }}
                scope={overviewScope}
                setScope={setOverviewScope}
                sort={overviewSort}
                setSort={setOverviewSort}
                theme={theme}
                lang={lang}
                t={t}
              />
            )}

            {activeTab === 'details' && (
              <DetailsView
                company={selectedCompany}
                historicalData={historicalData}
                historicalSplits={historicalSplits}
                historicalMetadata={historicalMetadata}
                theme={theme}
                onGoToDcf={() => setActiveTab('dcf')}
                t={t}
                lang={lang}
              />
            )}

            {activeTab === 'comparison' && (
              <ComparisonView
                companies={companies}
                selectedIds={comparisonCompanies}
                setSelectedIds={setComparisonCompanies}
                theme={theme}
                t={t}
                lang={lang}
              />
            )}

            {activeTab === 'indices' && (
              <IndexView
                indices={filteredIndices}
                group={indicesGroup}
                setGroup={setIndicesGroup}
                sort={indicesSort}
                setSort={setIndicesSort}
                theme={theme}
                onSelectIndex={(id) => {
                  setSelectedIndexId(id);
                  setActiveTab('indexDetails');
                }}
                t={t}
                lang={lang}
              />
            )}

            {activeTab === 'indexDetails' && (
              <IndexDetailsView
                index={selectedIndex}
                historicalData={indexHistoricalData}
                historicalSplits={indexSplits}
                historicalMetadata={indexHistoricalMetadata}
                theme={theme}
                t={t}
                lang={lang}
              />
            )}

            {activeTab === 'dcf' && (
              <DcfView company={selectedCompany} theme={theme} t={t} lang={lang} />
            )}

            {activeTab === 'settings' && (
              <SettingsView theme={theme} setTheme={setTheme} t={t} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
