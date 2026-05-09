import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMetadata,
  createFallbackCompanyValuation,
  mapCachedCompanyToValuation,
  mapHistoricalPayload,
} from '../../server/mappers/valuationMappers.ts';

test('fallback 公司估值结构应保留 null，而不是强行给 0', () => {
  const company = createFallbackCompanyValuation('TEST');

  assert.equal(company.id, 'test');
  assert.equal(company.marketCap, 'N/A');
  assert.equal(company.peTtm, null);
  assert.equal(company.price, null);
});

test('缓存公司映射应保留已有字段并标准化返回结构', () => {
  const mapped = mapCachedCompanyToValuation({
    ticker: 'NVDA',
    name: 'NVIDIA',
    marketCapStr: '$2.34T',
    price: 900,
    peTtm: 70,
    peFwd: 40,
    pb: 20,
    pePercentile: 88,
    status: 'High',
  });

  assert.equal(mapped.id, 'nvda');
  assert.equal(mapped.marketCap, '$2.34T');
  assert.equal(mapped.pePercentile10y, 88);
  assert.equal(mapped.status, 'High');
});

test('历史数据映射应返回 metadata 和可用字段', () => {
  const payload = mapHistoricalPayload({
    history: [
      { date: '2024-01-01', price: 10, marketCap: 100 },
      { date: '2024-02-01', price: 12, marketCap: 120 },
    ],
    splits: [{ date: '2024-02-01', ratio: 2 }],
    shares: 1000,
  }, '2026-01-01T00:00:00.000Z');

  assert.equal(payload.metadata.lastUpdated, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(payload.metadata.availableFields, ['date', 'price', 'marketCap']);
  assert.equal(payload.history.length, 2);
  assert.equal(payload.splits.length, 1);
  assert.equal(payload.shares, 1000);
});

test('metadata 应正确计算 coverage', () => {
  const metadata = buildMetadata('2026-01-01T00:00:00.000Z', ['peTtm'], [
    { peTtm: 10 },
    { peTtm: null },
    { peTtm: 20 },
  ]);

  assert.equal(metadata.coverage, 2 / 3);
});
