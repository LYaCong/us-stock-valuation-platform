/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  LayoutGrid, 
  ArrowUpDown,
  ChevronDown,
  Info,
  ExternalLink,
  TrendingDown,
  Calculator
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  TOP_COMPANIES, 
  INDICES, 
  generateHistoricalData, 
  type CompanyValuation, 
  type IndexValuation 
} from './data/mockData';
import { fetchQuotes, formatMarketCap, fetchFundamentals, fetchHistorical } from './services/financeService';
import { fetchValuations, fetchIndexValuations } from './services/valuationService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'overview' | 'details' | 'comparison' | 'indices' | 'indexDetails' | 'settings' | 'dcf';
type Theme = 'dark' | 'light';
type Lang = 'zh' | 'en';

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
    fcf: '自由现金流',
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
    oneYearPeChange: '1年 PE 变化',
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
    fcf: 'Free Cash Flow',
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
    oneYearPeChange: '1Y PE Change',
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
    appearance: 'Appearance & Theme',
    themeMode: 'Theme Mode',
    themeDescription: 'Choose your preferred interface appearance',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    percentile: 'Percentile',
    dataRange: 'Data Range',
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('nvda');
  const [selectedIndexId, setSelectedIndexId] = useState('spx');
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Lang>('zh');
  const [companies, setCompanies] = useState<CompanyValuation[]>(TOP_COMPANIES);
  const [indices, setIndices] = useState<IndexValuation[]>(INDICES);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString().split('T')[0]);

  const t = translations[lang];

  useEffect(() => {
    async function loadRealData() {
      setIsLoadingQuotes(true);
      try {
        const tickers = TOP_COMPANIES.map(c => c.ticker);
        const [realCompanies, realIndices] = await Promise.all([
          fetchValuations(tickers),
          fetchIndexValuations(),
        ]);
        setCompanies(realCompanies);
        setIndices(realIndices);
        setLastUpdated(new Date().toISOString().split('T')[0]);
      } catch (error) {
        console.error("Failed to load real data:", error);
      } finally {
        setIsLoadingQuotes(false);
      }
    }
    loadRealData();
  }, []);

  
  // Overview filters
  const [overviewScope, setOverviewScope] = useState('all');
  const [overviewSort, setOverviewSort] = useState('marketCap');

  // Indices filters
  const [indicesGroup, setIndicesGroup] = useState('all');
  const [indicesSort, setIndicesSort] = useState('marketHeat');

  // Comparison selection
  const [comparisonCompanies, setComparisonCompanies] = useState<string[]>(['nvda', 'aapl', 'msft']);

  const filteredCompanies = useMemo(() => {
    let result = companies.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (overviewScope === 'adr') {
      result = result.filter(c => c.type === 'ADR');
    } else if (overviewScope === 'us') {
      result = result.filter(c => c.type === 'US');
    }

    if (overviewSort === 'marketCap') {
      result.sort((a, b) => {
        const parseMarketCap = (mc: string) => {
          const val = parseFloat(mc.replace(/[^0-9.]/g, ''));
          if (mc.includes('T')) return val * 1000;
          if (mc.includes('B')) return val;
          return val;
        };
        return parseMarketCap(b.marketCap) - parseMarketCap(a.marketCap);
      });
    } else if (overviewSort === 'peLow') {
      result.sort((a, b) => a.peTtm - b.peTtm);
    } else if (overviewSort === 'peHigh') {
      result.sort((a, b) => b.peTtm - a.peTtm);
    }

    return result;
  }, [searchQuery, overviewScope, overviewSort]);

  const filteredIndices = useMemo(() => {
    let result = [...INDICES];
    if (indicesGroup === 'core') {
      result = result.filter(i => i.type === 'Core');
    } else if (indicesGroup === 'industry') {
      result = result.filter(i => i.type === 'Sector');
    }

    if (indicesSort === 'peLow') {
      result.sort((a, b) => a.peTtm - b.peTtm);
    } else if (indicesSort === 'peHigh') {
      result.sort((a, b) => b.peTtm - a.peTtm);
    }
    return result;
  }, [indicesGroup, indicesSort]);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || companies[0];
  }, [selectedCompanyId, companies]);

  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [indexHistoricalData, setIndexHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    async function loadHistorical() {
      const data = await fetchHistorical(selectedCompany.ticker);
      setHistoricalData(data);
    }
    loadHistorical();
  }, [selectedCompany]);

  useEffect(() => {
    async function loadIndexHistorical() {
      const selectedIndex = INDICES.find(i => i.id === selectedIndexId) || INDICES[0];
      const data = await fetchHistorical(selectedIndex.ticker);
      setIndexHistoricalData(data);
    }
    loadIndexHistorical();
  }, [selectedIndexId]);

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      theme === 'dark' 
        ? "bg-[#0a0e1a] text-slate-200 selection:bg-blue-500/30 dark" 
        : "bg-slate-50 text-slate-900 selection:bg-blue-500/30"
    )}>
      {/* Header / Navigation */}
      <header className={cn(
        "sticky top-0 z-50 border-b px-6 py-4 backdrop-blur-md transition-colors duration-300 overflow-x-auto scrollbar-hide",
        theme === 'dark' ? "border-white/5 bg-[#0a0e1a]/80" : "border-slate-200 bg-white/80"
      )}>
        <div className="flex items-center justify-between max-w-[1600px] mx-auto flex-nowrap">
          <div className={cn("flex items-center flex-nowrap", lang === 'en' ? "gap-1 md:gap-2" : "gap-2 md:gap-4")}>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent whitespace-nowrap shrink-0">
              US Stock Valuation
            </h1>
            <nav className={cn(
              "flex items-center flex-nowrap p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-hide gap-1", 
              theme === 'dark' ? "bg-white/5" : "bg-slate-100"
            )}>
              <NavButton 
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')}
                icon={<LayoutGrid size={18} />}
                label={t.overview}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'details'} 
                onClick={() => setActiveTab('details')}
                icon={<BarChart3 size={18} />}
                label={t.details}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'comparison'} 
                onClick={() => setActiveTab('comparison')}
                icon={<TrendingUp size={18} />}
                label={t.comparison}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'indices'} 
                onClick={() => setActiveTab('indices')}
                icon={<Info size={18} />}
                label={t.indices}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'indexDetails'} 
                onClick={() => setActiveTab('indexDetails')}
                icon={<BarChart3 size={18} />}
                label={t.indexDetails}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'dcf'} 
                onClick={() => setActiveTab('dcf')}
                icon={<Calculator size={18} />}
                label={t.dcf}
                theme={theme}
                lang={lang}
              />
              <NavButton 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')}
                icon={<Settings size={18} />}
                label={t.settings}
                theme={theme}
                lang={lang}
              />
            </nav>
          </div>
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn("flex items-center p-1 rounded-full", theme === 'dark' ? "bg-white/10" : "bg-slate-200")}>
                <button 
                  onClick={() => setLang('en')}
                  className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-full transition-all", lang === 'en' ? (theme === 'dark' ? "bg-blue-600 text-white" : "bg-white text-blue-600 shadow-sm") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLang('zh')}
                  className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-full transition-all", lang === 'zh' ? (theme === 'dark' ? "bg-blue-600 text-white" : "bg-white text-blue-600 shadow-sm") : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "border rounded-xl pl-8 pr-3 py-1.5 w-32 md:w-48 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all",
                    theme === 'dark' 
                      ? "bg-white/5 border-white/10 placeholder:text-slate-600" 
                      : "bg-white border-slate-200 placeholder:text-slate-400"
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
            index={INDICES.find(i => i.id === selectedIndexId) || INDICES[0]} 
            historicalData={indexHistoricalData} 
            theme={theme}
            t={t}
            lang={lang}
          />
        )}
        {activeTab === 'dcf' && (
          <DcfView company={selectedCompany} theme={theme} t={t} />
        )}
        {activeTab === 'settings' && (
          <SettingsView theme={theme} setTheme={setTheme} t={t} />
        )}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, theme, lang }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, theme: Theme, lang: Lang }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors duration-200 flex-1 whitespace-nowrap min-w-max",
        lang === 'en' 
          ? "text-[11px] gap-1 px-2 py-1.5" 
          : "text-sm gap-1.5 px-3 py-1.5",
        active 
          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
          : theme === 'dark'
            ? "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
      )}
    >
      {icon}
      <span className="font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}

function OverviewView({ 
  companies, 
  onSelectCompany,
  scope,
  setScope,
  sort,
  setSort,
  theme,
  lang,
  t
}: { 
  companies: CompanyValuation[], 
  onSelectCompany: (id: string) => void,
  scope: string,
  setScope: (v: string) => void,
  sort: string,
  setSort: (v: string) => void,
  theme: Theme,
  lang: Lang,
  t: any
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.companyValuation}</h2>
        <div className="flex gap-4">
          <FilterDropdown 
            label={t.range} 
            value={scope} 
            onChange={setScope} 
            options={[
              { value: 'all', label: t.all },
              { value: 'us', label: t.usCompany },
              { value: 'adr', label: t.adr }
            ]} 
            theme={theme} 
          />
          <FilterDropdown 
            label={t.sort} 
            value={sort} 
            onChange={setSort} 
            options={[
              { value: 'marketCap', label: t.sortByMarketCap },
              { value: 'peLow', label: t.sortByPeLow },
              { value: 'peHigh', label: t.sortByPeHigh }
            ]} 
            theme={theme} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {companies.map(company => (
          <CompanyCard key={company.id} company={company} onClick={() => onSelectCompany(company.id)} theme={theme} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options, theme }: { label: string, value: string, onChange: (v: string) => void, options: { value: string, label: string }[], theme: Theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1 relative">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-1">{label}</span>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-4 border rounded-lg px-3 py-2 text-sm transition-colors min-w-[160px]",
          theme === 'dark' 
            ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" 
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        )}
      >
        {selectedOption.label}
        <ChevronDown size={14} className="text-slate-500" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute top-full mt-1 left-0 w-full rounded-lg border shadow-xl z-50 overflow-hidden",
            theme === 'dark' ? "bg-[#1e293b] border-white/10" : "bg-white border-slate-200"
          )}>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  theme === 'dark' 
                    ? "text-slate-300 hover:bg-white/10" 
                    : "text-slate-700 hover:bg-slate-100",
                  value === opt.value && (theme === 'dark' ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600")
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompanyCard({ company, onClick, theme, lang, t }: { company: CompanyValuation, onClick: () => void, theme: Theme, lang: Lang, t: any, key?: string }) {
  const statusColor = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30'
  }[company.status];

  const statusLabel = {
    Low: t.low,
    Neutral: t.neutral,
    High: t.high
  }[company.status];

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group border rounded-2xl p-5 transition-all cursor-pointer relative overflow-hidden",
        theme === 'dark' 
          ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-blue-500/30" 
          : "bg-white border-slate-200 hover:shadow-md hover:border-blue-400"
      )}
    >
      {/* Background Icon Placeholder */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
        <BarChart3 size={120} />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={cn("text-lg font-bold leading-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>{lang === 'zh' ? (company.nameZh || company.name) : company.name}</h3>
          <p className="text-xs text-slate-500 font-medium">{company.ticker} · {company.type === 'ADR' ? t.adr : t.usCompany}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", statusColor)}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-3 mb-4 relative z-10">
        <Metric labelKey="marketCap" value={company.marketCap} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peTtm" value={company.peTtm.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peFwd" value={company.peFwd.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="pb" value={company.pb.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="price" value={company.price ? `$${company.price.toFixed(2)}` : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric 
          labelKey="oneYearPeChange" 
          value={`${company.oneYearPeChange > 0 ? '+' : ''}${company.oneYearPeChange}%`} 
          color={company.oneYearPeChange > 0 ? 'text-red-400' : 'text-green-400'}
          theme={theme}
          t={t}
          lang={lang}
        />
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.pePercentile10y}</span>
          <span className={cn("text-xs font-bold", company.pePercentile10y > 80 ? 'text-red-400' : company.pePercentile10y < 20 ? 'text-green-400' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700'))}>
            {company.pePercentile10y}%
          </span>
        </div>
        <div className={cn("h-1.5 rounded-full overflow-hidden", theme === 'dark' ? "bg-white/5" : "bg-slate-100")}>
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              company.pePercentile10y > 80 ? 'bg-red-500' : company.pePercentile10y < 20 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${company.pePercentile10y}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ labelKey, value, color, theme, t, lang }: { labelKey: string, value: string, color?: string, theme: Theme, t: any, lang: Lang }) {
  const defaultColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-700';
  const label = t[labelKey] || labelKey;
  return (
    <div className="flex flex-col min-w-0">
      <span className={cn(
        "text-slate-500 font-bold uppercase tracking-wider truncate",
        lang === 'en' ? "text-[9px]" : "text-[10px]"
      )} title={label}>
        {label}
      </span>
      <span className={cn("text-xs md:text-sm font-mono font-medium truncate", color || defaultColor)}>{value}</span>
    </div>
  );
}

function DetailsView({ company, historicalData, theme, onGoToDcf, t, lang }: { company: CompanyValuation, historicalData: any[], theme: Theme, onGoToDcf: () => void, t: any, lang: Lang }) {
  const [timeRange, setTimeRange] = useState('10Y');

  const filteredData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];
    
    const now = new Date('2026-03-03');
    let monthsToKeep = historicalData.length;
    
    switch (timeRange) {
      case '1Y': monthsToKeep = 12; break;
      case '3Y': monthsToKeep = 36; break;
      case '5Y': monthsToKeep = 60; break;
      case '10Y': monthsToKeep = 120; break;
      case '20Y': monthsToKeep = 240; break;
      case 'MAX': monthsToKeep = historicalData.length; break;
    }
    
    return historicalData.slice(-monthsToKeep);
  }, [historicalData, timeRange]);

  const startDateStr = filteredData.length > 0 ? filteredData[0].date : '2016-03-03';
  const endDateStr = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : '2026-03-03';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.companyValuationTimeSeries}</h2>
          <p className="text-sm text-slate-500">{lang === 'zh' ? company.nameZh : company.name} · {company.ticker} · {startDateStr} ~ {endDateStr}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onGoToDcf} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", theme === 'dark' ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" : "bg-blue-50 text-blue-600 hover:bg-blue-100")}>
            <Calculator size={16} />
            {t.dcf}
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">{t.refreshChart}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-bold flex items-center gap-2", theme === 'dark' ? "text-white" : "text-slate-900")}>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {t.peTtm}
            </h3>
            <div className={cn("flex gap-1 p-1 rounded-lg", theme === 'dark' ? "bg-white/5" : "bg-slate-100")}>
              {['MAX', '20Y', '10Y', '5Y', '3Y', '1Y'].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold transition-all",
                    range === timeRange 
                      ? "bg-blue-500 text-white" 
                      : theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} syncId="detailsChart" syncMethod="index">
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-')[0]} 
                  axisLine={false}
                  tickLine={false}
                  minTickGap={60}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="peTtm" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Brush dataKey="date" height={1} opacity={0} stroke="none" fill="none" tickFormatter={() => ''} style={{ pointerEvents: 'none' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.percentileTrend}</h3>
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} syncId="detailsChart" syncMethod="index">
                <defs>
                  <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-')[0]} 
                  axisLine={false}
                  tickLine={false}
                  minTickGap={60}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentile" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorPct)" 
                />
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="#3b82f6" 
                  fill={theme === 'dark' ? '#1e293b' : '#f8fafc'}
                  tickFormatter={(val) => val.split('-')[0]}
                >
                  <AreaChart>
                    <Area type="monotone" dataKey="percentile" stroke="#3b82f6" fill="url(#colorPct)" />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.currentPercentilePosition}</span>
              <span className="text-xs font-bold text-blue-400">{company.pePercentile10y}%</span>
            </div>
            <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg transition-all duration-500"
                style={{ left: `calc(${company.pePercentile10y}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
              <span>0% {t.undervalued}</span>
              <span>15%</span>
              <span>50%</span>
              <span>85%</span>
              <span>100% {t.overvalued}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label={t.currentValue} value={company.peTtm.toFixed(2)} theme={theme} lang={lang} />
        <StatCard label={t.percentileCurrentRange} value={`${company.pePercentile10y}%`} theme={theme} lang={lang} />
        <StatCard label={t.percentileAllHistory} value="46.0%" theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile5Y} value="1.6%" theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile10Y} value={`${company.pePercentile10y}%`} theme={theme} lang={lang} />
        <StatCard label={t.rangeChange} value="+21.23%" color="text-red-400" theme={theme} lang={lang} />
        <StatCard label={t.rangeMin} value="16.97" theme={theme} lang={lang} />
        <StatCard label={t.rangeMax} value="246.85" theme={theme} lang={lang} />
      </div>
    </div>
  );
}

function IndexDetailsView({ index, historicalData, theme, t, lang }: { index: IndexValuation, historicalData: any[], theme: Theme, t: any, lang: Lang }) {
  const [timeRange, setTimeRange] = useState('10Y');

  const filteredData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];
    
    const now = new Date('2026-03-03');
    let monthsToKeep = historicalData.length;
    
    switch (timeRange) {
      case '1Y': monthsToKeep = 12; break;
      case '3Y': monthsToKeep = 36; break;
      case '5Y': monthsToKeep = 60; break;
      case '10Y': monthsToKeep = 120; break;
      case '20Y': monthsToKeep = 240; break;
      case 'MAX': monthsToKeep = historicalData.length; break;
    }
    
    return historicalData.slice(-monthsToKeep);
  }, [historicalData, timeRange]);

  const startDateStr = filteredData.length > 0 ? filteredData[0].date : '2016-03-03';
  const endDateStr = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : '2026-03-03';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.indexDetails}</h2>
          <p className="text-sm text-slate-500">{lang === 'zh' ? index.nameZh : index.name} · {index.ticker} · {startDateStr} ~ {endDateStr}</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">{t.refreshChart}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-bold flex items-center gap-2", theme === 'dark' ? "text-white" : "text-slate-900")}>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {t.peTtm}
            </h3>
            <div className={cn("flex gap-1 p-1 rounded-lg", theme === 'dark' ? "bg-white/5" : "bg-slate-100")}>
              {['MAX', '20Y', '10Y', '5Y', '3Y', '1Y'].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold transition-all",
                    range === timeRange 
                      ? "bg-blue-500 text-white" 
                      : theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} syncId="indexDetailsChart" syncMethod="index">
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-')[0]} 
                  axisLine={false}
                  tickLine={false}
                  minTickGap={60}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="peTtm" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Brush dataKey="date" height={1} opacity={0} stroke="none" fill="none" tickFormatter={() => ''} style={{ pointerEvents: 'none' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.percentileTrend}</h3>
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} syncId="indexDetailsChart" syncMethod="index">
                <defs>
                  <linearGradient id="colorPctIdx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-')[0]} 
                  axisLine={false}
                  tickLine={false}
                  minTickGap={60}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentile" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorPctIdx)" 
                />
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="#3b82f6" 
                  fill={theme === 'dark' ? '#1e293b' : '#f8fafc'}
                  tickFormatter={(val) => val.split('-')[0]}
                >
                  <AreaChart>
                    <Area type="monotone" dataKey="percentile" stroke="#3b82f6" fill="url(#colorPctIdx)" />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.currentPercentilePosition}</span>
              <span className="text-xs font-bold text-blue-400">{index.pePercentile}%</span>
            </div>
            <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg transition-all duration-500"
                style={{ left: `calc(${index.pePercentile}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
              <span>0% {t.undervalued}</span>
              <span>15%</span>
              <span>50%</span>
              <span>85%</span>
              <span>100% {t.overvalued}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label={t.currentValue} value={index.peTtm.toFixed(2)} theme={theme} lang={lang} />
        <StatCard label={t.percentileCurrentRange} value={`${index.pePercentile}%`} theme={theme} lang={lang} />
        <StatCard label={t.percentileAllHistory} value="46.0%" theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile5Y} value="1.6%" theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile10Y} value={`${index.pePercentile}%`} theme={theme} lang={lang} />
        <StatCard label={t.rangeChange} value="+21.23%" color="text-red-400" theme={theme} lang={lang} />
        <StatCard label={t.rangeMin} value="16.97" theme={theme} lang={lang} />
        <StatCard label={t.rangeMax} value="246.85" theme={theme} lang={lang} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, theme, lang }: { label: string, value: string, color?: string, theme: Theme, lang?: Lang }) {
  const defaultColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  return (
    <div className={cn(
      "border rounded-xl p-3 transition-colors min-w-0",
      theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200"
    )}>
      <span className={cn(
        "text-slate-500 font-bold uppercase tracking-wider block mb-0.5 truncate",
        lang === 'en' ? "text-[9px]" : "text-[10px]"
      )} title={label}>
        {label}
      </span>
      <span className={cn("text-base md:text-lg font-mono font-bold truncate block", color || defaultColor)}>{value}</span>
    </div>
  );
}

function ComparisonView({ companies, selectedIds, setSelectedIds, theme, t, lang }: { companies: CompanyValuation[], selectedIds: string[], setSelectedIds: (ids: string[]) => void, theme: Theme, t: any, lang: Lang }) {
  const [search, setSearch] = useState('');
  
  const data = useMemo(() => {
    const base = generateHistoricalData(30, 100);
    return base.map((d, i) => {
      const point: any = { ...d };
      selectedIds.forEach(id => {
        const company = companies.find(c => c.id === id);
        if (company) {
          point[id] = company.peTtm * (0.8 + Math.random() * 0.4);
        }
      });
      return point;
    });
  }, [selectedIds, companies]);

  const availableCompanies = companies.filter(c => 
    !selectedIds.includes(c.id) && 
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.ticker.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 5);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.comparison}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder={t.searchComparison}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "border rounded-xl pl-9 pr-4 py-2 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
              theme === 'dark' 
                ? "bg-white/5 border-white/10 placeholder:text-slate-600" 
                : "bg-white border-slate-200 placeholder:text-slate-400"
            )}
          />
          {search && availableCompanies.length > 0 && (
            <div className={cn(
              "absolute top-full mt-2 left-0 w-full rounded-xl border shadow-xl z-50 overflow-hidden",
              theme === 'dark' ? "bg-[#1e293b] border-white/10" : "bg-white border-slate-200"
            )}>
              {availableCompanies.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (selectedIds.length < 5) {
                      setSelectedIds([...selectedIds, c.id]);
                    }
                    setSearch('');
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between",
                    theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{c.ticker}</div>
                    <div className="text-xs text-slate-500">{lang === 'zh' ? c.nameZh : c.name}</div>
                  </div>
                  <div className="text-blue-500 text-xs font-medium">{t.add}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={t.compareCompanies} value={`${selectedIds.length} ${t.companiesCount}`} theme={theme} lang={lang} />
        <StatCard label={t.alignPeriod} value="2016-03-03 ~ 2026-03-03" theme={theme} lang={lang} />
        <StatCard label={t.medianPercentile} value="12.5%" theme={theme} lang={lang} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.peComparison}</h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36}/>
                {selectedIds.map((id, index) => {
                  const company = companies.find(c => c.id === id);
                  return company ? (
                    <Line key={id} type="monotone" dataKey={id} name={lang === 'zh' ? company.nameZh : company.name} stroke={colors[index % colors.length]} strokeWidth={2} dot={false} />
                  ) : null;
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.currentCrossSection}</h3>
          <div className="space-y-4">
            {selectedIds.map((id, index) => {
              const company = companies.find(c => c.id === id);
              if (!company) return null;
              return (
                <ComparisonRow 
                  key={id}
                  name={lang === 'zh' ? company.nameZh : company.name} 
                  value={company.peTtm.toFixed(2)} 
                  pct={`${company.pePercentile10y}%`} 
                  status={company.status === 'Low' ? t.low : company.status === 'High' ? t.high : t.neutral} 
                  color={colors[index % colors.length]} 
                  theme={theme} 
                  onRemove={() => setSelectedIds(selectedIds.filter(sid => sid !== id))}
                />
              );
            })}
            {selectedIds.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                {t.emptyComparison}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ name, value, pct, status, color, theme, onRemove }: { name: string, value: string, pct: string, status: string, color: string, theme: Theme, onRemove: () => void, key?: string }) {
  return (
    <div className={cn("flex items-center justify-between p-3 rounded-xl transition-colors group", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")}>
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn("font-mono", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{value}</span>
        <span className="font-mono text-green-400 w-12 text-right">{pct}</span>
        <span className="text-xs text-slate-500 w-8 text-right">{status}</span>
        <button 
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

function SettingsView({ theme, setTheme, t }: { theme: Theme, setTheme: (theme: Theme) => void, t: any }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.settings}</h2>
      
      <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
        <h3 className={cn("text-lg font-bold mb-4", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.appearance}</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <div className={cn("font-medium", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{t.themeMode}</div>
            <div className="text-sm text-slate-500">{t.themeDescription}</div>
          </div>
          
          <div className={cn("flex p-1 rounded-xl", theme === 'dark' ? "bg-white/5" : "bg-slate-100")}>
            <button 
              onClick={() => setTheme('light')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                theme === 'light' 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t.lightMode}
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                theme === 'dark' 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t.darkMode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexView({ 
  indices,
  group,
  setGroup,
  sort,
  setSort,
  theme,
  onSelectIndex,
  t,
  lang
}: { 
  indices: IndexValuation[],
  group: string,
  setGroup: (v: string) => void,
  sort: string,
  setSort: (v: string) => void,
  theme: Theme,
  onSelectIndex: (id: string) => void,
  t: any,
  lang: Lang
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.indexValuation}</h2>
        <div className="flex gap-4">
          <FilterDropdown 
            label={t.group} 
            value={group} 
            onChange={setGroup} 
            options={[
              { value: 'all', label: t.all },
              { value: 'core', label: t.core },
              { value: 'industry', label: t.industry }
            ]} 
            theme={theme} 
          />
          <FilterDropdown 
            label={t.sort} 
            value={sort} 
            onChange={setSort} 
            options={[
              { value: 'marketHeat', label: t.marketHeat },
              { value: 'peLow', label: t.sortByPeLow },
              { value: 'peHigh', label: t.sortByPeHigh }
            ]} 
            theme={theme} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {indices.map(index => (
          <IndexCard key={index.id} index={index} theme={theme} onClick={() => onSelectIndex(index.id)} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

function IndexCard({ index, theme, onClick, lang, t }: { index: IndexValuation, theme: Theme, onClick: () => void, lang: Lang, t: any, key?: string }) {
  const statusColor = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30'
  }[index.status];

  const statusLabel = {
    Low: t.low,
    Neutral: t.neutral,
    High: t.high
  }[index.status];

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group border rounded-2xl p-5 transition-all cursor-pointer relative overflow-hidden",
        theme === 'dark' 
          ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-blue-500/30" 
          : "bg-white border-slate-200 hover:shadow-md hover:border-blue-400"
      )}
    >
      {/* Background Icon Placeholder */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <span className="text-8xl font-black">{index.ticker}</span>
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={cn("text-lg font-bold leading-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>{lang === 'zh' ? (index.nameZh || index.name) : index.name}</h3>
          <p className="text-xs text-slate-500 font-medium">{index.ticker} · {index.type === 'Core' ? t.core : t.industry}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", statusColor)}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-3 mb-4 relative z-10">
        <Metric labelKey="peTtm" value={index.peTtm.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peFwd" value={index.peFwd.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="pb" value={index.pb.toFixed(2)} theme={theme} t={t} lang={lang} />
        <Metric labelKey="price" value={index.price ? `$${index.price.toFixed(2)}` : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric 
          labelKey="oneYearPeChange" 
          value={`${index.oneYearPeChange > 0 ? '+' : ''}${index.oneYearPeChange}%`} 
          color={index.oneYearPeChange > 0 ? 'text-red-400' : 'text-green-400'}
          theme={theme}
          t={t}
          lang={lang}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.percentile}</span>
          <span className="text-xs font-bold text-blue-400">{index.pePercentile}%</span>
        </div>
        <div className={cn("h-1.5 rounded-full overflow-hidden", theme === 'dark' ? "bg-white/5" : "bg-slate-100")}>
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${index.pePercentile}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DcfView({ company, theme, t }: { company: CompanyValuation, theme: Theme, t: any }) {
  const [realData, setRealData] = useState<{
    price: number;
    sharesB: number;
    initialFcf: number;
    netDebtB: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadFundamentals() {
      setIsLoading(true);
      try {
        const fundamentals = await fetchFundamentals(company.ticker);
        if (fundamentals) {
          const price = fundamentals.financialData?.currentPrice?.raw || company.price || 150;
          const shares = fundamentals.defaultKeyStatistics?.sharesOutstanding?.raw || 0;
          const sharesB = shares / 1e9;
          
          const operatingCashflow = fundamentals.financialData?.operatingCashflow?.raw || 0;
          const capitalExpenditures = fundamentals.financialData?.capitalExpenditures?.raw || 0;
          // FCF = Operating Cash Flow + Capital Expenditures (CapEx is usually negative in Yahoo)
          let fcf = operatingCashflow + capitalExpenditures;
          if (fcf <= 0) {
            // Fallback if FCF is negative or missing
            const netIncome = fundamentals.financialData?.netIncomeToCommon?.raw || 0;
            fcf = netIncome > 0 ? netIncome * 1.1 : 10e9; // Fallback
          }
          const initialFcf = fcf / 1e9;

          const totalDebt = fundamentals.financialData?.totalDebt?.raw || 0;
          const totalCash = fundamentals.financialData?.totalCash?.raw || 0;
          const netDebtB = (totalDebt - totalCash) / 1e9;

          setRealData({ price, sharesB, initialFcf, netDebtB });
        }
      } catch (error) {
        console.error("Failed to load fundamentals:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFundamentals();
  }, [company.ticker, company.price]);

  const parseMarketCap = (mc: string) => {
    const val = parseFloat(mc.replace(/[^0-9.]/g, ''));
    if (mc.includes('T')) return val * 1000;
    if (mc.includes('B')) return val;
    if (mc.includes('M')) return val / 1000;
    return val;
  };

  const mcB = parseMarketCap(company.marketCap);
  
  // Use real data if available, otherwise fallback to estimates
  const currentPrice = realData?.price || company.price || 150.00;
  const sharesB = realData?.sharesB || (mcB / currentPrice); 
  const netIncomeB = mcB / company.peTtm;
  const initialFcf = realData?.initialFcf || (netIncomeB * 1.1);
  const netDebtB = realData?.netDebtB || (mcB * 0.02);

  const [g1, setG1] = useState(15);
  const [g2, setG2] = useState(10);
  const [wacc, setWacc] = useState(10);
  const [tg, setTg] = useState(2.5);

  const fcfs = [];
  let currentFcf = initialFcf;
  let pvSum = 0;
  
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? g1 / 100 : g2 / 100;
    currentFcf = currentFcf * (1 + g);
    const pv = currentFcf / Math.pow(1 + wacc / 100, i);
    pvSum += pv;
    fcfs.push({
      year: `${i}`,
      fcf: currentFcf,
      pv: pv
    });
  }

  const terminalValue = (fcfs[9].fcf * (1 + tg / 100)) / (wacc / 100 - tg / 100);
  const pvTv = terminalValue / Math.pow(1 + wacc / 100, 10);
  
  const enterpriseValue = pvSum + pvTv;
  const equityValue = enterpriseValue - netDebtB;
  const impliedPrice = equityValue / sharesB;
  const marginOfSafety = ((impliedPrice - currentPrice) / impliedPrice) * 100;

  const chartData = fcfs.map(f => ({
    name: f.year,
    [t.fcf]: parseFloat(f.fcf.toFixed(2)),
    [t.pvOfFcf]: parseFloat(f.pv.toFixed(2))
  }));
  chartData.push({
    name: 'TV',
    [t.fcf]: parseFloat(terminalValue.toFixed(2)),
    [t.pvOfFcf]: parseFloat(pvTv.toFixed(2))
  });

  const waccSteps = [-2, -1, 0, 1, 2].map(s => wacc + s);
  const tgSteps = [-1, -0.5, 0, 0.5, 1].map(s => tg + s);

  const calcPrice = (w: number, t: number) => {
    let cf = initialFcf;
    let pvs = 0;
    let lastCf = 0;
    for (let i = 1; i <= 10; i++) {
      const g = i <= 5 ? g1 / 100 : g2 / 100;
      cf = cf * (1 + g);
      pvs += cf / Math.pow(1 + w / 100, i);
      if (i === 10) lastCf = cf;
    }
    const tv = (lastCf * (1 + t / 100)) / (w / 100 - t / 100);
    const ptv = tv / Math.pow(1 + w / 100, 10);
    const ev = pvs + ptv;
    const eq = ev - netDebtB;
    return eq / sharesB;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.dcfModel}</h2>
          <p className="text-sm text-slate-500">
            {company.name} · {company.ticker} {isLoading && <span className="ml-2 text-blue-500 animate-pulse">({t.loadingRealData})</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className={cn("border rounded-2xl p-6 space-y-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.coreAssumptions}</h3>
          
          <div className="space-y-4">
            <DcfSlider label={t.growth1to5} value={g1} setValue={setG1} min={-20} max={50} step={1} unit="%" theme={theme} />
            <DcfSlider label={t.growth6to10} value={g2} setValue={setG2} min={-20} max={50} step={1} unit="%" theme={theme} />
            <DcfSlider label={t.wacc} value={wacc} setValue={setWacc} min={5} max={20} step={0.5} unit="%" theme={theme} />
            <DcfSlider label={t.terminalGrowth} value={tg} setValue={setTg} min={0} max={5} step={0.1} unit="%" theme={theme} />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t.baseFcf}</span>
              <span className={cn("font-mono font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>${initialFcf.toFixed(2)}B</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t.totalShares}</span>
              <span className={cn("font-mono font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{sharesB.toFixed(2)}B</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t.netDebt}</span>
              <span className={cn("font-mono font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>${netDebtB.toFixed(2)}B</span>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
              <div className="text-sm text-slate-500 mb-2">{t.currentPrice}</div>
              <div className={cn("text-3xl font-mono font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>${currentPrice.toFixed(2)}</div>
            </div>
            <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5 border-blue-500/30" : "bg-blue-50 border-blue-200")}>
              <div className="text-sm text-blue-500 mb-2">{t.impliedPrice}</div>
              <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400">${impliedPrice.toFixed(2)}</div>
            </div>
            <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
              <div className="text-sm text-slate-500 mb-2">{t.marginOfSafety}</div>
              <div className={cn("text-3xl font-mono font-bold", marginOfSafety > 0 ? "text-green-500" : "text-red-500")}>
                {marginOfSafety > 0 ? '+' : ''}{marginOfSafety.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className={cn("border rounded-2xl p-6", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
            <h3 className={cn("text-lg font-bold mb-6", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.futureFcf}</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff05" : "#e2e8f0"} vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey={t.fcf} fill={theme === 'dark' ? "#334155" : "#cbd5e1"} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t.pvOfFcf} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={cn("border rounded-2xl p-6 overflow-x-auto", theme === 'dark' ? "bg-white/[0.03] border-white/5" : "bg-white border-slate-200")}>
            <h3 className={cn("text-lg font-bold mb-4", theme === 'dark' ? "text-white" : "text-slate-900")}>{t.sensitivityAnalysis}</h3>
            <table className="w-full text-sm text-center">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 font-medium border-b border-r border-slate-200 dark:border-white/10">{t.waccVsTg}</th>
                  {tgSteps.map(t => (
                    <th key={t} className="p-2 text-slate-500 font-medium border-b border-slate-200 dark:border-white/10">{t.toFixed(1)}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waccSteps.map(w => (
                  <tr key={w}>
                    <td className="p-2 text-slate-500 font-medium border-r border-slate-200 dark:border-white/10">{w.toFixed(1)}%</td>
                    {tgSteps.map(t => {
                      const p = calcPrice(w, t);
                      const isBase = w === wacc && t === tg;
                      return (
                        <td key={t} className={cn(
                          "p-2 font-mono",
                          isBase ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : (theme === 'dark' ? "text-slate-300" : "text-slate-700")
                        )}>
                          ${p.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DcfSlider({ label, value, setValue, min, max, step, unit, theme }: { label: string, value: number, setValue: (v: number) => void, min: number, max: number, step: number, unit: string, theme: Theme }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className={cn("text-sm font-medium", theme === 'dark' ? "text-slate-300" : "text-slate-700")}>{label}</label>
        <span className="text-sm font-mono font-bold text-blue-500">{value}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}
