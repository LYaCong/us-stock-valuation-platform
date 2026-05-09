export interface DcfInputs {
  currentPrice: number | null;
  sharesB: number | null;
  initialFcf: number | null;
  netDebtB: number | null;
  growth1to5: number;
  growth6to10: number;
  wacc: number;
  terminalGrowth: number;
}

export type DcfValidationCode =
  | 'MISSING_CURRENT_PRICE'
  | 'MISSING_SHARES'
  | 'MISSING_FCF'
  | 'INVALID_WACC'
  | 'INVALID_TERMINAL_GROWTH'
  | 'TERMINAL_GROWTH_GTE_WACC';

export interface DcfValidationIssue {
  code: DcfValidationCode;
  field: keyof DcfInputs | 'general';
  severity: 'error' | 'warning';
}

export interface DcfProjectionRow {
  year: string;
  fcf: number;
  pv: number;
}

export interface DcfResult {
  projections: DcfProjectionRow[];
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  impliedPrice: number;
  marginOfSafety: number | null;
}

export interface DcfCalculationOutput {
  issues: DcfValidationIssue[];
  result: DcfResult | null;
}

export function validateDcfInputs(inputs: DcfInputs): DcfValidationIssue[] {
  const issues: DcfValidationIssue[] = [];

  if (inputs.currentPrice == null || inputs.currentPrice <= 0) {
    issues.push({
      code: 'MISSING_CURRENT_PRICE',
      field: 'currentPrice',
      severity: 'warning',
    });
  }

  if (inputs.sharesB == null || inputs.sharesB <= 0) {
    issues.push({
      code: 'MISSING_SHARES',
      field: 'sharesB',
      severity: 'error',
    });
  }

  if (inputs.initialFcf == null || inputs.initialFcf <= 0) {
    issues.push({
      code: 'MISSING_FCF',
      field: 'initialFcf',
      severity: 'error',
    });
  }

  if (!Number.isFinite(inputs.wacc) || inputs.wacc <= 0) {
    issues.push({
      code: 'INVALID_WACC',
      field: 'wacc',
      severity: 'error',
    });
  }

  if (!Number.isFinite(inputs.terminalGrowth) || inputs.terminalGrowth < 0) {
    issues.push({
      code: 'INVALID_TERMINAL_GROWTH',
      field: 'terminalGrowth',
      severity: 'error',
    });
  }

  if (
    Number.isFinite(inputs.wacc) &&
    Number.isFinite(inputs.terminalGrowth) &&
    inputs.terminalGrowth >= inputs.wacc
  ) {
    issues.push({
      code: 'TERMINAL_GROWTH_GTE_WACC',
      field: 'general',
      severity: 'error',
    });
  }

  return issues;
}

export function calculateDcf(inputs: DcfInputs): DcfCalculationOutput {
  const issues = validateDcfInputs(inputs);
  const hasBlockingError = issues.some((issue) => issue.severity === 'error');

  if (hasBlockingError) {
    return {
      issues,
      result: null,
    };
  }

  const initialFcf = inputs.initialFcf as number;
  const sharesB = inputs.sharesB as number;
  const netDebtB = inputs.netDebtB ?? 0;
  const currentPrice = inputs.currentPrice != null && inputs.currentPrice > 0
    ? inputs.currentPrice
    : null;

  const projections: DcfProjectionRow[] = [];
  let currentFcf = initialFcf;
  let pvSum = 0;

  for (let year = 1; year <= 10; year += 1) {
    const growth = year <= 5 ? inputs.growth1to5 / 100 : inputs.growth6to10 / 100;
    currentFcf = currentFcf * (1 + growth);
    const pv = currentFcf / Math.pow(1 + inputs.wacc / 100, year);
    pvSum += pv;
    projections.push({
      year: `${year}`,
      fcf: currentFcf,
      pv,
    });
  }

  const terminalValue =
    (projections[9].fcf * (1 + inputs.terminalGrowth / 100)) /
    (inputs.wacc / 100 - inputs.terminalGrowth / 100);
  const pvTerminalValue = terminalValue / Math.pow(1 + inputs.wacc / 100, 10);
  const enterpriseValue = pvSum + pvTerminalValue;
  const equityValue = enterpriseValue - netDebtB;
  const impliedPrice = equityValue / sharesB;
  const marginOfSafety =
    currentPrice != null && impliedPrice !== 0
      ? ((impliedPrice - currentPrice) / impliedPrice) * 100
      : null;

  return {
    issues,
    result: {
      projections,
      terminalValue,
      pvTerminalValue,
      enterpriseValue,
      equityValue,
      impliedPrice,
      marginOfSafety,
    },
  };
}

export function calculateSensitivityMatrix(
  inputs: DcfInputs,
  waccSteps: number[],
  terminalGrowthSteps: number[],
) {
  return waccSteps.map((wacc) =>
    terminalGrowthSteps.map((terminalGrowth) => {
      const { result } = calculateDcf({
        ...inputs,
        wacc,
        terminalGrowth,
      });
      return result?.impliedPrice ?? null;
    }),
  );
}
