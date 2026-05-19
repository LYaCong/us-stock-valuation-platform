import { type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface MetricProps {
  key?: string;
  labelKey: string;
  value: string;
  color?: string;
  theme: Theme;
  t: TranslationMap;
  lang: Lang;
}

export function Metric({ labelKey, value, color, theme, t, lang }: MetricProps) {
  const defaultColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-700';
  const label = t[labelKey] || labelKey;

  return (
    <div className="flex flex-col min-w-0">
      <span
        className={cn(
          'text-slate-500 font-bold uppercase tracking-wider truncate',
          lang === 'en' ? 'text-[9px]' : 'text-[10px]'
        )}
        title={label}
      >
        {label}
      </span>
      <span className={cn('text-xs md:text-sm font-mono font-medium truncate', color || defaultColor)}>{value}</span>
    </div>
  );
}
