import { BarChart3 } from 'lucide-react';
import { FilterDropdown } from '../common/FilterDropdown';
import { Metric } from '../common/Metric';
import { type CompanyValuation, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface OverviewViewProps {
  companies: CompanyValuation[];
  onSelectCompany: (id: string) => void;
  scope: string;
  setScope: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  theme: Theme;
  lang: Lang;
  t: TranslationMap;
}

export function OverviewView({
  companies,
  onSelectCompany,
  scope,
  setScope,
  sort,
  setSort,
  theme,
  lang,
  t,
}: OverviewViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.companyValuation}</h2>
        <div className="flex gap-4">
          <FilterDropdown
            label={t.range}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: t.all },
              { value: 'us', label: t.usCompany },
              { value: 'adr', label: t.adr },
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
              { value: 'peHigh', label: t.sortByPeHigh },
            ]}
            theme={theme}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            onClick={() => onSelectCompany(company.id)}
            theme={theme}
            lang={lang}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

interface CompanyCardProps {
  key?: string;
  company: CompanyValuation;
  onClick: () => void;
  theme: Theme;
  lang: Lang;
  t: TranslationMap;
}

function CompanyCard({ company, onClick, theme, lang, t }: CompanyCardProps) {
  const statusColor = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[company.status];

  const statusLabel = {
    Low: t.low,
    Neutral: t.neutral,
    High: t.high,
  }[company.status];

  const oneYearChange =
    company.oneYearPeChange != null
      ? `${company.oneYearPeChange > 0 ? '+' : ''}${company.oneYearPeChange}%`
      : 'N/A';

  const percentileText = company.pePercentile10y != null ? `${company.pePercentile10y}%` : 'N/A';
  const percentileValue = company.pePercentile10y ?? 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group border rounded-2xl p-5 transition-all cursor-pointer relative overflow-hidden',
        theme === 'dark'
          ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-blue-500/30'
          : 'bg-white border-slate-200 hover:shadow-md hover:border-blue-400'
      )}
    >
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
        <BarChart3 size={120} />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={cn('text-lg font-bold leading-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            {lang === 'zh' ? (company.nameZh || company.name) : company.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{company.ticker} · {company.type === 'ADR' ? t.adr : t.usCompany}</p>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', statusColor)}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-3 mb-4 relative z-10">
        <Metric labelKey="marketCap" value={company.marketCap || 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peTtm" value={(company.peTtm != null && company.peTtm !== 0) ? company.peTtm.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peFwd" value={(company.peFwd != null && company.peFwd !== 0) ? company.peFwd.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="pb" value={(company.pb != null && company.pb !== 0) ? company.pb.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="price" value={company.price != null ? `$${company.price.toFixed(2)}` : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric
          labelKey="oneYearPeChange"
          value={oneYearChange}
          color={company.oneYearPeChange != null ? (company.oneYearPeChange > 0 ? 'text-red-400' : 'text-green-400') : undefined}
          theme={theme}
          t={t}
          lang={lang}
        />
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.pePercentile10y}</span>
          <span
            className={cn(
              'text-xs font-bold',
              percentileValue > 80 ? 'text-red-400' : percentileValue < 20 ? 'text-green-400' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700')
            )}
          >
            {percentileText}
          </span>
        </div>
        <div className={cn('h-1.5 rounded-full overflow-hidden', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              percentileValue > 80 ? 'bg-red-500' : percentileValue < 20 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${percentileValue}%` }}
          />
        </div>
      </div>
    </div>
  );
}
