import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { type ApiMetadata, type HistoricalDataPoint, type IndexValuation, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface IndexDetailsViewProps {
  index: IndexValuation | null;
  historicalData: HistoricalDataPoint[];
  historicalSplits: any[];
  historicalMetadata?: ApiMetadata;
  theme: Theme;
  t: TranslationMap;
  lang: Lang;
}

export function IndexDetailsView({
  index,
  historicalData,
  historicalMetadata,
  theme,
  t,
  lang,
}: IndexDetailsViewProps) {
  const [timeRange, setTimeRange] = useState('10Y');
  const [chartType, setChartType] = useState<'pe' | 'price'>('pe');

  const hasPeHistory = historicalMetadata?.availableFields?.includes('peTtm') || historicalData.some((item) => item.peTtm != null);
  const hasPercentileHistory = historicalMetadata?.availableFields?.includes('percentile') || historicalData.some((item) => item.percentile != null);

  useEffect(() => {
    if (!hasPeHistory && chartType === 'pe') {
      setChartType('price');
    }
  }, [chartType, hasPeHistory]);

  const availableChartTypes = useMemo(() => {
    const types: Array<'pe' | 'price'> = [];
    if (hasPeHistory) types.push('pe');
    types.push('price');
    return types;
  }, [hasPeHistory]);

  const filteredData = useMemo(() => {
    if (historicalData.length === 0) return [];

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

  const chartConfig = useMemo(() => {
    switch (chartType) {
      case 'pe':
        return { key: 'peTtm', label: lang === 'zh' ? '市盈率 (TTM)' : 'P/E (TTM)', color: '#3b82f6', format: (value: number) => value.toFixed(2) };
      case 'price':
        return { key: 'price', label: lang === 'zh' ? '指数价格' : 'Index Price', color: '#10b981', format: (value: number) => `$${value.toFixed(2)}` };
    }
  }, [chartType, lang]);

  if (!index) return null;

  const startDateStr = filteredData.length > 0 ? filteredData[0].date : 'N/A';
  const endDateStr = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : 'N/A';
  const formatPercent = (value: number) => `${(value > 1 ? value : value * 100).toFixed(2)}%`;
  const formatAum = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.indexDetails}</h2>
          <p className="text-sm text-slate-500">{lang === 'zh' ? index.nameZh : index.name} · {index.ticker} · {startDateStr} ~ {endDateStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn(hasPercentileHistory ? 'lg:col-span-2' : 'lg:col-span-3', 'border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {availableChartTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    type === chartType
                      ? 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                  )}
                >
                  {type === 'pe' ? (lang === 'zh' ? '市盈率' : 'P/E') : (lang === 'zh' ? '价格' : 'Price')}
                </button>
              ))}
            </div>
            <div className={cn('flex gap-1 p-1 rounded-lg', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
              {['MAX', '20Y', '10Y', '5Y', '3Y', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1 rounded text-[10px] font-bold transition-all',
                    range === timeRange
                      ? 'bg-blue-500 text-white'
                      : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
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
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(value) => value.split('-')[0]} axisLine={false} tickLine={false} minTickGap={60} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: chartConfig.color }}
                  formatter={(value: number) => [chartConfig.format(value), chartConfig.label]}
                />
                <Line type="monotone" dataKey={chartConfig.key} stroke={chartConfig.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {hasPercentileHistory && (
          <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <h3 className={cn('text-lg font-bold mb-6', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.percentileTrend}</h3>
            <div className="h-[300px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} syncId="indexDetailsChart" syncMethod="index">
                  <defs>
                    <linearGradient id="colorPctIdx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(value) => value.split('-')[0]} axisLine={false} tickLine={false} minTickGap={60} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="percentile" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPctIdx)" />
                  <Brush dataKey="date" height={30} stroke="#3b82f6" fill={theme === 'dark' ? '#1e293b' : '#f8fafc'} tickFormatter={(value) => value.split('-')[0]}>
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
                <span className="text-xs font-bold text-blue-400">{index.pePercentile != null ? `${index.pePercentile}%` : 'N/A'}</span>
              </div>
              <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg transition-all duration-500" style={{ left: `calc(${index.pePercentile ?? 0}% - 8px)` }} />
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
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label={t.currentValue} value={(index.peTtm != null && index.peTtm !== 0) ? index.peTtm.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.percentileCurrentRange} value={index.pePercentile != null ? `${index.pePercentile}%` : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.peFwd} value={(index.peFwd != null && index.peFwd !== 0) ? index.peFwd.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.pb} value={(index.pb != null && index.pb !== 0) ? index.pb.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.dividendYield} value={index.dividendYield != null ? formatPercent(index.dividendYield) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.expenseRatio} value={index.expenseRatio != null ? formatPercent(index.expenseRatio) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.assetsUnderManagement} value={index.assetsUnderManagement != null ? formatAum(index.assetsUnderManagement) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.price} value={index.price != null ? `$${index.price.toFixed(2)}` : 'N/A'} theme={theme} lang={lang} />
      </div>
    </div>
  );
}
