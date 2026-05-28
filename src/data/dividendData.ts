import type { DividendEntry } from "../types/dividend";
import rawDividendsJson from "../../sahamidx_dividends.json";

// Helper function to get today's date in local YYYY-MM-DD format (immune to timezone offset shifts)
function getLocalTodayStr(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper function to parse dates from DD-MMM-YYYY (e.g. 04-Jun-2026) to YYYY-MM-DD
function parseDateToISO(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    return dateStr;
  }
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
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

const rawAllDividends: DividendEntry[] = (rawDividendsJson as any[]).map((item) => {
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
    company_name: item.company_name,
    currency: item.currency,
    amount: Number(item.amount),
    cum_date: parsedCumDate,
    ex_date: parseDateToISO(item.ex_date),
    record_date: parseDateToISO(item.record_date),
    payment_date: parsedPaymentDate,
    frequency: item.frequency as any,
    year: Number(item.year),
    status: determinedStatus,
  };
});

const allDividends: DividendEntry[] = rawAllDividends;

export function getDividendsForMonth(year: number, month: number): DividendEntry[] {
  return allDividends.filter((d) => {
    const date = new Date(d.payment_date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getDividendsForDate(dateStr: string): DividendEntry[] {
  return allDividends.filter((d) => d.payment_date === dateStr);
}

export function getDividendsByStatus(status: DividendEntry["status"]): DividendEntry[] {
  return allDividends.filter((d) => d.status === status);
}

export function getUpcomingDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends.filter((d) => d.cum_date >= today && d.status !== "paid");
}

export function getPastDividends(): DividendEntry[] {
  const today = getLocalTodayStr();
  return allDividends.filter((d) => d.payment_date < today || d.status === "paid");
}

export function getCurrentDividends(): DividendEntry[] {
  const now = new Date();
  return allDividends.filter((d) => {
    const date = new Date(d.payment_date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function getAllDividends(): DividendEntry[] {
  return allDividends;
}
