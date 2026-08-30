import { createSignal, createRoot } from "solid-js";
import type { DividendEntry } from "../types/dividend";
import rawDividendsJson from "../../sahamidx_dividends.json";
import distinctCompanies from "../../distinct_companies.json";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";

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
  } else {
    // Fallback if no cum_date exists
    if (parsedPaymentDate) {
      if (parsedPaymentDate >= today) {
        determinedStatus = "upcoming";
      } else {
        determinedStatus = "paid";
      }
    } else {
      determinedStatus = "projected";
    }
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
    return cache.data.map(normalizeEntry);
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
  const [ignoredKeys, setIgnoredKeys] = createSignal<Set<string>>((() => {
    try {
      const saved = localStorage.getItem("ignored_dividends");
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })());
  return { allDividends, setAllDividends, refreshing, setRefreshing, ignoredKeys, setIgnoredKeys };
});

const { allDividends, setAllDividends, refreshing, setRefreshing, ignoredKeys, setIgnoredKeys } = reactive;

export { ignoredKeys };

export function ignoreEntry(dividend: DividendEntry): void {
  const key = `${dividend.ticker}|${dividend.cum_date}|${dividend.amount}|${dividend.payment_date}`;
  const nextIgnored = new Set<string>(ignoredKeys());
  nextIgnored.add(key);
  setIgnoredKeys(nextIgnored);
  try {
    localStorage.setItem("ignored_dividends", JSON.stringify(Array.from(nextIgnored)));
  } catch {}
}

export function resetIgnored(): void {
  setIgnoredKeys(new Set<string>());
  try {
    localStorage.removeItem("ignored_dividends");
  } catch {}
}

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

// --- Tickers to fetch (from existing company map) ---

const allTickers: string[] = Object.keys(distinctCompanies as Record<string, string>);

// --- Fetch fresh dividends from Supabase Edge Function ---

async function fetchFreshDividends(): Promise<DividendEntry[]> {
  const url = `${SUPABASE_URL}/functions/v1/fetch-dividends`;

  // Ensure tickers are formatted with .JK for Yahoo Finance lookup in Edge Function
  const formattedTickers = allTickers.map((t) => (t.endsWith(".JK") ? t : `${t}.JK`));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ tickers: formattedTickers }),
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

export function refreshDividends(force: boolean = false): Promise<void> {
  if (fetchInProgress) return fetchInProgress;

  const now = Date.now();
  if (!force && now - lastFetchTime < MIN_FETCH_INTERVAL) {
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
      lastFetchTime = Date.now();
    } catch (error) {
      console.error("Failed to refresh dividends:", error);
    } finally {
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

export function getDividendsForMonth(year: number, month: number, dateField: 'payment_date' | 'ex_date' | 'cum_date' = 'payment_date'): DividendEntry[] {
  return allDividends().filter((d) => {
    const val = d[dateField];
    if (!val) return false;
    const date = new Date(val);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getDividendsForDate(dateStr: string, dateField: 'payment_date' | 'ex_date' | 'cum_date' = 'payment_date'): DividendEntry[] {
  return allDividends().filter((d) => d[dateField] === dateStr);
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

// --- Last price per ticker (from most recent fresh entry with a price) ---

export function getLastPriceByTicker(): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of allDividends()) {
    if (d.last_price != null && d.last_price > 0) {
      map.set(d.ticker, d.last_price);
    }
  }
  return map;
}

// --- TTM yield per ticker (dividends paid in trailing 12 months / last_price * 100) ---

export function getTTMYieldByTicker(): Map<string, number | null> {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const todayStr = getLocalTodayStr();
  const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);

  // Sum dividends per ticker where ex_date is in the trailing 12 months
  const ttmSumByTicker = new Map<string, number>();
  for (const d of allDividends()) {
    if (d.ex_date >= yearAgoStr && d.ex_date <= todayStr) {
      ttmSumByTicker.set(d.ticker, (ttmSumByTicker.get(d.ticker) || 0) + d.amount);
    }
  }

  const lastPrices = getLastPriceByTicker();
  const yields = new Map<string, number | null>();
  for (const [ticker, ttmSum] of ttmSumByTicker) {
    const price = lastPrices.get(ticker);
    if (price != null && price > 0) {
      yields.set(ticker, (ttmSum / price) * 100);
    } else {
      yields.set(ticker, null);
    }
  }
  return yields;
}

// Grouped dividends by selected dateField for O(1) lookup
export function getDividendsMapByDate(dateField: 'payment_date' | 'ex_date' | 'cum_date' = 'payment_date'): Map<string, DividendEntry[]> {
  const map = new Map<string, DividendEntry[]>();
  for (const d of allDividends()) {
    const val = d[dateField];
    if (val) {
      let arr = map.get(val);
      if (!arr) {
        arr = [];
        map.set(val, arr);
      }
      arr.push(d);
    }
  }
  return map;
}

// Projected dividends grouped by MM-DD (month-day) for O(1) lookup in calendar
// Only return filtered projected dividends (future and not ignored)
export function getProjectedDividendsMapByMD(dateField: 'payment_date' | 'ex_date' | 'cum_date' = 'payment_date'): Map<string, DividendEntry[]> {
  const map = new Map<string, DividendEntry[]>();
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayMD = `${mm}-${dd}`;
  const ignored = ignoredKeys();

  for (const d of allDividends()) {
    if (d.status === "projected") {
      const val = d[dateField];
      if (!val) continue;
      const valMD = val.slice(5);
      if (valMD <= todayMD) continue;
      
      const key = `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;
      if (ignored.has(key)) continue;

      let arr = map.get(valMD);
      if (!arr) {
        arr = [];
        map.set(valMD, arr);
      }
      arr.push(d);
    }
  }
  return map;
}

