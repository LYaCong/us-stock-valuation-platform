import { type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface SettingsViewProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: TranslationMap;
}

export function SettingsView({ theme, setTheme, t }: SettingsViewProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.settings}</h2>

      <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
        <h3 className={cn('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.appearance}</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className={cn('font-medium', theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}>{t.themeMode}</div>
            <div className="text-sm text-slate-500">{t.themeDescription}</div>
          </div>

          <div className={cn('flex p-1 rounded-xl', theme === 'dark' ? 'bg-white/5' : 'bg-slate-100')}>
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t.lightMode}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                theme === 'dark' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
