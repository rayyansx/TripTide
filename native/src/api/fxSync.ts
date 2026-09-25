import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CACHE_KEY = 'trek_fx_rates';

interface RatesData {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CacheState {
  data: RatesData;
  timestamp: number;
}

export async function syncRates(): Promise<void> {
  try {
    // Frankfurter defaults to EUR base and provides rates against it
    const response = await axios.get<RatesData>('https://api.frankfurter.app/latest');
    const cache: CacheState = {
      data: response.data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to sync FX rates, falling back to cache', error);
  }
}

export async function getCachedRates(): Promise<RatesData | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const state: CacheState = JSON.parse(cached);
    return state.data;
  } catch {
    return null;
  }
}

export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  let ratesData = await getCachedRates();

  // If no cache, try to sync immediately
  if (!ratesData) {
    await syncRates();
    ratesData = await getCachedRates();
  }

  if (!ratesData) {
    // If still no data (e.g. offline and no cache), we can't convert accurately.
    // Throwing an error so the caller can decide what to do.
    throw new Error('No exchange rates available and offline');
  }

  const { base, rates } = ratesData;

  const fromRate = from === base ? 1 : rates[from];
  const toRate = to === base ? 1 : rates[to];

  if (fromRate === undefined || toRate === undefined) {
    throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
  }

  return toRate / fromRate;
}

export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  const rate = await getRate(from, to);
  return amount * rate;
}
