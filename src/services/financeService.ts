import { CompanyValuation } from '../data/mockData';

export async function fetchQuotes(symbols: string[]): Promise<any[]> {
  if (symbols.length === 0) return [];
  try {
    const response = await fetch(`/api/quotes?symbols=${symbols.join(',')}`);
    if (!response.ok) throw new Error('Failed to fetch quotes');
    const data = await response.json();
    return data.quoteResponse?.result || [];
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function fetchFundamentals(symbol: string): Promise<any> {
  try {
    const response = await fetch(`/api/fundamentals?symbol=${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch fundamentals');
    const data = await response.json();
    return data.quoteSummary?.result?.[0] || null;
  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    return null;
  }
}

export async function fetchHistorical(symbol: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/historical?symbol=${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch historical');
    const data = await response.json();
    const history = data.history || [];
    
    return history.map((item: any) => ({
      date: item.date,
      price: item.price,
      volume: item.volume || 0
    }));
  } catch (error) {
    console.error('Error fetching historical:', error);
    return [];
  }
}

export function formatMarketCap(raw: number): string {
  if (!raw) return 'N/A';
  if (raw >= 1e12) return (raw / 1e12).toFixed(2) + 'T';
  if (raw >= 1e9) return (raw / 1e9).toFixed(2) + 'B';
  if (raw >= 1e6) return (raw / 1e6).toFixed(2) + 'M';
  return raw.toString();
}
