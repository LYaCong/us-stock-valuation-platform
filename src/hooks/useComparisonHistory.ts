import { useEffect, useMemo, useState } from 'react';
import { fetchHistorical } from '../services/financeService';
import { type CompanyValuation, type HistoricalDataPoint, type TranslationMap } from '../types';

export type ComparisonMetricKey = 'peTtm' | 'price' | 'marketCap';

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export function useComparisonHistory(selectedCompanies: CompanyValuation[], t: TranslationMap) {
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
    const metricPriority: ComparisonMetricKey[] = ['peTtm', 'price', 'marketCap'];
    const hasValue = (point: HistoricalDataPoint, metric: ComparisonMetricKey) => point[metric] != null;

    const selectedMetric = metricPriority.find((metric) => (
      selectedCompanies.length > 0 &&
      selectedCompanies.every((company) => (historicalById[company.id] || []).some((point) => hasValue(point, metric)))
    )) ?? 'price';

    const metricLabels: Record<ComparisonMetricKey, string> = {
      peTtm: t.peComparison,
      price: t.priceComparison,
      marketCap: t.marketCapComparison,
    };

    const dateSets = selectedCompanies.map((company) => {
      const history = historicalById[company.id] || [];
      return new Set<string>(
        history
          .filter((point) => hasValue(point, selectedMetric))
          .map((point) => point.date)
      );
    });

    const overlapDates = dateSets.length === 0
      ? []
      : Array.from(dateSets[0]).filter((date) => dateSets.every((dateSet) => dateSet.has(date))).sort();

    const allDates = Array.from<string>(new Set(
      selectedCompanies.flatMap((company) => (
        (historicalById[company.id] || [])
          .filter((point) => hasValue(point, selectedMetric))
          .map((point) => point.date)
      ))
    )).sort();

    const rows = allDates.map((date) => {
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
  }, [historicalById, selectedCompanies, t.marketCapComparison, t.peComparison, t.priceComparison]);

  const medianPercentileValue = useMemo(() => {
    const values = selectedCompanies
      .map((company) => company.pePercentile10y)
      .filter((value): value is number => value != null);

    return median(values);
  }, [selectedCompanies]);

  return {
    isLoadingHistory,
    comparisonData,
    medianPercentileValue,
  };
}
