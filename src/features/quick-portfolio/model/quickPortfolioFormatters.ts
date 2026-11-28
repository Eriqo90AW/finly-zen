import { getUsdRate } from "../../../utils/format";
import type { AssetCategory } from "../types";

export const parseLocaleFloat = (valString: string): number => {
  const sanitized = valString.replace(/,/g, ".");
  return Number.parseFloat(sanitized);
};

export const getCategory = (ticker: string): AssetCategory => {
  const t = ticker.toUpperCase();
  if (t.endsWith(".JK")) return "IDX";
  if (t.endsWith("-USD") || t === "BTC" || t === "BTC-USD") return "Crypto";
  return "Stocks";
};

export const getDisplayTicker = (ticker: string): string => {
  if (ticker.toUpperCase() === "BTC-USD") return "BTC";
  return ticker;
};

export const getCategoryIcon = (category: string): string => {
  if (category === "Crypto") return "currency_bitcoin";
  if (category === "IDX") return "show_chart";
  return "phone_iphone";
};

export const formatPortfolioPrice = (
  amount: number,
  nativeCurrency: "IDR" | "USD",
  displayCurrency: "IDR" | "USD",
): string => {
  let displayAmount = amount;
  if (nativeCurrency === "USD" && displayCurrency === "IDR") {
    displayAmount = amount * getUsdRate();
  } else if (nativeCurrency === "IDR" && displayCurrency === "USD") {
    displayAmount = amount / getUsdRate();
  }

  if (displayCurrency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(displayAmount);
};

export const formatRelativeTime = (ts: number | null, nowTs: number = Date.now()): string => {
  if (!ts) return "—";
  const diff = nowTs - ts;

  if (diff < 30_000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

  const d = new Date(ts);
  const nowD = new Date(nowTs);

  const isSameDay =
    d.getDate() === nowD.getDate() &&
    d.getMonth() === nowD.getMonth() &&
    d.getFullYear() === nowD.getFullYear();

  const yesterdayD = new Date(nowTs - 86_400_000);
  const isYesterday =
    d.getDate() === yesterdayD.getDate() &&
    d.getMonth() === yesterdayD.getMonth() &&
    d.getFullYear() === yesterdayD.getFullYear();

  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${mins}`;

  if (isSameDay) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  const monthStr = d.toLocaleString("en-US", { month: "short" });
  return `${monthStr} ${d.getDate()}, ${timeStr}`;
};
