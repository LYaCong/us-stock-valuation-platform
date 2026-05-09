import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type FilterOption, type Theme } from '../../types';
import { cn } from '../../utils/cn';

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  theme: Theme;
}

export function FilterDropdown({ label, value, onChange, options, theme }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1 relative">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-1">{label}</span>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-4 border rounded-lg px-3 py-2 text-sm transition-colors min-w-[160px]',
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        )}
      >
        {selectedOption.label}
        <ChevronDown size={14} className="text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'absolute top-full mt-1 left-0 w-full rounded-lg border shadow-xl z-50 overflow-hidden',
              theme === 'dark' ? 'bg-[#1e293b] border-white/10' : 'bg-white border-slate-200'
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  theme === 'dark'
                    ? 'text-slate-300 hover:bg-white/10'
                    : 'text-slate-700 hover:bg-slate-100',
                  value === option.value && (theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
