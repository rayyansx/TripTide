import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

export const COMMON_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
];

// Fallback baseline rates relative to EUR in case device is completely offline on first launch
const FALLBACK_EUR_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  JPY: 165.5,
  CAD: 1.48,
  AUD: 1.66,
  CHF: 0.97,
  CNY: 7.82,
  SEK: 11.45,
  NZD: 1.78,
  SGD: 1.46,
  HKD: 8.44,
  NOK: 11.55,
  MXN: 18.25,
  INR: 90.1,
  BRL: 5.52,
  THB: 39.8,
};

const STORAGE_PREFIX = '@trek_fx_rates_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch latest FX rates from Frankfurter with offline local storage cache.
 * Always resolves gracefully.
 */
export async function getExchangeRates(baseCurrency: string = 'EUR'): Promise<ExchangeRates> {
  const base = baseCurrency.toUpperCase();
  const cacheKey = `${STORAGE_PREFIX}${base}`;

  // 1. Try reading valid cache from AsyncStorage
  try {
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr) as ExchangeRates;
      const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
      if (isFresh) {
        return cached;
      }
    }
  } catch {
    // Continue to network fetch
  }

  // 2. Fetch fresh rates from Frankfurter API
  try {
    const res = await axios.get<{ base: string; date: string; rates: Record<string, number> }>(
      `https://api.frankfurter.app/latest?from=${base}`,
      { timeout: 5000 }
    );

    if (res.data && res.data.rates) {
      const freshRates: ExchangeRates = {
        base: res.data.base,
        date: res.data.date,
        rates: { ...res.data.rates, [base]: 1 },
        timestamp: Date.now(),
      };

      // Persist to local storage in background
      AsyncStorage.setItem(cacheKey, JSON.stringify(freshRates)).catch(() => {});
      return freshRates;
    }
  } catch {
    // Network failed or offline
  }

  // 3. Fallback: try stale cache if available
  try {
    const staleStr = await AsyncStorage.getItem(cacheKey);
    if (staleStr) {
      return JSON.parse(staleStr) as ExchangeRates;
    }
  } catch {
    // ignore
  }

  // 4. Fallback: Derive from static baseline rates
  const eurToBase = FALLBACK_EUR_RATES[base] || 1;
  const derivedRates: Record<string, number> = {};
  for (const [curr, eurRate] of Object.entries(FALLBACK_EUR_RATES)) {
    derivedRates[curr] = eurRate / eurToBase;
  }
  derivedRates[base] = 1;

  return {
    base,
    date: new Date().toISOString().slice(0, 10),
    rates: derivedRates,
    timestamp: Date.now(),
  };
}

/**
 * Convert an amount from one currency to another using exchange rates.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  ratesRecord?: Record<string, number>,
  baseOfRates: string = 'EUR'
): number {
  if (from.toUpperCase() === to.toUpperCase() || amount === 0) {
    return amount;
  }

  const fromCurr = from.toUpperCase();
  const toCurr = to.toUpperCase();
  const rates = ratesRecord || FALLBACK_EUR_RATES;

  // If rates are based in `baseOfRates`:
  const rateFrom = rates[fromCurr] ?? 1;
  const rateTo = rates[toCurr] ?? 1;

  if (fromCurr === baseOfRates.toUpperCase()) {
    return amount * rateTo;
  }
  if (toCurr === baseOfRates.toUpperCase()) {
    return amount / rateFrom;
  }

  // Convert from -> base -> to
  const inBase = amount / rateFrom;
  return inBase * rateTo;
}

/**
 * Format currency with localized symbol and standard formatting.
 */
export function formatMoney(amount: number, currency: string = 'EUR', locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
