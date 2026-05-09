import { useEffect, useState } from 'react';
import { fetchHistorical } from '../services/financeService';
import { type ApiMetadata, type HistoricalDataPoint } from '../types';

export function useHistoricalData(symbol?: string | null) {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historicalSplits, setHistoricalSplits] = useState<any[]>([]);
  const [historicalMetadata, setHistoricalMetadata] = useState<ApiMetadata>({ availableFields: [] });

  useEffect(() => {
    let cancelled = false;

    async function loadHistorical() {
      if (!symbol) {
        setHistoricalData([]);
        setHistoricalSplits([]);
        setHistoricalMetadata({ availableFields: [] });
        return;
      }

      const result = await fetchHistorical(symbol);
      if (cancelled) return;

      setHistoricalData(result.history);
      setHistoricalSplits(result.splits);
      setHistoricalMetadata(result.metadata);
    }

    loadHistorical();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return {
    historicalData,
    historicalSplits,
    historicalMetadata,
  };
}
