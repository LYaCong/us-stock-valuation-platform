import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type MouseHandlerDataParam,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { type ApiMetadata, type CompanyValuation, type HistoricalDataPoint, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface DetailsViewProps {
  company: CompanyValuation | null;
  historicalData: HistoricalDataPoint[];
  historicalSplits: any[];
  historicalMetadata?: ApiMetadata;
  theme: Theme;
  onGoToDcf: () => void;
  t: TranslationMap;
  lang: Lang;
}

interface RangePeStats {
  currentPe: number | null;
  currentPercentile: number | null;
  min: number | null;
  max: number | null;
  percentile5y: number | null;
  percentile10y: number | null;
  priceChange: number | null;
}

type DetailChartType = 'pe' | 'price' | 'marketCap';
type DetailTimeRange = 'MAX' | '20Y' | '10Y' | '5Y' | '3Y' | '1Y';

interface LinkedPointLabelProps {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  parentViewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  title: string;
  value: string;
  color: string;
  theme: Theme;
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function computePercentile(value: number | null, values: number[]): number | null {
  if (value == null || values.length === 0) return null;

  const sortedValues = [...values].sort((a, b) => a - b);
  const lastIndex = sortedValues.length - 1;

  if (lastIndex === 0) return value >= sortedValues[0] ? 100 : 0;
  if (value <= sortedValues[0]) return 0;
  if (value >= sortedValues[lastIndex]) return 100;

  const countBelow = sortedValues.filter((item) => item < value).length;
  const countEqual = sortedValues.filter((item) => item === value).length;
  const percentile = countEqual > 1
    ? (countBelow + (countEqual - 1) / 2) / lastIndex * 100
    : countBelow / lastIndex * 100;

  return Number(percentile.toFixed(1));
}

function filterByTimeRange(data: HistoricalDataPoint[], timeRange: DetailTimeRange) {
  if (data.length === 0) return [];

  let monthsToKeep = data.length;
  switch (timeRange) {
    case '1Y': monthsToKeep = 12; break;
    case '3Y': monthsToKeep = 36; break;
    case '5Y': monthsToKeep = 60; break;
    case '10Y': monthsToKeep = 120; break;
    case '20Y': monthsToKeep = 240; break;
    case 'MAX': monthsToKeep = data.length; break;
  }

  return data.slice(-monthsToKeep);
}

function computeRangePeStats(data: HistoricalDataPoint[]): RangePeStats {
  const peValues = data.map((item) => item.peTtm).filter(isValidNumber);
  const latestPePoint = [...data].reverse().find((item) => isValidNumber(item.peTtm));
  const currentPe = latestPePoint?.peTtm ?? null;

  const pricePoints = data.filter((item) => isValidNumber(item.price));
  const firstPrice = pricePoints[0]?.price ?? null;
  const lastPrice = pricePoints[pricePoints.length - 1]?.price ?? null;
  const priceChange = isValidNumber(firstPrice) && isValidNumber(lastPrice) && firstPrice > 0
    ? Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2))
    : null;

  const last5yPeValues = data.slice(-60).map((item) => item.peTtm).filter(isValidNumber);
  const last10yPeValues = data.slice(-120).map((item) => item.peTtm).filter(isValidNumber);

  return {
    currentPe,
    currentPercentile: computePercentile(currentPe, peValues),
    min: peValues.length > 0 ? Math.min(...peValues) : null,
    max: peValues.length > 0 ? Math.max(...peValues) : null,
    percentile5y: computePercentile(currentPe, last5yPeValues),
    percentile10y: computePercentile(currentPe, last10yPeValues),
    priceChange,
  };
}

function LinkedPointLabel({ viewBox, parentViewBox, title, value, color, theme }: LinkedPointLabelProps) {
  if (!viewBox || viewBox.x == null || viewBox.y == null || viewBox.width == null) return null;

  const width = 172;
  const height = 46;
  const centerX = viewBox.x + viewBox.width / 2;
  const minX = parentViewBox?.x ?? 4;
  const maxX = parentViewBox?.width != null ? minX + parentViewBox.width - width : Number.POSITIVE_INFINITY;
  const x = Math.min(Math.max(minX + 4, centerX - width / 2), Math.max(minX + 4, maxX - 4));
  const y = Math.max(4, viewBox.y - height - 10);

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={theme === 'dark' ? '#0f172a' : '#ffffff'}
        stroke={theme === 'dark' ? '#334155' : '#e2e8f0'}
        strokeWidth={1}
        filter="drop-shadow(0 8px 18px rgba(15, 23, 42, 0.18))"
      />
      <text x={x + 10} y={y + 17} fill="#64748b" fontSize={10} fontWeight={600}>
        {title}
      </text>
      <text x={x + 10} y={y + 34} fill={color} fontSize={12} fontWeight={700}>
        {value}
      </text>
    </g>
  );
}

export function DetailsView({
  company,
  historicalData,
  historicalSplits,
  historicalMetadata,
  theme,
  onGoToDcf,
  t,
  lang,
}: DetailsViewProps) {
  const [timeRanges, setTimeRanges] = useState<Record<DetailChartType, DetailTimeRange>>({
    pe: '10Y',
    price: '10Y',
    marketCap: '10Y',
  });
  const [chartType, setChartType] = useState<DetailChartType>('pe');
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const hasPeHistory = historicalMetadata?.availableFields?.includes('peTtm') || historicalData.some((item) => item.peTtm != null);
  const hasPercentileHistory = historicalMetadata?.availableFields?.includes('percentile') || historicalData.some((item) => item.percentile != null);
  const hasMarketCapHistory = historicalMetadata?.availableFields?.includes('marketCap') || historicalData.some((item) => item.marketCap != null);
  const isPeChart = chartType === 'pe';
  const enableLinkedCharts = isPeChart && hasPercentileHistory;

  useEffect(() => {
    if (!hasPeHistory && chartType === 'pe') {
      setChartType('price');
    }
  }, [hasPeHistory, chartType]);

  const availableChartTypes = useMemo(() => {
    const types: Array<'pe' | 'price' | 'marketCap'> = [];
    if (hasPeHistory) types.push('pe');
    types.push('price');
    if (hasMarketCapHistory) types.push('marketCap');
    return types;
  }, [hasMarketCapHistory, hasPeHistory]);

  const filteredData = useMemo(() => {
    return filterByTimeRange(historicalData, timeRanges[chartType]);
  }, [chartType, historicalData, timeRanges]);

  const peRangeData = useMemo(() => filterByTimeRange(historicalData, timeRanges.pe), [historicalData, timeRanges.pe]);

  const chartConfig = useMemo(() => {
    switch (chartType) {
      case 'pe':
        return { key: 'peTtm', label: lang === 'zh' ? '市盈率 (TTM)' : 'P/E (TTM)', color: '#3b82f6', format: (value: number) => value.toFixed(2) };
      case 'price':
        return { key: 'price', label: lang === 'zh' ? '股价' : 'Price', color: '#10b981', format: (value: number) => `$${value.toFixed(2)}` };
      case 'marketCap':
        return {
          key: 'marketCap',
          label: lang === 'zh' ? '市值' : 'Market Cap',
          color: '#f59e0b',
          format: (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(2)}T` : `$${value.toFixed(2)}B`),
        };
    }
  }, [chartType, lang]);

  const rangeStats = useMemo(() => computeRangePeStats(peRangeData), [peRangeData]);

  const fallbackActivePoint = useMemo(() => (
    [...filteredData].reverse().find((item) => item.percentile != null) ?? filteredData[filteredData.length - 1] ?? null
  ), [filteredData]);

  const activeDataPoint = useMemo(() => (
    filteredData.find((item) => item.date === activeDate) ?? fallbackActivePoint
  ), [activeDate, fallbackActivePoint, filteredData]);

  const highlightedDate = activeDataPoint?.date;
  const highlightedPercentile = activeDataPoint?.percentile ?? null;
  const highlightedMainValue = activeDataPoint?.[chartConfig.key as keyof HistoricalDataPoint];
  const highlightedMainNumber = isValidNumber(highlightedMainValue as number | null | undefined) ? highlightedMainValue as number : null;
  const highlightedPercentileNumber = isValidNumber(highlightedPercentile) ? highlightedPercentile : null;
  const canHighlightMainPoint = enableLinkedCharts && highlightedDate != null && highlightedMainNumber != null;
  const canHighlightPercentilePoint = enableLinkedCharts && highlightedDate != null && highlightedPercentileNumber != null;

  useEffect(() => {
    if (activeDate && !filteredData.some((item) => item.date === activeDate)) {
      setActiveDate(null);
    }
  }, [activeDate, filteredData]);

  const handleChartMouseMove = (state: MouseHandlerDataParam) => {
    if (!enableLinkedCharts) return;
    if (typeof state.activeLabel === 'string') {
      setActiveDate(state.activeLabel);
    }
  };

  const handleChartMouseLeave = () => {
    setActiveDate(null);
  };

  if (!company) return null;

  const startDateStr = filteredData.length > 0 ? filteredData[0].date : 'N/A';
  const endDateStr = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : 'N/A';
  const currentTimeRange = timeRanges[chartType];
  const mainLinkedLabel = highlightedDate && highlightedMainNumber != null
    ? `${chartConfig.label}: ${chartConfig.format(highlightedMainNumber)}`
    : '';
  const percentileLinkedLabel = highlightedDate && highlightedPercentileNumber != null
    ? `${lang === 'zh' ? '百分位' : 'Percentile'}: ${highlightedPercentileNumber}%`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.companyValuationTimeSeries}</h2>
          <p className="text-sm text-slate-500">{lang === 'zh' ? company.nameZh : company.name} · {company.ticker} · {startDateStr} ~ {endDateStr}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onGoToDcf}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            )}
          >
            <Calculator size={16} />
            {t.dcf}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn(enableLinkedCharts ? 'lg:col-span-2' : 'lg:col-span-3', 'border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
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
                  {type === 'pe' ? (lang === 'zh' ? '市盈率' : 'P/E') : type === 'price' ? (lang === 'zh' ? '股价' : 'Price') : (lang === 'zh' ? '市值' : 'Mkt Cap')}
                </button>
              ))}
            </div>
            <div className={cn('flex gap-1 p-1 rounded-lg', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
              {['MAX', '20Y', '10Y', '5Y', '3Y', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRanges((prev) => ({ ...prev, [chartType]: range as DetailTimeRange }))}
                  className={cn(
                    'px-3 py-1 rounded text-[10px] font-bold transition-all',
                    range === currentTimeRange
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
              <LineChart
                data={filteredData}
                syncId={enableLinkedCharts ? 'detailsChart' : undefined}
                syncMethod={enableLinkedCharts ? 'index' : undefined}
                onMouseMove={enableLinkedCharts ? handleChartMouseMove : undefined}
                onMouseLeave={enableLinkedCharts ? handleChartMouseLeave : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(value) => value.split('-')[0]} axisLine={false} tickLine={false} minTickGap={60} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                {!enableLinkedCharts && (
                  <Tooltip
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: chartConfig.color }}
                    formatter={(value: number | null) => (value == null ? ['N/A', chartConfig.label] : [chartConfig.format(value), chartConfig.label])}
                  />
                )}
                {chartType === 'marketCap' && historicalSplits.map((split, index) => (
                  <ReferenceLine
                    key={index}
                    x={split.date}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{ value: `Split ${split.label}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 11, fontWeight: 'bold', offset: 10 }}
                  />
                ))}
                {enableLinkedCharts && highlightedDate && (
                  <ReferenceLine x={highlightedDate} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
                )}
                {canHighlightMainPoint && (
                  <ReferenceDot
                    x={highlightedDate}
                    y={highlightedMainNumber}
                    r={5}
                    fill={chartConfig.color}
                    stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                    strokeWidth={2}
                    label={{
                      content: (props: any) => (
                        <LinkedPointLabel
                          {...props}
                          title={highlightedDate ?? ''}
                          value={mainLinkedLabel}
                          color={chartConfig.color}
                          theme={theme}
                        />
                      ),
                    }}
                  />
                )}
                <Line type="monotone" dataKey={chartConfig.key} stroke={chartConfig.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {enableLinkedCharts && (
          <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <h3 className={cn('text-lg font-bold mb-6', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.pePercentileTrend}</h3>
            <div className="h-[300px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  syncId="detailsChart"
                  syncMethod="index"
                  onMouseMove={handleChartMouseMove}
                  onMouseLeave={handleChartMouseLeave}
                >
                  <defs>
                    <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(value) => value.split('-')[0]} axisLine={false} tickLine={false} minTickGap={60} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  {highlightedDate && (
                    <ReferenceLine x={highlightedDate} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  {canHighlightPercentilePoint && (
                    <ReferenceDot
                      x={highlightedDate}
                      y={highlightedPercentileNumber}
                      r={5}
                      fill="#3b82f6"
                      stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                      strokeWidth={2}
                      label={{
                        content: (props: any) => (
                          <LinkedPointLabel
                            {...props}
                            title={highlightedDate ?? ''}
                            value={percentileLinkedLabel}
                            color="#3b82f6"
                            theme={theme}
                          />
                        ),
                      }}
                    />
                  )}
                  <Area type="monotone" dataKey="percentile" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPct)" />
                  <Brush dataKey="date" height={30} stroke="#3b82f6" fill={theme === 'dark' ? '#1e293b' : '#f8fafc'} tickFormatter={(value) => value.split('-')[0]}>
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
                <span className="text-xs font-bold text-blue-400">
                  {highlightedPercentile != null ? `${highlightedPercentile}% · ${highlightedDate}` : 'N/A'}
                </span>
              </div>
              <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-lg transition-all duration-500" style={{ left: `calc(${highlightedPercentile ?? 0}% - 8px)` }} />
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

      {chartType !== 'pe' && (
        <p className="text-xs text-slate-500">{lang === 'zh' ? `下方 PE 指标区间：${timeRanges.pe}` : `PE stats range below: ${timeRanges.pe}`}</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label={t.currentValue} value={rangeStats.currentPe != null ? rangeStats.currentPe.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.percentileCurrentRange} value={rangeStats.currentPercentile != null ? `${rangeStats.currentPercentile}%` : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.rangeMin} value={rangeStats.min != null ? rangeStats.min.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.rangeMax} value={rangeStats.max != null ? rangeStats.max.toFixed(2) : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile5Y} value={rangeStats.percentile5y != null ? `${rangeStats.percentile5y}%` : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.rollingPercentile10Y} value={rangeStats.percentile10y != null ? `${rangeStats.percentile10y}%` : 'N/A'} theme={theme} lang={lang} />
        <StatCard label={t.rangeChange} value={rangeStats.priceChange != null ? `${rangeStats.priceChange > 0 ? '+' : ''}${rangeStats.priceChange.toFixed(2)}%` : 'N/A'} color={rangeStats.priceChange != null ? (rangeStats.priceChange >= 0 ? 'text-red-400' : 'text-green-400') : undefined} theme={theme} lang={lang} />
        <StatCard label={t.percentileAllHistory} value={company.pePercentileAllHistory != null ? `${company.pePercentileAllHistory}%` : 'N/A'} theme={theme} lang={lang} />
      </div>
    </div>
  );
}
