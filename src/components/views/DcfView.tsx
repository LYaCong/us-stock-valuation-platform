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
import { CheckCircle2, HelpCircle, Save, SlidersHorizontal } from 'lucide-react';
import { fetchFundamentals, saveDcfAssumptions, type DcfAssumption } from '../../services/financeService';
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

type DcfFieldSource = 'real' | 'missing';

interface DcfFieldState {
  label: string;
  value: number | null;
  source: DcfFieldSource;
  help: string;
}

interface DcfRealData {
  price: number | null;
  sharesB: number | null;
  initialFcfB: number | null;
  netDebtB: number | null;
  fiscalYear: number | null;
  filedDate: string | null;
  accessionNumber: string | null;
  coverageStatus: string | null;
  missingFields: string[];
}

const FALLBACK_ASSUMPTIONS: DcfAssumption = {
  growth1to5: 15,
  growth6to10: 10,
  wacc: 10,
  terminalGrowth: 2.5,
};

const copy = {
  zh: {
    pageSubtitle: '基于真实财报自由现金流的绝对估值模型',
    loading: '加载真实财报数据中...',
    real: '真实',
    missing: '缺失',
    noSecData: '尚未导入 SEC DCF 数据。请先让 OpenClaw 执行 SEC 脚本。',
    dataReady: '真实财报输入已就绪',
    dataMissing: '缺少关键财报输入，DCF 暂停计算',
    savedCompany: '已保存为该公司默认假设',
    unsavedCompany: '有未保存的公司假设',
    saveCompany: '保存为该公司默认假设',
    saveFailed: '保存失败：当前环境可能不允许写项目文件',
    globalDefault: '使用全局默认假设',
    projectDefault: '使用该公司项目默认假设',
    beginnerTitle: '小白计算顺序',
    beginnerStep1: '1. 先看数据质量：FCF、总股本、净债务必须来自真实财报。',
    beginnerStep2: '2. 再调增长率：1-5 年看业务高增长，6-10 年要逐步保守。',
    beginnerStep3: '3. 最后看安全边际：内在价值高于股价越多，容错空间越大。',
    presets: '情景假设',
    conservative: '保守',
    base: '基准',
    optimistic: '乐观',
    formulaTitle: '公式拆解',
    formulaEmpty: '补齐真实 FCF 和总股本后，这里会显示每股内在价值怎么算出来。',
    fcfChart: '1-10 年现金流折现',
    terminalContribution: '终值贡献',
    sourceTitle: '财报来源',
    sourceEmpty: '暂无 SEC 来源信息',
    fiscalYear: '财年',
    filedDate: '提交日期',
    accession: 'SEC 编号',
    terminalNote: '终值是第 10 年之后所有现金流的合计现值，通常占 DCF 很大比例，所以单独展示。',
    help: {
      growth1to5: '你对公司未来 1-5 年自由现金流增长的判断。越高越乐观。',
      growth6to10: '第 6-10 年通常要比前 5 年更保守，因为高速增长很难长期持续。',
      wacc: '折现率，也可以理解为你要求的最低回报率。越高，估值越低。',
      terminalGrowth: '第 10 年之后的长期稳定增长率，通常不应高于长期经济增速，也必须低于 WACC。',
      fcf: '自由现金流 = 经营现金流 - 资本开支，是 DCF 的起点。',
      shares: '总股本用于把公司整体价值除成每股价值。',
      netDebt: '净债务 = 总债务 - 现金。净债务越高，股权价值越低；如果为负，说明现金多于债务。',
      price: '当前股价用于计算安全边际，不影响内在价值本身。',
      impliedPrice: '模型算出来的每股内在价值，不是市场报价。',
      margin: '安全边际 = 内在价值相对当前股价的折价空间。',
      sensitivity: '同时改变 WACC 和永续增长率，观察内在价值对关键假设有多敏感。',
      terminal: '第 10 年之后所有未来现金流的合计价值。',
    },
  },
  en: {
    pageSubtitle: 'Absolute valuation using real filing-based free cash flow',
    loading: 'Loading real filing data...',
    real: 'Real',
    missing: 'Missing',
    noSecData: 'SEC DCF data has not been imported yet. Run the SEC script with OpenClaw first.',
    dataReady: 'Real filing inputs are ready',
    dataMissing: 'Key filing inputs are missing, so DCF is paused',
    savedCompany: 'Saved as this company default',
    unsavedCompany: 'Unsaved company assumptions',
    saveCompany: 'Save as company default',
    saveFailed: 'Save failed: this environment may not allow project-file writes',
    globalDefault: 'Using global default assumptions',
    projectDefault: 'Using company project defaults',
    beginnerTitle: 'Beginner Flow',
    beginnerStep1: '1. Check data quality first: FCF, shares, and net debt must come from filings.',
    beginnerStep2: '2. Tune growth next: years 1-5 can reflect momentum, years 6-10 should fade.',
    beginnerStep3: '3. Read margin of safety last: more upside means more room for error.',
    presets: 'Scenarios',
    conservative: 'Conservative',
    base: 'Base',
    optimistic: 'Optimistic',
    formulaTitle: 'Formula Breakdown',
    formulaEmpty: 'Once real FCF and shares are available, this explains the implied price calculation.',
    fcfChart: 'Years 1-10 Discounted Cash Flow',
    terminalContribution: 'Terminal Contribution',
    sourceTitle: 'Filing Source',
    sourceEmpty: 'No SEC source yet',
    fiscalYear: 'Fiscal year',
    filedDate: 'Filed',
    accession: 'SEC accession',
    terminalNote: 'Terminal value is the present value of cash flows after year 10. It is often a large part of DCF, so it is shown separately.',
    help: {
      growth1to5: 'Your view of free-cash-flow growth for the next 1-5 years. Higher means more optimistic.',
      growth6to10: 'Years 6-10 should usually be more conservative because high growth rarely lasts forever.',
      wacc: 'The discount rate, similar to your required return. Higher WACC lowers valuation.',
      terminalGrowth: 'Long-run steady growth after year 10. It must stay below WACC.',
      fcf: 'Free cash flow = operating cash flow - capital expenditures. This is the DCF starting point.',
      shares: 'Shares outstanding converts whole-company value into per-share value.',
      netDebt: 'Net debt = total debt - cash. More debt lowers equity value; negative net debt means net cash.',
      price: 'Current price is used for margin of safety, not for intrinsic value itself.',
      impliedPrice: 'The model-implied intrinsic value per share, not a market quote.',
      margin: 'Margin of safety compares intrinsic value with the current price.',
      sensitivity: 'Shows how implied price changes when WACC and terminal growth move together.',
      terminal: 'The value of all cash flows after year 10.',
    },
  },
};

function helpText(lang: Lang, key: keyof typeof copy.en.help) {
  return copy[lang].help[key];
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

function numberFromRaw(raw: any) {
  const value = raw?.raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAssumptions(value: any): DcfAssumption {
  return {
    growth1to5: Number.isFinite(value?.growth1to5) ? value.growth1to5 : FALLBACK_ASSUMPTIONS.growth1to5,
    growth6to10: Number.isFinite(value?.growth6to10) ? value.growth6to10 : FALLBACK_ASSUMPTIONS.growth6to10,
    wacc: Number.isFinite(value?.wacc) ? value.wacc : FALLBACK_ASSUMPTIONS.wacc,
    terminalGrowth: Number.isFinite(value?.terminalGrowth) ? value.terminalGrowth : FALLBACK_ASSUMPTIONS.terminalGrowth,
    updatedAt: value?.updatedAt,
    note: value?.note,
  };
}

export function DcfView({ company, theme, t, lang }: DcfViewProps) {
  const ui = copy[lang];
  const [realData, setRealData] = useState<DcfRealData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assumptionSource, setAssumptionSource] = useState<'company' | 'global'>('global');
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'failed'>('saved');
  const [g1, setG1] = useState(FALLBACK_ASSUMPTIONS.growth1to5);
  const [g2, setG2] = useState(FALLBACK_ASSUMPTIONS.growth6to10);
  const [wacc, setWacc] = useState(FALLBACK_ASSUMPTIONS.wacc);
  const [tg, setTg] = useState(FALLBACK_ASSUMPTIONS.terminalGrowth);

  useEffect(() => {
    if (!company) return;

    let cancelled = false;

    async function loadFundamentals() {
      setIsLoading(true);
      setRealData(null);
      setSaveState('saved');
      try {
        const fundamentals = await fetchFundamentals(company.ticker);
        if (!fundamentals || cancelled) return;

        const assumptions = fundamentals.dcfAssumptions?.company
          ? normalizeAssumptions(fundamentals.dcfAssumptions.company)
          : normalizeAssumptions(fundamentals.dcfAssumptions?.defaults);
        setAssumptionSource(fundamentals.dcfAssumptions?.company ? 'company' : 'global');
        setG1(assumptions.growth1to5);
        setG2(assumptions.growth6to10);
        setWacc(assumptions.wacc);
        setTg(assumptions.terminalGrowth);

        const price = numberFromRaw(fundamentals.financialData?.currentPrice) ?? company.price ?? null;
        const sharesRaw = numberFromRaw(fundamentals.defaultKeyStatistics?.sharesOutstanding);
        const fcfRaw = numberFromRaw(fundamentals.financialData?.freeCashFlow);
        const netDebtRaw = numberFromRaw(fundamentals.financialData?.netDebt);
        const source = fundamentals.dcfSource || null;

        setRealData({
          price,
          sharesB: sharesRaw != null && sharesRaw > 0 ? sharesRaw / 1e9 : null,
          initialFcfB: fcfRaw != null && fcfRaw > 0 ? fcfRaw / 1e9 : null,
          netDebtB: netDebtRaw != null ? netDebtRaw / 1e9 : null,
          fiscalYear: source?.fiscalYear ?? null,
          filedDate: source?.filedDate ?? null,
          accessionNumber: source?.accessionNumber ?? null,
          coverageStatus: source?.coverageStatus ?? null,
          missingFields: Array.isArray(source?.missingFields) ? source.missingFields : [],
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load DCF fundamentals:', error);
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

  function updateAssumption(setter: (value: number) => void, value: number) {
    setter(value);
    setSaveState('dirty');
  }

  function applyPreset(kind: 'conservative' | 'base' | 'optimistic') {
    const preset = {
      conservative: { growth1to5: 6, growth6to10: 3, wacc: 11, terminalGrowth: 2 },
      base: { growth1to5: 10, growth6to10: 5, wacc: 10, terminalGrowth: 2.5 },
      optimistic: { growth1to5: 15, growth6to10: 8, wacc: 9, terminalGrowth: 3 },
    }[kind];
    setG1(preset.growth1to5);
    setG2(preset.growth6to10);
    setWacc(preset.wacc);
    setTg(preset.terminalGrowth);
    setSaveState('dirty');
  }

  async function saveCompanyAssumptions() {
    if (!company) return;
    setSaveState('saving');
    const saved = await saveDcfAssumptions(company.ticker, {
      growth1to5: g1,
      growth6to10: g2,
      wacc,
      terminalGrowth: tg,
      note: 'Saved from DCF model page',
    });
    if (saved) {
      setAssumptionSource('company');
      setSaveState('saved');
    } else {
      setSaveState('failed');
    }
  }

  const fieldStates = useMemo(() => {
    const currentPrice: DcfFieldState =
      realData?.price != null && realData.price > 0
        ? { label: t.dcfFieldPrice, value: realData.price, source: 'real', help: helpText(lang, 'price') }
        : { label: t.dcfFieldPrice, value: null, source: 'missing', help: helpText(lang, 'price') };

    const sharesB: DcfFieldState =
      realData?.sharesB != null && realData.sharesB > 0
        ? { label: t.dcfFieldShares, value: realData.sharesB, source: 'real', help: helpText(lang, 'shares') }
        : { label: t.dcfFieldShares, value: null, source: 'missing', help: helpText(lang, 'shares') };

    const initialFcf: DcfFieldState =
      realData?.initialFcfB != null && realData.initialFcfB > 0
        ? { label: t.dcfFieldFcf, value: realData.initialFcfB, source: 'real', help: helpText(lang, 'fcf') }
        : { label: t.dcfFieldFcf, value: null, source: 'missing', help: helpText(lang, 'fcf') };

    const netDebtB: DcfFieldState =
      realData?.netDebtB != null
        ? { label: t.dcfFieldNetDebt, value: realData.netDebtB, source: 'real', help: helpText(lang, 'netDebt') }
        : { label: t.dcfFieldNetDebt, value: null, source: 'missing', help: helpText(lang, 'netDebt') };

    return {
      currentPrice,
      sharesB,
      initialFcf,
      netDebtB,
    };
  }, [lang, realData, t.dcfFieldFcf, t.dcfFieldNetDebt, t.dcfFieldPrice, t.dcfFieldShares]);

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
  const missingFields = dataFields.filter((field) => field.source === 'missing');
  const waccSteps = useMemo(() => [-2, -1, 0, 1, 2].map((step) => wacc + step), [wacc]);
  const tgSteps = useMemo(() => [-1, -0.5, 0, 0.5, 1].map((step) => tg + step), [tg]);

  const sensitivityMatrix = useMemo(() => {
    if (!calculation.result) return [];
    return calculateSensitivityMatrix(dcfInputs, waccSteps, tgSteps);
  }, [calculation.result, dcfInputs, tgSteps, waccSteps]);

  const chartData = useMemo(() => {
    if (!calculation.result) return [];
    return calculation.result.projections.map((item) => ({
      name: item.year,
      [t.fcf]: parseFloat(item.fcf.toFixed(2)),
      [t.pvOfFcf]: parseFloat(item.pv.toFixed(2)),
    }));
  }, [calculation.result, t.fcf, t.pvOfFcf]);

  if (!company) {
    return (
      <div className={cn('border rounded-lg p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700')}>
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
  const sourceItems = [
    realData?.fiscalYear ? `${ui.fiscalYear}: ${realData.fiscalYear}` : null,
    realData?.filedDate ? `${ui.filedDate}: ${realData.filedDate}` : null,
    realData?.accessionNumber ? `${ui.accession}: ${realData.accessionNumber}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.dcfModel}</h2>
          <p className="text-sm text-slate-500">
            {lang === 'zh' ? (company.nameZh || company.name) : company.name} / {company.ticker} - {ui.pageSubtitle}
            {isLoading && <span className="ml-2 text-blue-500 animate-pulse">({ui.loading})</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
            assumptionSource === 'company'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
          )}>
            <SlidersHorizontal size={14} />
            {assumptionSource === 'company' ? ui.projectDefault : ui.globalDefault}
          </span>
          <button
            type="button"
            onClick={saveCompanyAssumptions}
            disabled={saveState === 'saving'}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              theme === 'dark'
                ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {saveState === 'saved' ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saveState === 'saving' ? 'Saving...' : ui.saveCompany}
          </button>
        </div>
      </div>

      {saveState === 'dirty' && <InlineNotice text={ui.unsavedCompany} tone="warning" theme={theme} />}
      {saveState === 'saved' && assumptionSource === 'company' && <InlineNotice text={ui.savedCompany} tone="success" theme={theme} />}
      {saveState === 'failed' && <InlineNotice text={ui.saveFailed} tone="error" theme={theme} />}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className={cn('border rounded-lg p-6 space-y-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
          <div className="space-y-4">
            <h3 className={cn('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{t.coreAssumptions}</h3>
            <div className="grid grid-cols-3 gap-2">
              <PresetButton label={ui.conservative} onClick={() => applyPreset('conservative')} theme={theme} />
              <PresetButton label={ui.base} onClick={() => applyPreset('base')} theme={theme} />
              <PresetButton label={ui.optimistic} onClick={() => applyPreset('optimistic')} theme={theme} />
            </div>
            <div className="space-y-4">
              <DcfSlider label={t.growth1to5} help={helpText(lang, 'growth1to5')} value={g1} setValue={(value) => updateAssumption(setG1, value)} min={-20} max={50} step={1} unit="%" theme={theme} />
              <DcfSlider label={t.growth6to10} help={helpText(lang, 'growth6to10')} value={g2} setValue={(value) => updateAssumption(setG2, value)} min={-20} max={50} step={1} unit="%" theme={theme} />
              <DcfSlider label={t.wacc} help={helpText(lang, 'wacc')} value={wacc} setValue={(value) => updateAssumption(setWacc, value)} min={5} max={20} step={0.5} unit="%" theme={theme} />
              <DcfSlider label={t.terminalGrowth} help={helpText(lang, 'terminalGrowth')} value={tg} setValue={(value) => updateAssumption(setTg, value)} min={0} max={5} step={0.1} unit="%" theme={theme} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
            <FieldRow field={fieldStates.initialFcf} value={formatFieldValue(fieldStates.initialFcf.value, 'currency')} theme={theme} lang={lang} />
            <FieldRow field={fieldStates.sharesB} value={formatFieldValue(fieldStates.sharesB.value, 'shares')} theme={theme} lang={lang} />
            <FieldRow field={fieldStates.netDebtB} value={formatFieldValue(fieldStates.netDebtB.value, 'currency')} theme={theme} lang={lang} />
            <FieldRow field={fieldStates.currentPrice} value={formatFieldValue(fieldStates.currentPrice.value, 'price')} theme={theme} lang={lang} />
          </div>

          <div className="space-y-3">
            <StatusPanel
              title={t.dcfDataQuality}
              items={
                realData == null
                  ? [ui.noSecData]
                  : missingFields.length > 0
                    ? [ui.dataMissing, ...missingFields.map((field) => field.label), ...realData.missingFields.slice(0, 3)]
                    : [ui.dataReady]
              }
              tone={missingFields.length > 0 || realData == null ? 'warning' : 'success'}
              theme={theme}
            />

            <StatusPanel
              title={ui.sourceTitle}
              items={sourceItems.length > 0 ? sourceItems : [ui.sourceEmpty]}
              tone="neutral"
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

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label={t.currentPrice} help={helpText(lang, 'price')} value={currentPriceText} theme={theme} />
            <MetricCard label={t.impliedPrice} help={helpText(lang, 'impliedPrice')} value={impliedPriceText} theme={theme} featured />
            <MetricCard label={t.marginOfSafety} help={helpText(lang, 'margin')} value={marginOfSafetyText} theme={theme} tone={(calculation.result?.marginOfSafety ?? 0) >= 0 ? 'positive' : 'negative'} />
          </div>

          <div className={cn('border rounded-lg p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <h3 className={cn('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{ui.beginnerTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-300">
              <StepBox text={ui.beginnerStep1} theme={theme} />
              <StepBox text={ui.beginnerStep2} theme={theme} />
              <StepBox text={ui.beginnerStep3} theme={theme} />
            </div>
          </div>

          <div className={cn('border rounded-lg p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <HeaderWithHelp label={ui.formulaTitle} help={helpText(lang, 'impliedPrice')} theme={theme} />
            {calculation.result ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                <FormulaItem label={t.enterpriseValue} value={formatFieldValue(calculation.result.enterpriseValue, 'currency')} theme={theme} />
                <FormulaItem label={t.dcfFieldNetDebt} value={formatFieldValue(fieldStates.netDebtB.value ?? 0, 'currency')} theme={theme} />
                <FormulaItem label={t.equityValue} value={formatFieldValue(calculation.result.equityValue, 'currency')} theme={theme} />
                <FormulaItem label={t.dcfFieldShares} value={formatFieldValue(fieldStates.sharesB.value, 'shares')} theme={theme} />
                <FormulaItem label={t.impliedPrice} value={impliedPriceText} theme={theme} />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">{ui.formulaEmpty}</div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
            <div className={cn('border rounded-lg p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
              <HeaderWithHelp label={ui.fcfChart} help={helpText(lang, 'fcf')} theme={theme} />
              {calculation.result ? (
                <div className="h-[300px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#ffffff10' : '#e2e8f0'} vertical={false} />
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
                <div className="text-sm text-slate-500 mt-4">{t.dcfProjectionUnavailable}</div>
              )}
            </div>

            <div className={cn('border rounded-lg p-6', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
              <HeaderWithHelp label={ui.terminalContribution} help={helpText(lang, 'terminal')} theme={theme} />
              {calculation.result ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-sm text-slate-500">{t.terminalValue}</div>
                    <div className="mt-1 font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatFieldValue(calculation.result.terminalValue, 'currency')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">{t.pvOfTerminalValue}</div>
                    <div className={cn('mt-1 font-mono text-xl font-bold', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>
                      {formatFieldValue(calculation.result.pvTerminalValue, 'currency')}
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">{ui.terminalNote}</p>
                </div>
              ) : (
                <div className="text-sm text-slate-500 mt-4">{t.dcfProjectionUnavailable}</div>
              )}
            </div>
          </div>

          <div className={cn('border rounded-lg p-6 overflow-x-auto', theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')}>
            <HeaderWithHelp label={t.sensitivityAnalysis} help={helpText(lang, 'sensitivity')} theme={theme} />
            {calculation.result ? (
              <table className="w-full text-sm text-center mt-4">
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
                              isBase ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700'),
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
              <div className="text-sm text-slate-500 mt-4">{t.dcfSensitivityUnavailable}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderWithHelp({ label, help, theme }: { label: string; help: string; theme: Theme }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className={cn('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{label}</h3>
      <HelpTip text={help} />
    </div>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group">
      <HelpCircle size={14} className="text-slate-400 group-hover:text-blue-500" />
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg group-hover:block dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
        {text}
      </span>
    </span>
  );
}

function MetricCard({ label, help, value, theme, featured = false, tone }: { label: string; help: string; value: string; theme: Theme; featured?: boolean; tone?: 'positive' | 'negative' }) {
  const valueColor = tone === 'positive'
    ? 'text-green-500'
    : tone === 'negative'
      ? 'text-red-500'
      : featured
        ? 'text-blue-600 dark:text-blue-400'
        : theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className={cn(
      'border rounded-lg p-6',
      featured
        ? (theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200')
        : (theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200'),
    )}>
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
        {label}
        <HelpTip text={help} />
      </div>
      <div className={cn('text-3xl font-mono font-bold', valueColor)}>{value}</div>
    </div>
  );
}

function FieldRow({ field, value, theme, lang }: { field: DcfFieldState; value: string; theme: Theme; lang: Lang }) {
  const sourceText = field.source === 'real'
    ? (lang === 'zh' ? '真实' : 'REAL')
    : (lang === 'zh' ? '缺失' : 'MISS');
  const sourceTone = field.source === 'real'
    ? 'text-emerald-500 bg-emerald-500/10'
    : 'text-red-500 bg-red-500/10';

  return (
    <div className="flex justify-between items-center gap-4 text-sm">
      <span className="flex items-center gap-1 text-slate-500">
        {field.label}
        <HelpTip text={field.help} />
      </span>
      <div className="flex items-center gap-2">
        <span className={cn('font-mono font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>{value}</span>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', sourceTone)}>{sourceText}</span>
      </div>
    </div>
  );
}

function StatusPanel({ title, items, tone, theme }: { title: string; items: string[]; tone: 'success' | 'warning' | 'error' | 'neutral'; theme: Theme }) {
  const toneClass = {
    success: theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: theme === 'dark' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700',
    error: theme === 'dark' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700',
    neutral: theme === 'dark' ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone];

  return (
    <div className={cn('border rounded-lg p-4 space-y-2', toneClass)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="space-y-1 text-xs">
        {items.map((item, index) => (
          <div key={`${title}-${index}`}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function InlineNotice({ text, tone, theme }: { text: string; tone: 'success' | 'warning' | 'error'; theme: Theme }) {
  const toneClass = {
    success: theme === 'dark' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    warning: theme === 'dark' ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700',
    error: theme === 'dark' ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700',
  }[tone];
  return <div className={cn('rounded-lg px-4 py-2 text-sm', toneClass)}>{text}</div>;
}

function PresetButton({ label, onClick, theme }: { label: string; onClick: () => void; theme: Theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
        theme === 'dark'
          ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white',
      )}
    >
      {label}
    </button>
  );
}

function StepBox({ text, theme }: { text: string; theme: Theme }) {
  return (
    <div className={cn('rounded-lg border p-4 leading-6', theme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
      {text}
    </div>
  );
}

function FormulaItem({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <div className={cn('rounded-lg border p-3', theme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn('mt-1 font-mono text-sm font-bold', theme === 'dark' ? 'text-slate-100' : 'text-slate-900')}>{value}</div>
    </div>
  );
}

function DcfSlider({ label, help, value, setValue, min, max, step, unit, theme }: { label: string; help: string; value: number; setValue: (value: number) => void; min: number; max: number; step: number; unit: string; theme: Theme }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className={cn('flex items-center gap-1 text-sm font-medium', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
          {label}
          <HelpTip text={help} />
        </label>
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
