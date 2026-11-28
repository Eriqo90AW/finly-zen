import type { DividendEntry, DividendFrequency } from "../types/dividend";
import distinctCompanies from "./assets/distinct_companies.json";

export interface RawDividendEntry {
  ticker?: string | null;
  company_name?: string | null;
  currency?: string | null;
  amount?: number | string | null;
  last_price?: number | string | null;
  cum_date?: string | null;
  ex_date?: string | null;
  record_date?: string | null;
  payment_date?: string | null;
  frequency?: string | null;
  year?: number | string | null;
}

interface DividendCache {
  data: DividendEntry[];
  timestamp: number;
}

const CACHE_KEY = "dividends_cache";
const companyMap = distinctCompanies as Record<string, string>;

export const allTickers: string[] = Object.keys(companyMap);

export function getLocalTodayStr(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateToISO(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    return dateStr;
  }
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = months[parts[1]] || "01";
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export function lookupCompanyName(ticker: string): string {
  return companyMap[ticker] || ticker;
}

export function normalizeEntry(item: RawDividendEntry): DividendEntry {
  const rawTicker = String(item.ticker || "");
  const cleanTicker = rawTicker.replace(/\.JK$/i, "");
  const parsedPaymentDate = parseDateToISO(item.payment_date);
  const parsedCumDate = parseDateToISO(item.cum_date);
  const today = getLocalTodayStr();

  let determinedStatus: DividendEntry["status"];
  if (parsedCumDate) {
    if (parsedCumDate >= today) {
      determinedStatus = "upcoming";
    } else if (parsedPaymentDate) {
      determinedStatus = "paid";
    } else {
      determinedStatus = "projected";
    }
  } else if (parsedPaymentDate) {
    determinedStatus = parsedPaymentDate >= today ? "upcoming" : "paid";
  } else {
    determinedStatus = "projected";
  }

  return {
    ticker: cleanTicker,
    company_name: lookupCompanyName(item.company_name || cleanTicker),
    currency: item.currency || "IDR",
    amount: Number(item.amount),
    last_price: item.last_price != null ? Number(item.last_price) : null,
    cum_date: parsedCumDate,
    ex_date: parseDateToISO(item.ex_date),
    record_date: parseDateToISO(item.record_date),
    payment_date: parsedPaymentDate,
    frequency: (item.frequency || "other") as DividendFrequency,
    year: Number(item.year),
    status: determinedStatus,
  };
}

export function getEntryKey(d: DividendEntry): string {
  return `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;
}

export function mergeDividends(
  current: DividendEntry[],
  fresh: DividendEntry[],
): DividendEntry[] {
  const map = new Map<string, DividendEntry>();
  const mergeKey = (d: DividendEntry) => `${d.ticker}|${d.cum_date}|${d.amount}`;
  for (const d of current) map.set(mergeKey(d), d);
  for (const d of fresh) {
    const key = mergeKey(d);
    if (!map.has(key)) {
      map.set(key, d);
    } else {
      const existing = map.get(key)!;
      if (d.last_price != null && existing.last_price == null) {
        map.set(key, { ...existing, last_price: d.last_price });
      }
    }
  }
  return Array.from(map.values());
}

export function readDividendCache(): DividendEntry[] | null {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (!saved) return null;
    const cache = JSON.parse(saved) as Partial<DividendCache>;
    if (!Array.isArray(cache.data)) return null;
    return cache.data.map(normalizeEntry);
  } catch {
    return null;
  }
}

export function writeDividendCache(data: DividendEntry[]): void {
  try {
    const cache: DividendCache = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or unavailable — ignore silently
  }
}

export function extractRawDividends(payload: unknown): RawDividendEntry[] {
  if (Array.isArray(payload)) {
    return payload as RawDividendEntry[];
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as RawDividendEntry[];
    }
  }
  return [];
}
