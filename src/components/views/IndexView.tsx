import { FilterDropdown } from '../common/FilterDropdown';
import { Metric } from '../common/Metric';
import { type IndexValuation, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface IndexViewProps {
  indices: IndexValuation[];
  group: string;
  setGroup: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  theme: Theme;
  onSelectIndex: (id: string) => void;
  t: TranslationMap;
  lang: Lang;
}

export function IndexView({ indices, group, setGroup, sort, setSort, theme, onSelectIndex, t, lang }: IndexViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.indexValuation}</h2>
        <div className="flex gap-4">
          <FilterDropdown
            label={t.group}
            value={group}
            onChange={setGroup}
            options={[
              { value: 'all', label: t.all },
              { value: 'core', label: t.core },
              { value: 'industry', label: t.industry },
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
              { value: 'peHigh', label: t.sortByPeHigh },
            ]}
            theme={theme}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {indices.map((index) => (
          <IndexCard key={index.id} index={index} theme={theme} onClick={() => onSelectIndex(index.id)} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

interface IndexCardProps {
  key?: string;
  index: IndexValuation;
  theme: Theme;
  onClick: () => void;
  lang: Lang;
  t: TranslationMap;
}

function IndexCard({ index, theme, onClick, lang, t }: IndexCardProps) {
  const statusColor = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[index.status];

  const statusLabel = {
    Low: t.low,
    Neutral: t.neutral,
    High: t.high,
  }[index.status];

  const oneYearChange =
    index.oneYearPeChange != null
      ? `${index.oneYearPeChange > 0 ? '+' : ''}${index.oneYearPeChange}%`
      : 'N/A';

  const percentileText = index.pePercentile != null ? `${index.pePercentile}%` : 'N/A';
  const percentileValue = index.pePercentile ?? 0;

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
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <span className="text-8xl font-black">{index.ticker}</span>
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={cn('text-lg font-bold leading-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
            {lang === 'zh' ? (index.nameZh || index.name) : index.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{index.ticker} · {index.type === 'Core' ? t.core : t.industry}</p>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', statusColor)}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-3 mb-4 relative z-10">
        <Metric labelKey="peTtm" value={(index.peTtm != null && index.peTtm !== 0) ? index.peTtm.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="peFwd" value={(index.peFwd != null && index.peFwd !== 0) ? index.peFwd.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="pb" value={(index.pb != null && index.pb !== 0) ? index.pb.toFixed(2) : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric labelKey="price" value={index.price != null ? `$${index.price.toFixed(2)}` : 'N/A'} theme={theme} t={t} lang={lang} />
        <Metric
          labelKey="oneYearPeChange"
          value={oneYearChange}
          color={index.oneYearPeChange != null ? (index.oneYearPeChange > 0 ? 'text-red-400' : 'text-green-400') : undefined}
          theme={theme}
          t={t}
          lang={lang}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.percentile}</span>
          <span className="text-xs font-bold text-blue-400">{percentileText}</span>
        </div>
        <div className={cn('h-1.5 rounded-full overflow-hidden', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${percentileValue}%` }} />
        </div>
      </div>
    </div>
  );
}
