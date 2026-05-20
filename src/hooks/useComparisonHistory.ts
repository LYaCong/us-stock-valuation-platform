import { useEffect, useMemo, useState } from 'react';
import { fetchHistorical } from '../services/financeService';
import { type CompanyValuation, type HistoricalDataPoint, type TranslationMap } from '../types';

export type ComparisonMetricKey = 'peTtm' | 'price' | 'marketCap';
export type ComparisonTimeRange = 'MAX' | '20Y' | '10Y' | '5Y' | '3Y' | '1Y';

function filterHistoryByRange(history: HistoricalDataPoint[], timeRange: ComparisonTimeRange) {
  let monthsToKeep = history.length;
  switch (timeRange) {
    case '1Y': monthsToKeep = 12; break;
    case '3Y': monthsToKeep = 36; break;
    case '5Y': monthsToKeep = 60; break;
    case '10Y': monthsToKeep = 120; break;
    case '20Y': monthsToKeep = 240; break;
    case 'MAX': monthsToKeep = history.length; break;
  }

  return history.slice(-monthsToKeep);
}

export function useComparisonHistory(
  selectedCompanies: CompanyValuation[],
  t: TranslationMap,
  selectedMetric: ComparisonMetricKey,
  timeRange: ComparisonTimeRange,
) {
  const [historicalById, setHistoricalById] = useState<Record<string, HistoricalDataPoint[]>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadComparisonHistory() {
      if (selectedCompanies.length === 0) {
        setIsLoadingHistory(false);
        setHistoricalById({});
        return;
      }

      setIsLoadingHistory(true);
      try {
        const results = await Promise.all(
          selectedCompanies.map(async (company) => {
            const result = await fetchHistorical(company.ticker);
            return { id: company.id, history: result.history };
          })
        );

        if (cancelled) return;

        const nextHistory: Record<string, HistoricalDataPoint[]> = {};
        results.forEach(({ id, history }) => {
          nextHistory[id] = history;
        });
        setHistoricalById(nextHistory);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load comparison history:', error);
          setHistoricalById({});
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadComparisonHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedCompanies]);

  const comparisonData = useMemo(() => {
    const hasValue = (point: HistoricalDataPoint, metric: ComparisonMetricKey) => point[metric] != null;

    const metricLabels: Record<ComparisonMetricKey, string> = {
      peTtm: t.peComparison,
      price: t.priceComparison,
      marketCap: t.marketCapComparison,
    };

    const dateSets = selectedCompanies.map((company) => {
      const history = filterHistoryByRange(historicalById[company.id] || [], timeRange);
      return new Set<string>(
        history
          .filter((point) => hasValue(point, selectedMetric))
          .map((point) => point.date)
      );
    });

    const overlapDates = dateSets.length === 0
      ? []
      : Array.from(dateSets[0]).filter((date) => dateSets.every((dateSet) => dateSet.has(date))).sort();

    const rows = overlapDates.map((date) => {
      const row: Record<string, string | number | null> = { date };
      selectedCompanies.forEach((company) => {
        const matched = (historicalById[company.id] || []).find((point) => point.date === date);
        row[company.id] = matched?.[selectedMetric] ?? null;
      });
      return row;
    });

    return {
      metric: selectedMetric,
      metricLabel: metricLabels[selectedMetric],
      rows,
      overlapDates,
    };
  }, [historicalById, selectedCompanies, selectedMetric, t.marketCapComparison, t.peComparison, t.priceComparison, timeRange]);

  return {
    isLoadingHistory,
    comparisonData,
  };
}
