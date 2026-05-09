import { type Lang, type Theme } from '../../types';
import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  theme: Theme;
  lang?: Lang;
}

export function StatCard({ label, value, color, theme, lang }: StatCardProps) {
  const defaultColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div
      className={cn(
        'border rounded-xl p-3 transition-colors min-w-0',
        theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200'
      )}
    >
      <span
        className={cn(
          'text-slate-500 font-bold uppercase tracking-wider block mb-0.5 truncate',
          lang === 'en' ? 'text-[9px]' : 'text-[10px]'
        )}
        title={label}
      >
        {label}
      </span>
      <span className={cn('text-base md:text-lg font-mono font-bold truncate block', color || defaultColor)}>{value}</span>
    </div>
  );
}
