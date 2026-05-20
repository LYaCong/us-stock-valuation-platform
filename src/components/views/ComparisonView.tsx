import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { useComparisonHistory, type ComparisonMetricKey, type ComparisonTimeRange } from '../../hooks/useComparisonHistory';
import { type CompanyValuation, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface ComparisonViewProps {
  companies: CompanyValuation[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  theme: Theme;
  t: TranslationMap;
  lang: Lang;
}

function formatComparisonMetricValue(value: number | null | undefined, metric: ComparisonMetricKey): string {
  if (value == null) return 'N/A';
  if (metric === 'marketCap') return `${value.toFixed(2)}B`;
  if (metric === 'price') return `$${value.toFixed(2)}`;
  return value.toFixed(2);
}

function formatDateRangeLabel(dates: string[]): string {
  if (dates.length === 0) return 'N/A';
  return `${dates[0]} ~ ${dates[dates.length - 1]}`;
}

function formatXAxisDate(value: string): string {
  const [year, month] = value.split('-');
  return month === '01' ? year : `${year}-${month}`;
}

export function ComparisonView({ companies, selectedIds, setSelectedIds, theme, t, lang }: ComparisonViewProps) {
  const [search, setSearch] = useState('');
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetricKey>('peTtm');
  const [comparisonRange, setComparisonRange] = useState<ComparisonTimeRange>('10Y');

  const selectedCompanies = useMemo(() => (
    selectedIds
      .map((id) => companies.find((company) => company.id === id))
      .filter((company): company is CompanyValuation => company != null)
  ), [companies, selectedIds]);

  const { isLoadingHistory, comparisonData } = useComparisonHistory(selectedCompanies, t, comparisonMetric, comparisonRange);

  const availableCompanies = companies
    .filter((company) => !selectedIds.includes(company.id) && (company.name.toLowerCase().includes(search.toLowerCase()) || company.ticker.toLowerCase().includes(search.toLowerCase())))
    .slice(0, 5);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const canAddCompany = selectedIds.length < 5;

  return (
    <div className="space-y-6">
      <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.comparison}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={t.compareCompanies} value={`${selectedIds.length} ${t.companiesCount}`} theme={theme} lang={lang} />
        <StatCard label={t.alignPeriod} value={formatDateRangeLabel(comparisonData.overlapDates)} theme={theme} lang={lang} />
        <div className={cn('relative rounded-2xl border p-4 shadow-sm transition-all z-30', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <div className="text-xs font-medium text-slate-500 mb-2">{lang === 'zh' ? '添加对比公司' : 'Add Company'}</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder={canAddCompany ? t.searchComparison : (lang === 'zh' ? '最多添加 5 家公司' : 'Up to 5 companies')}
              value={search}
              disabled={!canAddCompany}
              onChange={(event) => setSearch(event.target.value)}
              className={cn(
                'border rounded-xl pl-9 pr-4 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:cursor-not-allowed disabled:opacity-60',
                theme === 'dark' ? 'bg-white/5 border-white/10 placeholder:text-slate-600' : 'bg-white border-slate-200 placeholder:text-slate-400'
              )}
            />
            {search && canAddCompany && availableCompanies.length > 0 && (
              <div className={cn('absolute top-full mt-2 left-0 right-0 rounded-xl border shadow-xl z-50 overflow-hidden', theme === 'dark' ? 'bg-[#1e293b] border-white/10' : 'bg-white border-slate-200')}>
                {availableCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedIds([...selectedIds, company.id]);
                      setSearch('');
                    }}
                    className={cn('w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between', theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50')}
                  >
                    <div>
                      <div className={cn('font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{company.ticker}</div>
                      <div className="text-xs text-slate-500">{lang === 'zh' ? company.nameZh : company.name}</div>
                    </div>
                    <div className="text-blue-500 text-xs font-medium">{t.add}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className={cn('lg:col-span-3 xl:col-span-3 border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className={cn('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{comparisonData.metricLabel}</h3>
              <p className="mt-1 text-xs text-slate-500">{t.realHistoryMode}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className={cn('flex gap-1 p-1 rounded-lg', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
                {[
                  { key: 'peTtm' as const, label: lang === 'zh' ? '市盈率' : 'P/E' },
                  { key: 'price' as const, label: lang === 'zh' ? '股价' : 'Price' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setComparisonMetric(item.key)}
                    className={cn(
                      'px-3 py-1.5 rounded text-[10px] font-bold transition-all',
                      comparisonMetric === item.key
                        ? 'bg-blue-500 text-white'
                        : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={cn('flex gap-1 p-1 rounded-lg', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
                {(['MAX', '20Y', '10Y', '5Y', '3Y', '1Y'] as ComparisonTimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setComparisonRange(range)}
                    className={cn(
                      'px-3 py-1 rounded text-[10px] font-bold transition-all',
                      comparisonRange === range
                        ? 'bg-blue-500 text-white'
                        : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-[500px]">
            {isLoadingHistory ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">{t.loadingComparisonHistory}</div>
            ) : comparisonData.rows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">{t.noComparisonHistory}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={formatXAxisDate} axisLine={false} tickLine={false} minTickGap={52} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => formatComparisonMetricValue(typeof value === 'number' ? value : null, comparisonData.metric)}
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {selectedCompanies.map((company, index) => (
                    <Line
                      key={company.id}
                      type="monotone"
                      dataKey={company.id}
                      name={lang === 'zh' ? company.nameZh : company.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={cn('lg:col-span-3 xl:col-span-1 border rounded-2xl p-4', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <h3 className={cn('text-lg font-bold mb-6', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.currentCrossSection}</h3>
          <div className="space-y-4">
            {selectedCompanies.map((company, index) => (
              <ComparisonRow
                key={company.id}
                name={lang === 'zh' ? company.nameZh : company.name}
                value={formatComparisonMetricValue(comparisonMetric === 'price' ? company.price : company.peTtm, comparisonMetric)}
                pct={company.pePercentile10y != null ? `${company.pePercentile10y}%` : 'N/A'}
                status={company.status === 'Low' ? t.low : company.status === 'High' ? t.high : t.neutral}
                color={colors[index % colors.length]}
                theme={theme}
                onRemove={() => setSelectedIds(selectedIds.filter((id) => id !== company.id))}
              />
            ))}
            {selectedIds.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">{t.emptyComparison}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  key?: string;
  name: string;
  value: string;
  pct: string;
  status: string;
  color: string;
  theme: Theme;
  onRemove: () => void;
}

function ComparisonRow({ name, value, pct, status, color, theme, onRemove }: ComparisonRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 p-2 rounded-lg transition-colors group', theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50')}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className={cn('truncate text-sm font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn('font-mono text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>{value}</span>
        <span className="w-12 text-right font-mono text-xs text-green-400">{pct}</span>
        <span className="w-8 text-right text-xs text-slate-500">{status}</span>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
