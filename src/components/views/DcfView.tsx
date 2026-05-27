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
type DcfAssumptionSource = 'company' | 'browser' | 'global';

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
  currency: string | null;
  fiscalYear: number | null;
  filedDate: string | null;
  accessionNumber: string | null;
  coverageStatus: string | null;
  missingFields: string[];
  fcfSource: string | null;
  balanceSheetSource: string | null;
  sharesSource: string | null;
  supplementalSourceText: string | null;
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
    savedBrowser: '已保存到当前浏览器。线上环境不能写项目文件，但下次在这台设备打开该公司时会自动套用。',
    unsavedCompany: '有未保存的公司假设',
    saveCompany: '保存为该公司默认假设',
    saving: '保存中...',
    saveFailed: '保存失败：项目文件和浏览器本地存储都不可写',
    globalDefault: '使用全局默认假设',
    projectDefault: '使用该公司项目默认假设',
    browserDefault: '使用当前浏览器保存的假设',
    beginnerTitle: '小白计算顺序',
    beginnerStep1: '1. 先看数据质量：自由现金流、总股本、净债务必须来自真实财报。',
    beginnerStep2: '2. 再调增长率：1-5 年看业务高增长，6-10 年要逐步保守。',
    beginnerStep3: '3. 最后看安全边际：内在价值高于股价越多，容错空间越大。',
    beginnerDataTitle: '先确认这 4 个输入',
    beginnerDataFcf: '自由现金流：公司一年真正能留下来的现金，是估值的起点。',
    beginnerDataShares: '总股本：把整家公司价值除成每股价值。',
    beginnerDataNetDebt: '净债务：债务会扣减股东价值，净现金会增加股东价值。',
    beginnerDataPrice: '当前股价：只用来比较贵不贵，不参与算内在价值。',
    beginnerAssumptionTitle: '再理解 4 个假设',
    beginnerAssumptionGrowth: '前 5 年增长率越高，代表你越相信公司近期扩张。',
    beginnerAssumptionFade: '第 6-10 年增长率要更保守，因为高增长通常会放慢。',
    beginnerAssumptionWacc: 'WACC 是你要求的回报率，越高估值越低。',
    beginnerAssumptionTerminal: '永续增长率是 10 年后的长期增速，必须低于 WACC。',
    beginnerResultTitle: '最后读这 3 个结果',
    beginnerResultIntrinsic: '每股内在价值：模型认为这家公司每股大概值多少。',
    beginnerResultMargin: '安全边际：内在价值比当前股价高多少，越高容错越大。',
    beginnerResultSensitivity: '敏感性表：检查估值是不是被某个乐观假设撑起来的。',
    presets: '情景假设',
    conservative: '保守',
    base: '基准',
    optimistic: '乐观',
    formulaTitle: '公式拆解',
    formulaEmpty: '补齐真实自由现金流和总股本后，这里会显示每股内在价值怎么算出来。',
    fcfChart: '1-10 年现金流折现',
    terminalContribution: '终值贡献',
    sourceTitle: '财报来源',
    sourceEmpty: '暂无 SEC 来源信息',
    sourceFcf: '自由现金流：最近年报',
    sourceNetDebt: '净债务：最近披露期',
    sourceShares: '总股本：最近披露期',
    sourceCurrency: '财报货币',
    supplementalSource: '补充来源',
    fiscalYear: '财年',
    filedDate: '提交日期',
    accession: 'SEC 编号',
    terminalNote: '终值是第 10 年之后所有现金流的合计现值，通常占 DCF 很大比例，所以单独展示。',
    help: {
      growth1to5: '未来 1-5 年自由现金流增长率，代表你对公司近期业务扩张的判断。调高会明显抬高估值，适合收入、利润和现金流仍在快速增长的公司；如果行业成熟或周期下行，应更保守。',
      growth6to10: '第 6-10 年自由现金流增长率，用来模拟公司从高速增长逐步回到稳定增长。它通常应低于前 5 年，因为规模变大后增长会变难；调得太高会让估值过度依赖长期乐观假设。',
      wacc: '折现率，也可以理解为你要求这笔投资至少赚到的年化回报率。风险越高、利率越高，WACC 应越高；WACC 调高会把未来现金流打更大折扣，所以估值会下降。',
      terminalGrowth: '第 10 年之后的长期稳定增长率，决定公司进入成熟期后的现金流增速。它必须低于 WACC，通常也不应高于长期经济增速；调得过高会让终值过大，估值看起来虚高。',
      fcf: '自由现金流 = 经营现金流 - 资本开支，是公司在维持经营和必要投入后真正剩下的现金。DCF 从它开始往未来推算，所以这个数必须来自真实财报，不能用利润或市值反推。',
      shares: '总股本用于把整家公司价值换算成每股价值。股本越多，每一股分到的价值越少；如果公司持续回购，未来每股价值可能提高，但这里先使用最近披露的真实股本。',
      netDebt: '净债务 = 总债务 - 现金。计算股权价值时，要先从企业价值里扣掉债务；如果净债务为负，说明现金多于债务，会增加股东可分享的价值。',
      price: '当前股价只用来和模型算出的内在价值比较，从而得到安全边际。它不会参与内在价值本身的计算，所以股价短期波动不会改变公司现金流估值，只会改变贵不贵的判断。',
      impliedPrice: '每股内在价值是模型根据未来自由现金流、净债务和总股本算出的合理价格，不是目标价承诺。它对增长率、WACC 和永续增长率很敏感，所以要配合敏感性表一起看。',
      margin: '安全边际 = 每股内在价值相对当前股价的折价空间。为正表示模型估值高于市场价，为负表示模型估值低于市场价；边际越大，假设出错时的缓冲越多。',
      sensitivity: '敏感性表会同时改变 WACC 和永续增长率，观察每股内在价值如何变化。如果表格里的估值只在很乐观的一格才好看，说明结论比较脆弱；如果多数格都合理，结论更稳。',
      terminal: '终值代表第 10 年之后所有未来现金流折现到今天的价值。很多 DCF 的大部分价值来自终值，所以要单独检查它占比是否过高，避免估值被远期假设主导。',
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
    savedBrowser: 'Saved in this browser. Deployed builds cannot write project files, but this device will reuse it next time.',
    unsavedCompany: 'Unsaved company assumptions',
    saveCompany: 'Save as company default',
    saving: 'Saving...',
    saveFailed: 'Save failed: neither project files nor browser storage are writable',
    globalDefault: 'Using global default assumptions',
    projectDefault: 'Using company project defaults',
    browserDefault: 'Using browser-saved assumptions',
    beginnerTitle: 'Beginner Flow',
    beginnerStep1: '1. Check data quality first: FCF, shares, and net debt must come from filings.',
    beginnerStep2: '2. Tune growth next: years 1-5 can reflect momentum, years 6-10 should fade.',
    beginnerStep3: '3. Read margin of safety last: more upside means more room for error.',
    beginnerDataTitle: 'Confirm these 4 inputs first',
    beginnerDataFcf: 'FCF: cash the company can keep after operating needs and capital spending.',
    beginnerDataShares: 'Shares: turns whole-company value into per-share value.',
    beginnerDataNetDebt: 'Net debt: debt lowers equity value, while net cash raises it.',
    beginnerDataPrice: 'Current price: used only to judge cheap or expensive, not to compute intrinsic value.',
    beginnerAssumptionTitle: 'Understand these 4 assumptions',
    beginnerAssumptionGrowth: 'Years 1-5 growth reflects your near-term business view.',
    beginnerAssumptionFade: 'Years 6-10 growth should fade because high growth usually slows.',
    beginnerAssumptionWacc: 'WACC is your required return. Higher WACC means lower valuation.',
    beginnerAssumptionTerminal: 'Terminal growth is the long-run rate after year 10 and must stay below WACC.',
    beginnerResultTitle: 'Read these 3 results last',
    beginnerResultIntrinsic: 'Intrinsic value per share: what the model thinks one share is worth.',
    beginnerResultMargin: 'Margin of safety: how much intrinsic value exceeds current price.',
    beginnerResultSensitivity: 'Sensitivity table: checks whether the valuation depends on optimistic assumptions.',
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
    sourceFcf: 'FCF: latest annual filing',
    sourceNetDebt: 'Net debt: latest reported period',
    sourceShares: 'Shares: latest reported period',
    sourceCurrency: 'Filing currency',
    supplementalSource: 'Supplemental source',
    fiscalYear: 'Fiscal year',
    filedDate: 'Filed',
    accession: 'SEC accession',
    terminalNote: 'Terminal value is the present value of cash flows after year 10. It is often a large part of DCF, so it is shown separately.',
    help: {
      growth1to5: 'Free-cash-flow growth for years 1-5, reflecting your near-term business view. Raising it lifts valuation quickly, so it fits companies with strong revenue, profit, and cash-flow momentum; mature or cyclical businesses deserve lower assumptions.',
      growth6to10: 'Free-cash-flow growth for years 6-10, modeling the fade from high growth toward maturity. It should usually be below years 1-5 because growth gets harder at scale; setting it too high makes valuation depend on long-term optimism.',
      wacc: 'The discount rate, similar to the annual return you require for taking this risk. Higher rates or higher business risk should push WACC up; a higher WACC discounts future cash flows more heavily and lowers valuation.',
      terminalGrowth: 'The steady growth rate after year 10, when the company is assumed to be mature. It must stay below WACC and normally should not exceed long-run economic growth; setting it too high can make terminal value dominate the model.',
      fcf: 'Free cash flow = operating cash flow - capital expenditures. It is the cash left after running the business and funding required investment, so DCF starts here and should use filing data rather than profit or market-cap estimates.',
      shares: 'Shares outstanding converts whole-company value into per-share value. More shares dilute each share of value; buybacks can improve future per-share value, but this model starts with the latest disclosed share count.',
      netDebt: 'Net debt = total debt - cash. Equity value is enterprise value minus net debt; positive net debt reduces shareholder value, while negative net debt means net cash and adds value to shareholders.',
      price: 'Current price is only used to compare market price with model value and calculate margin of safety. It does not drive intrinsic value, so short-term price moves change cheap-versus-expensive judgment, not the cash-flow estimate.',
      impliedPrice: 'Intrinsic value per share is the model output based on future free cash flow, net debt, and shares. It is not a promised target price and can move a lot when growth, WACC, or terminal growth assumptions change.',
      margin: 'Margin of safety compares intrinsic value with current price. Positive means the model value is above the market price; negative means the model value is below it. A larger margin gives more room for assumption error.',
      sensitivity: 'The sensitivity table changes WACC and terminal growth together to show how fragile the valuation is. If the stock only looks attractive in one optimistic cell, the thesis is weak; if many cells look reasonable, it is sturdier.',
      terminal: 'Terminal value represents all cash flows after year 10 discounted back to today. It can be a large share of DCF value, so check whether the model is relying too much on distant assumptions.',
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
    storage: value?.storage === 'browser' || value?.storage === 'project' ? value.storage : undefined,
  };
}

function formatSourceLine(source: any, label: string) {
  if (!source) return null;
  const details = [
    source.fiscalYear ? `FY${source.fiscalYear}` : null,
    source.fiscalPeriod || null,
    source.form || null,
    source.filedDate || null,
    source.sourceProvider ? `${source.sourceProvider} supplemental` : null,
  ].filter(Boolean);
  return details.length > 0 ? `${label}: ${details.join(' / ')}` : label;
}

function formatSupplementalSources(sources: any, label: string) {
  if (!sources || typeof sources !== 'object') return null;
  const providers = Array.from(new Set(
    Object.values(sources)
      .map((item: any) => item?.provider)
      .filter(Boolean),
  ));
  return providers.length > 0 ? `${label}: ${providers.join(', ')}` : null;
}

export function DcfView({ company, theme, t, lang }: DcfViewProps) {
  const ui = copy[lang];
  const [realData, setRealData] = useState<DcfRealData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assumptionSource, setAssumptionSource] = useState<DcfAssumptionSource>('global');
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

        const companyAssumptions = fundamentals.dcfAssumptions?.company;
        const assumptions = companyAssumptions
          ? normalizeAssumptions(companyAssumptions)
          : normalizeAssumptions(fundamentals.dcfAssumptions?.defaults);
        setAssumptionSource(companyAssumptions
          ? (assumptions.storage === 'browser' ? 'browser' : 'company')
          : 'global');
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
          currency: source?.currency ?? source?.annualCashFlow?.currency ?? source?.latestBalanceSheet?.currency ?? null,
          fiscalYear: source?.fiscalYear ?? null,
          filedDate: source?.filedDate ?? null,
          accessionNumber: source?.accessionNumber ?? null,
          coverageStatus: source?.coverageStatus ?? null,
          missingFields: Array.isArray(source?.missingFields) ? source.missingFields : [],
          fcfSource: formatSourceLine(
            source?.annualCashFlow?.freeCashFlow ?? source?.annualCashFlow,
            ui.sourceFcf,
          ),
          balanceSheetSource: formatSourceLine(
            source?.latestBalanceSheet?.netDebt ?? source?.latestBalanceSheet,
            ui.sourceNetDebt,
          ),
          sharesSource: formatSourceLine(
            source?.latestShares,
            ui.sourceShares,
          ),
          supplementalSourceText: formatSupplementalSources(source?.supplementalSources, ui.supplementalSource),
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
  }, [company, ui.sourceFcf, ui.sourceNetDebt, ui.sourceShares]);

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
      setAssumptionSource(saved.storage === 'browser' ? 'browser' : 'company');
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
    realData?.fcfSource,
    realData?.balanceSheetSource,
    realData?.sharesSource,
    realData?.supplementalSourceText,
    realData?.currency ? `${ui.sourceCurrency}: ${realData.currency}` : null,
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
              : assumptionSource === 'browser'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
          )}>
            <SlidersHorizontal size={14} />
            {assumptionSource === 'company'
              ? ui.projectDefault
              : assumptionSource === 'browser'
                ? ui.browserDefault
                : ui.globalDefault}
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
            {saveState === 'saving' ? ui.saving : ui.saveCompany}
          </button>
        </div>
      </div>

      {saveState === 'dirty' && <InlineNotice text={ui.unsavedCompany} tone="warning" theme={theme} />}
      {saveState === 'saved' && assumptionSource === 'company' && <InlineNotice text={ui.savedCompany} tone="success" theme={theme} />}
      {saveState === 'saved' && assumptionSource === 'browser' && <InlineNotice text={ui.savedBrowser} tone="success" theme={theme} />}
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
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <GuideColumn
                title={ui.beginnerDataTitle}
                items={[ui.beginnerDataFcf, ui.beginnerDataShares, ui.beginnerDataNetDebt, ui.beginnerDataPrice]}
                theme={theme}
              />
              <GuideColumn
                title={ui.beginnerAssumptionTitle}
                items={[ui.beginnerAssumptionGrowth, ui.beginnerAssumptionFade, ui.beginnerAssumptionWacc, ui.beginnerAssumptionTerminal]}
                theme={theme}
              />
              <GuideColumn
                title={ui.beginnerResultTitle}
                items={[ui.beginnerResultIntrinsic, ui.beginnerResultMargin, ui.beginnerResultSensitivity]}
                theme={theme}
              />
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
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg group-hover:block dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
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

function GuideColumn({ title, items, theme }: { title: string; items: string[]; theme: Theme }) {
  return (
    <div className={cn('rounded-lg border p-4', theme === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
      <div className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-100' : 'text-slate-800')}>{title}</div>
      <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
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
