import { createSignal, createRoot } from "solid-js";
import type { DividendEntry } from "../types/dividend";
import rawDividendsJson from "../../sahamidx_dividends.json";
import distinctCompanies from "../../distinct_companies.json";

// --- Date helpers ---

function getLocalTodayStr(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateToISO(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    return dateStr;
  }
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
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

// --- Company name lookup from existing JSON map ---

const companyMap = distinctCompanies as Record<string, string>;
function lookupCompanyName(ticker: string): string {
  return companyMap[ticker] || ticker;
}

// --- Entry normalization (shared by static JSON + fresh edge-function data) ---

function normalizeEntry(item: any): DividendEntry {
  const parsedPaymentDate = parseDateToISO(item.payment_date);
  const parsedCumDate = parseDateToISO(item.cum_date);
  const today = getLocalTodayStr();

  let determinedStatus: DividendEntry["status"];
  if (parsedPaymentDate < "2026-01-01") {
    determinedStatus = "projected";
  } else if (parsedCumDate >= today) {
    determinedStatus = "upcoming";
  } else {
    determinedStatus = "paid";
  }

  return {
    ticker: item.ticker,
    company_name: lookupCompanyName(item.company_name || item.ticker),
    currency: item.currency || "IDR",
    amount: Number(item.amount),
    cum_date: parsedCumDate,
    ex_date: parseDateToISO(item.ex_date),
    record_date: parseDateToISO(item.record_date),
    payment_date: parsedPaymentDate,
    frequency: item.frequency as DividendEntry["frequency"],
    year: Number(item.year),
    status: determinedStatus,
  };
}

// --- Base dataset from bundled static JSON (always available, instant) ---

const baseDividends: DividendEntry[] = (rawDividendsJson as any[]).map(normalizeEntry);

// --- SWR cache in localStorage ---

const CACHE_KEY = "dividends_cache";
const MIN_FETCH_INTERVAL = 5 * 60 * 1000; // 5 min — avoid hammering sahmidx on rapid navigation

interface DividendCache {
  data: DividendEntry[];
  timestamp: number;
}

function readCache(): DividendEntry[] | null {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (!saved) return null;
    const cache: DividendCache = JSON.parse(saved);
    return cache.data;
  } catch {
    return null;
  }
}

function writeCache(data: DividendEntry[]): void {
  try {
    const cache: DividendCache = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or unavailable — ignore silently
  }
}

// --- Reactive state (module-level signal via createRoot) ---
// get* functions read allDividends() so any createMemo that calls them
// will auto re-run when fresh data lands — no component changes needed.

const reactive = createRoot(() => {
  const cached = readCache();
  const [allDividends, setAllDividends] = createSignal<DividendEntry[]>(
    cached && cached.length > 0 ? cached : baseDividends
  );
  const [refreshing, setRefreshing] = createSignal(false);
  return { allDividends, setAllDividends, refreshing, setRefreshing };
});

const { allDividends, setAllDividends, refreshing, setRefreshing } = reactive;

// --- Dedup key (matches getEntryKey in DividendListCard.tsx) ---

function getEntryKey(d: DividendEntry): string {
  return `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;
}

// --- Merge: base/current data wins (has real payment_dates from sahmidx);
//             fresh Yahoo data only ADDS new dividends not already in base ---
// Uses ticker|cum_date|amount as merge key (not payment_date, since Yahoo estimates it)

function mergeDividends(current: DividendEntry[], fresh: DividendEntry[]): DividendEntry[] {
  const map = new Map<string, DividendEntry>();
  const mergeKey = (d: DividendEntry) => `${d.ticker}|${d.cum_date}|${d.amount}`;
  for (const d of current) map.set(mergeKey(d), d);
  for (const d of fresh) {
    const key = mergeKey(d);
    if (!map.has(key)) map.set(key, d);
  }
  return Array.from(map.values());
}

// --- Tickers to fetch (from existing company map) ---

const allTickers: string[] = Object.keys(distinctCompanies as Record<string, string>);

// --- Fetch fresh dividends from Supabase Edge Function ---

async function fetchFreshDividends(): Promise<DividendEntry[]> {
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_URL = "https://ltjpsxlnxpjivoxgmmxn.supabase.co/functions/v1/fetch-dividends";

  const response = await fetch(SUPABASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ tickers: allTickers }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dividends: ${response.statusText}`);
  }

  const result = await response.json();
  const rawFresh: any[] = result.data || result;
  return rawFresh.map(normalizeEntry);
}

// --- Stale-while-revalidate refresh (call on dividend page open) ---

let lastFetchTime = 0;
let fetchInProgress: Promise<void> | null = null;

export function refreshDividends(): Promise<void> {
  if (fetchInProgress) return fetchInProgress;

  const now = Date.now();
  if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
    return Promise.resolve();
  }

  fetchInProgress = (async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchFreshDividends();
      if (fresh.length > 0) {
        const merged = mergeDividends(allDividends(), fresh);
        setAllDividends(merged);
        writeCache(merged);
      }
    } catch (error) {
      console.error("Failed to refresh dividends:", error);
    } finally {
      lastFetchTime = Date.now();
      setRefreshing(false);
      fetchInProgress = null;
    }
  })();

  return fetchInProgress;
}

export function isDividendsRefreshing(): boolean {
  return refreshing();
}

// --- Query functions (reactive — callers' createMemos auto-re-run on data change) ---

export function getDividendsForMonth(year: number, month: number): DividendEntry[] {
  return allDividends().filter((d) => {
    const date = new Date(d.payment_date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getDividendsForDate(dateStr: string): DividendEntry[] {
  return allDividends().filter((d) => d.payment_date === dateStr);
}

export function getDividendsByStatus(status: DividendEntry["status"]): DividendEntry[] {
  return allDividends().filter((d) => d.status === status);
}

export function getUpcomingDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends().filter((d) => d.cum_date >= today && d.status !== "paid");
}

export function getPastDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends().filter((d) => d.payment_date < today || d.status === "paid");
}

export function getCurrentDividends(): DividendEntry[] {
  const now = new Date();
  return allDividends().filter((d) => {
    const date = new Date(d.payment_date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function getAllDividends(): DividendEntry[] {
  return allDividends();
}
