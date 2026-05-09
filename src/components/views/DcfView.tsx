import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchFundamentals } from '../../services/financeService';
import {
  calculateDcf,
  calculateSensitivityMatrix,
  type DcfInputs,
  type DcfValidationCode,
} from '../../utils/dcfCalculator';
import { type CompanyValuation, type Lang, type Theme, type TranslationMap } from '../../types';
import { cn } from '../../utils/cn';

interface DcfViewProps {
  company: CompanyValuation | null;
  theme: Theme;
  t: TranslationMap;
  lang: Lang;
}

type DcfFieldSource = 'real' | 'estimated' | 'missing';

interface DcfFieldState {
  label: string;
  value: number | null;
  source: DcfFieldSource;
}

function mapIssueCodeToMessage(code: DcfValidationCode, t: TranslationMap) {
  const messageMap: Record<DcfValidationCode, string> = {
    MISSING_CURRENT_PRICE: t.dcfMissingCurrentPrice,
    MISSING_SHARES: t.dcfMissingShares,
    MISSING_FCF: t.dcfMissingFcf,
    INVALID_WACC: t.dcfInvalidWacc,
    INVALID_TERMINAL_GROWTH: t.dcfInvalidTerminalGrowth,
    TERMINAL_GROWTH_GTE_WACC: t.dcfTerminalGrowthTooHigh,
  };

  return messageMap[code];
}

function formatFieldValue(value: number | null, kind: 'currency' | 'shares' | 'price') {
  if (value == null) return 'N/A';
  if (kind === 'price') return `$${value.toFixed(2)}`;
  if (kind === 'shares') return `${value.toFixed(2)}B`;
  return `$${value.toFixed(2)}B`;
}

export function DcfView({ company, theme, t, lang }: DcfViewProps) {
  const [realData, setRealData] = useState<{
    price: number | null;
    sharesB: number | null;
    initialFcf: number | null;
    netDebtB: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [g1, setG1] = useState(15);
  const [g2, setG2] = useState(10);
  const [wacc, setWacc] = useState(10);
  const [tg, setTg] = useState(2.5);

  useEffect(() => {
    if (!company) return;

    let cancelled = false;

    async function loadFundamentals() {
      setIsLoading(true);
      try {
        const fundamentals = await fetchFundamentals(company.ticker);
        if (!fundamentals || cancelled) return;

        const price = fundamentals.financialData?.currentPrice?.raw ?? company.price ?? null;
        const sharesRaw = fundamentals.defaultKeyStatistics?.sharesOutstanding?.raw ?? null;
        const sharesB = sharesRaw != null && sharesRaw > 0 ? sharesRaw / 1e9 : null;

        const operatingCashflow = fundamentals.financialData?.operatingCashflow?.raw ?? null;
        const capitalExpenditures = fundamentals.financialData?.capitalExpenditures?.raw ?? null;
        let initialFcf: number | null = null;
        if (operatingCashflow != null && capitalExpenditures != null) {
          const rawFcf = operatingCashflow + capitalExpenditures;
          if (rawFcf > 0) {
            initialFcf = rawFcf / 1e9;
          }
        }

        if (initialFcf == null) {
          const netIncome = fundamentals.financialData?.netIncomeToCommon?.raw ?? null;
          if (netIncome != null && netIncome > 0) {
            initialFcf = (netIncome * 1.1) / 1e9;
          }
        }

        const totalDebt = fundamentals.financialData?.totalDebt?.raw ?? null;
        const totalCash = fundamentals.financialData?.totalCash?.raw ?? null;
        const netDebtB =
          totalDebt != null && totalCash != null
            ? (totalDebt - totalCash) / 1e9
            : null;

        setRealData({ price, sharesB, initialFcf, netDebtB });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load fundamentals:', error);
          setRealData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFundamentals();

    return () => {
      cancelled = true;
    };
  }, [company]);

  const marketCapB = useMemo(() => {
    if (!company?.marketCap) return null;
    const raw = parseFloat(company.marketCap.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(raw)) return null;
    if (company.marketCap.includes('T')) return raw * 1000;
    if (company.marketCap.includes('B')) return raw;
    if (company.marketCap.includes('M')) return raw / 1000;
    return raw;
  }, [company]);

  const fieldStates = useMemo(() => {
    const currentPrice: DcfFieldState =
      realData?.price != null && realData.price > 0
        ? { label: t.dcfFieldPrice, value: realData.price, source: 'real' }
        : company?.price != null && company.price > 0
          ? { label: t.dcfFieldPrice, value: company.price, source: 'estimated' }
          : { label: t.dcfFieldPrice, value: null, source: 'missing' };

    const sharesB: DcfFieldState =
      realData?.sharesB != null && realData.sharesB > 0
        ? { label: t.dcfFieldShares, value: realData.sharesB, source: 'real' }
        : marketCapB != null && currentPrice.value != null && currentPrice.value > 0
          ? { label: t.dcfFieldShares, value: marketCapB / currentPrice.value, source: 'estimated' }
          : { label: t.dcfFieldShares, value: null, source: 'missing' };

    const initialFcf: DcfFieldState =
      realData?.initialFcf != null && realData.initialFcf > 0
        ? { label: t.dcfFieldFcf, value: realData.initialFcf, source: 'real' }
        : marketCapB != null && company?.peTtm != null && company.peTtm > 0
          ? { label: t.dcfFieldFcf, value: (marketCapB / company.peTtm) * 1.1, source: 'estimated' }
          : { label: t.dcfFieldFcf, value: null, source: 'missing' };

    const netDebtB: DcfFieldState =
      realData?.netDebtB != null
        ? { label: t.dcfFieldNetDebt, value: realData.netDebtB, source: 'real' }
        : marketCapB != null
          ? { label: t.dcfFieldNetDebt, value: marketCapB * 0.02, source: 'estimated' }
          : { label: t.dcfFieldNetDebt, value: null, source: 'missing' };

    return {
      currentPrice,
      sharesB,
      initialFcf,
      netDebtB,
    };
  }, [company?.peTtm, company?.price, marketCapB, realData, t.dcfFieldFcf, t.dcfFieldNetDebt, t.dcfFieldPrice, t.dcfFieldShares]);

  const dcfInputs = useMemo<DcfInputs>(() => ({
    currentPrice: fieldStates.currentPrice.value,
    sharesB: fieldStates.sharesB.value,
    initialFcf: fieldStates.initialFcf.value,
    netDebtB: fieldStates.netDebtB.value,
    growth1to5: g1,
    growth6to10: g2,
    wacc,
    terminalGrowth: tg,
  }), [fieldStates, g1, g2, tg, wacc]);

  const calculation = useMemo(() => calculateDcf(dcfInputs), [dcfInputs]);
  const blockingIssues = calculation.issues.filter((issue) => issue.severity === 'error');
  const warningIssues = calculation.issues.filter((issue) => issue.severity === 'warning');

  const dataFields = Object.values(fieldStates) as DcfFieldState[];
  const estimatedFields = dataFields.filter((field) => field.source === 'estimated');
  const waccSteps = useMemo(() => [-2, -1, 0, 1, 2].map((step) => wacc + step), [wacc]);
  const tgSteps = useMemo(() => [-1, -0.5, 0, 0.5, 1].map((step) => tg + step), [tg]);

  const sensitivityMatrix = useMemo(() => {
    if (!calculation.result) return [];
    return calculateSensitivityMatrix(dcfInputs, waccSteps, tgSteps);
  }, [calculation.result, dcfInputs, tgSteps, waccSteps]);

  const chartData = useMemo(() => {
    if (!calculation.result) return [];
    const data = calculation.result.projections.map((item) => ({
      name: item.year,
      [t.fcf]: parseFloat(item.fcf.toFixed(2)),
      [t.pvOfFcf]: parseFloat(item.pv.toFixed(2)),
    }));
    data.push({
      name: 'TV',
      [t.fcf]: parseFloat(calculation.result.terminalValue.toFixed(2)),
      [t.pvOfFcf]: parseFloat(calculation.result.pvTerminalValue.toFixed(2)),
    });
    return data;
  }, [calculation.result, t.fcf, t.pvOfFcf]);

  if (!company) {
    return (
      <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700')}>
        {t.dcfCannotCalculate}
      </div>
    );
  }

  const currentPriceText = formatFieldValue(fieldStates.currentPrice.value, 'price');
  const impliedPriceText = calculation.result ? `$${calculation.result.impliedPrice.toFixed(2)}` : 'N/A';
  const marginOfSafetyText =
    calculation.result?.marginOfSafety != null
      ? `${calculation.result.marginOfSafety > 0 ? '+' : ''}${calculation.result.marginOfSafety.toFixed(1)}%`
      : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.dcfModel}</h2>
          <p className="text-sm text-slate-500">
            {lang === 'zh' ? (company.nameZh || company.name) : company.name} · {company.ticker}
            {isLoading && <span className="ml-2 text-blue-500 animate-pulse">({t.loadingRealData})</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn('border rounded-2xl p-6 space-y-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <div className="space-y-4">
            <h3 className={cn('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.coreAssumptions}</h3>
            <div className="space-y-4">
              <DcfSlider label={t.growth1to5} value={g1} setValue={setG1} min={-20} max={50} step={1} unit="%" theme={theme} />
              <DcfSlider label={t.growth6to10} value={g2} setValue={setG2} min={-20} max={50} step={1} unit="%" theme={theme} />
              <DcfSlider label={t.wacc} value={wacc} setValue={setWacc} min={5} max={20} step={0.5} unit="%" theme={theme} />
              <DcfSlider label={t.terminalGrowth} value={tg} setValue={setTg} min={0} max={5} step={0.1} unit="%" theme={theme} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
            <FieldRow label={fieldStates.initialFcf.label} value={formatFieldValue(fieldStates.initialFcf.value, 'currency')} source={fieldStates.initialFcf.source} theme={theme} lang={lang} />
            <FieldRow label={fieldStates.sharesB.label} value={formatFieldValue(fieldStates.sharesB.value, 'shares')} source={fieldStates.sharesB.source} theme={theme} lang={lang} />
            <FieldRow label={fieldStates.netDebtB.label} value={formatFieldValue(fieldStates.netDebtB.value, 'currency')} source={fieldStates.netDebtB.source} theme={theme} lang={lang} />
            <FieldRow label={fieldStates.currentPrice.label} value={formatFieldValue(fieldStates.currentPrice.value, 'price')} source={fieldStates.currentPrice.source} theme={theme} lang={lang} />
          </div>

          <div className="space-y-3">
            <StatusPanel
              title={t.dcfDataQuality}
              items={
                estimatedFields.length > 0
                  ? [t.dcfUsingEstimatedData, ...estimatedFields.map((field) => field.label)]
                  : [t.dcfDataReady]
              }
              tone={estimatedFields.length > 0 ? 'warning' : 'success'}
              theme={theme}
            />

            {warningIssues.length > 0 && (
              <StatusPanel
                title={t.dcfWarnings}
                items={warningIssues.map((issue) => mapIssueCodeToMessage(issue.code, t))}
                tone="warning"
                theme={theme}
              />
            )}

            {blockingIssues.length > 0 && (
              <StatusPanel
                title={t.dcfValidationErrors}
                items={blockingIssues.map((issue) => mapIssueCodeToMessage(issue.code, t))}
                tone="error"
                theme={theme}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
              <div className="text-sm text-slate-500 mb-2">{t.currentPrice}</div>
              <div className={cn('text-3xl font-mono font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{currentPriceText}</div>
            </div>
            <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5 border-blue-500/30' : 'bg-blue-50 border-blue-200')}>
              <div className="text-sm text-blue-500 mb-2">{t.impliedPrice}</div>
              <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400">{impliedPriceText}</div>
            </div>
            <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
              <div className="text-sm text-slate-500 mb-2">{t.marginOfSafety}</div>
              <div className={cn(
                'text-3xl font-mono font-bold',
                marginOfSafetyText === 'N/A' ? (theme === 'dark' ? 'text-slate-400' : 'text-slate-500') : (calculation.result?.marginOfSafety ?? 0) > 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {marginOfSafetyText}
              </div>
            </div>
          </div>

          <div className={cn('border rounded-2xl p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <h3 className={cn('text-lg font-bold mb-6', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.futureFcf}</h3>
            {calculation.result ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff05' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: theme === 'dark' ? 'none' : '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey={t.fcf} fill={theme === 'dark' ? '#334155' : '#cbd5e1'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={t.pvOfFcf} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-sm text-slate-500">{t.dcfProjectionUnavailable}</div>
            )}
          </div>

          <div className={cn('border rounded-2xl p-6 overflow-x-auto', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <h3 className={cn('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.sensitivityAnalysis}</h3>
            {calculation.result ? (
              <table className="w-full text-sm text-center">
                <thead>
                  <tr>
                    <th className="p-2 text-slate-500 font-medium border-b border-r border-slate-200 dark:border-white/10">{t.waccVsTg}</th>
                    {tgSteps.map((step) => (
                      <th key={step} className="p-2 text-slate-500 font-medium border-b border-slate-200 dark:border-white/10">{step.toFixed(1)}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {waccSteps.map((step, rowIndex) => (
                    <tr key={step}>
                      <td className="p-2 text-slate-500 font-medium border-r border-slate-200 dark:border-white/10">{step.toFixed(1)}%</td>
                      {tgSteps.map((growthStep, columnIndex) => {
                        const price = sensitivityMatrix[rowIndex]?.[columnIndex] ?? null;
                        const isBase = step === wacc && growthStep === tg;
                        return (
                          <td
                            key={growthStep}
                            className={cn(
                              'p-2 font-mono',
                              isBase ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700')
                            )}
                          >
                            {price != null ? `$${price.toFixed(2)}` : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-slate-500">{t.dcfSensitivityUnavailable}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: string;
  source: DcfFieldSource;
  theme: Theme;
  lang: Lang;
}

function FieldRow({ label, value, source, theme, lang }: FieldRowProps) {
  const sourceText = source === 'real'
    ? (lang === 'zh' ? '真实' : 'REAL')
    : source === 'estimated'
      ? (lang === 'zh' ? '估算' : 'EST')
      : (lang === 'zh' ? '缺失' : 'MISS');
  const sourceTone = source === 'real'
    ? 'text-emerald-500 bg-emerald-500/10'
    : source === 'estimated'
      ? 'text-amber-500 bg-amber-500/10'
      : 'text-red-500 bg-red-500/10';

  return (
    <div className="flex justify-between items-center gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('font-mono font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>{value}</span>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', sourceTone)}>{sourceText}</span>
      </div>
    </div>
  );
}

interface StatusPanelProps {
  title: string;
  items: string[];
  tone: 'success' | 'warning' | 'error';
  theme: Theme;
}

function StatusPanel({ title, items, tone, theme }: StatusPanelProps) {
  const toneClass = {
    success: theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: theme === 'dark' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700',
    error: theme === 'dark' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={cn('border rounded-xl p-4 space-y-2', toneClass)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="space-y-1 text-xs">
        {items.map((item, index) => (
          <div key={`${title}-${index}`}>{item}</div>
        ))}
      </div>
    </div>
  );
}

interface DcfSliderProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  theme: Theme;
}

function DcfSlider({ label, value, setValue, min, max, step, unit, theme }: DcfSliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>{label}</label>
        <span className="text-sm font-mono font-bold text-blue-500">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => setValue(parseFloat(event.target.value))}
        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}
