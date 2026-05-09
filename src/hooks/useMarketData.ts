import { useEffect, useState } from 'react';
import { DEFAULT_TICKERS } from '../config/tickers';
import { type CompanyValuation, type IndexValuation } from '../types';
import { fetchIndexValuations, fetchValuations } from '../services/valuationService';

export function useMarketData() {
  const [companies, setCompanies] = useState<CompanyValuation[]>([]);
  const [indices, setIndices] = useState<IndexValuation[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let cancelled = false;

    async function loadRealData() {
      setIsLoadingQuotes(true);
      try {
        const [realCompanies, realIndices] = await Promise.all([
          fetchValuations(DEFAULT_TICKERS),
          fetchIndexValuations(),
        ]);

        if (cancelled) return;

        setCompanies(realCompanies);
        setIndices(realIndices);
        setLastUpdated(new Date().toISOString().split('T')[0]);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load real data:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQuotes(false);
        }
      }
    }

    loadRealData();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    companies,
    indices,
    isLoadingQuotes,
    lastUpdated,
  };
}
