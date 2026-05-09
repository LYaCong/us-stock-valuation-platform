import type React from 'react';
import { type Lang, type Theme } from '../../types';
import { cn } from '../../utils/cn';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  theme: Theme;
  lang: Lang;
}

export function NavButton({ active, onClick, icon, label, theme, lang }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-lg transition-colors duration-200 flex-1 whitespace-nowrap min-w-max',
        lang === 'en' ? 'text-[11px] gap-1 px-2 py-1.5' : 'text-sm gap-1.5 px-3 py-1.5',
        active
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          : theme === 'dark'
            ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
      )}
    >
      {icon}
      <span className="font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
