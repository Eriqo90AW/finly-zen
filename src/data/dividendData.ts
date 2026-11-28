import { createSignal, createRoot } from "solid-js";
import type { DividendEntry } from "../types/dividend";
import rawDividendsJson from "./assets/sahamidx_dividends.json";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import {
  allTickers,
  extractRawDividends,
  getEntryKey,
  getLocalTodayStr,
  mergeDividends,
  normalizeEntry,
  readDividendCache,
  writeDividendCache,
  type RawDividendEntry,
} from "./dividendHelpers";

const baseDividends: DividendEntry[] = (
  rawDividendsJson as RawDividendEntry[]
).map(normalizeEntry);

const MIN_FETCH_INTERVAL = 5 * 60 * 1000;

const reactive = createRoot(() => {
  const cached = readDividendCache();
  const [allDividends, setAllDividends] = createSignal<DividendEntry[]>(
    cached && cached.length > 0 ? cached : baseDividends,
  );
  const [refreshing, setRefreshing] = createSignal(false);
  const [ignoredKeys, setIgnoredKeys] = createSignal<Set<string>>(
    (() => {
      try {
        const saved = localStorage.getItem("ignored_dividends");
        return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })(),
  );
  return {
    allDividends,
    setAllDividends,
    refreshing,
    setRefreshing,
    ignoredKeys,
    setIgnoredKeys,
  };
});

const {
  allDividends,
  setAllDividends,
  refreshing,
  setRefreshing,
  ignoredKeys,
  setIgnoredKeys,
} = reactive;

export { ignoredKeys };

export function ignoreEntry(dividend: DividendEntry): void {
  const key = getEntryKey(dividend);
  const nextIgnored = new Set<string>(ignoredKeys());
  nextIgnored.add(key);
  setIgnoredKeys(nextIgnored);
  try {
    localStorage.setItem(
      "ignored_dividends",
      JSON.stringify(Array.from(nextIgnored)),
    );
  } catch {}
}

export function resetIgnored(): void {
  setIgnoredKeys(new Set<string>());
  try {
    localStorage.removeItem("ignored_dividends");
  } catch {}
}

async function fetchFreshDividends(): Promise<DividendEntry[]> {
  const url = `${SUPABASE_URL}/functions/v1/fetch-dividends`;
  const formattedTickers = allTickers.map((t) =>
    t.endsWith(".JK") ? t : `${t}.JK`,
  );

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

  const result: unknown = await response.json();
  return extractRawDividends(result).map(normalizeEntry);
}

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
        writeDividendCache(merged);
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

export function getDividendsForMonth(
  year: number,
  month: number,
  dateField: "payment_date" | "ex_date" | "cum_date" = "payment_date",
): DividendEntry[] {
  return allDividends().filter((d) => {
    const val = d[dateField];
    if (!val) return false;
    const date = new Date(val);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getDividendsForDate(
  dateStr: string,
  dateField: "payment_date" | "ex_date" | "cum_date" = "payment_date",
): DividendEntry[] {
  return allDividends().filter((d) => d[dateField] === dateStr);
}

export function getDividendsByStatus(
  status: DividendEntry["status"],
): DividendEntry[] {
  return allDividends().filter((d) => d.status === status);
}

export function getUpcomingDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends().filter(
    (d) => d.cum_date >= today && d.status !== "paid",
  );
}

export function getPastDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends().filter(
    (d) => d.payment_date < today || d.status === "paid",
  );
}

export function getCurrentDividends(): DividendEntry[] {
  const now = new Date();
  return allDividends().filter((d) => {
    const date = new Date(d.payment_date);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });
}

export function getAllDividends(): DividendEntry[] {
  return allDividends();
}

export function getLastPriceByTicker(): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of allDividends()) {
    if (d.last_price != null && d.last_price > 0) {
      map.set(d.ticker, d.last_price);
    }
  }
  return map;
}

export function getTTMYieldByTicker(): Map<string, number | null> {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const todayStr = getLocalTodayStr();
  const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);

  const ttmSumByTicker = new Map<string, number>();
  for (const d of allDividends()) {
    if (d.ex_date >= yearAgoStr && d.ex_date <= todayStr) {
      ttmSumByTicker.set(
        d.ticker,
        (ttmSumByTicker.get(d.ticker) || 0) + d.amount,
      );
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

export function getDividendsMapByDate(
  dateField: "payment_date" | "ex_date" | "cum_date" = "payment_date",
): Map<string, DividendEntry[]> {
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

export function getProjectedDividendsMapByMD(
  dateField: "payment_date" | "ex_date" | "cum_date" = "payment_date",
): Map<string, DividendEntry[]> {
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

      if (ignored.has(getEntryKey(d))) continue;

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
