import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDcf } from '../utils/dcfCalculator.ts';

test('当终值增长率大于等于折现率时，DCF 应阻止计算', () => {
  const output = calculateDcf({
    currentPrice: 100,
    sharesB: 10,
    initialFcf: 20,
    netDebtB: 5,
    growth1to5: 15,
    growth6to10: 8,
    wacc: 8,
    terminalGrowth: 8,
  });

  assert.equal(output.result, null);
  assert.ok(output.issues.some((issue) => issue.code === 'TERMINAL_GROWTH_GTE_WACC'));
});

test('输入有效时，DCF 应返回正的每股内在价值', () => {
  const output = calculateDcf({
    currentPrice: 100,
    sharesB: 10,
    initialFcf: 20,
    netDebtB: 5,
    growth1to5: 12,
    growth6to10: 6,
    wacc: 10,
    terminalGrowth: 3,
  });

  assert.ok(output.result);
  assert.equal(output.issues.length, 0);
  assert.ok((output.result?.impliedPrice || 0) > 0);
  assert.equal(output.result?.projections.length, 10);
});
