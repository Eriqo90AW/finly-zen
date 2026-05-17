export const formatRupiah = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  return "Rp" + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatRupiahShort = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  if (amount >= 1000000) {
    const value = amount / 1000000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return "Rp" + formatted.replace(".", ",") + "jt";
  }
  if (amount >= 1000) {
    const value = amount / 1000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return "Rp" + formatted.replace(".", ",") + "rb";
  }
  return "Rp" + amount.toString();
};

export const formatMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatDateDetail = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${dateStr} ${timeStr} WIB`;
};

export const formatIconName = (name: string | undefined): string => {
  if (!name) return "";
  // Removes "Rounded", "Outlined", "Sharp" etc. if you want generic icons
  // or converts PascalCase to snake_case for the Material Icons font
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/Rounded|Outlined|Sharp/g, "")
    .toLowerCase();
};

export const formatUSD = (amount: number | null | undefined, decimals = 2): string => {
  if (amount == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatUSDCompact = (amount: number | null | undefined): string => {
  if (amount == null) return "$0";
  if (Math.abs(amount) >= 1000000000) {
    return "$" + (amount / 1000000000).toFixed(2) + "B";
  }
  if (Math.abs(amount) >= 1000000) {
    return "$" + (amount / 1000000).toFixed(2) + "M";
  }
  if (Math.abs(amount) >= 1000) {
    return "$" + (amount / 1000).toFixed(2) + "K";
  }
  return formatUSD(amount);
};

export const formatPercent = (amount: number | null | undefined, decimals = 2): string => {
  if (amount == null) return "0%";
  const value = amount * 100;
  return (value > 0 ? "+" : "") + value.toFixed(decimals) + "%";
};

export const formatMultiple = (amount: number | null | undefined): string => {
  if (amount == null) return "0.00x";
  return amount.toFixed(2) + "x";
};

export const formatNumericInput = (val: string): string => {
  if (!val) return "";
  const num = parseInt(val.replace(/\D/g, ""));
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};
export const formatHexColor = (c: string | null | undefined): string | undefined => {
  if (!c) return undefined;
  if (c.startsWith("0x")) {
    return "#" + c.substring(4); // Skip 0x and Alpha FF
  }
  return c;
};

import { createSignal } from "solid-js";

const [usdRate, setUsdRate] = createSignal(17400);
export const getUsdRate = () => usdRate();
export const setUsdExchangeRate = (rate: number) => setUsdRate(rate);

export const formatPortfolioValue = (amount: number, currency: 'IDR' | 'USD', isShort = false) => {
  if (currency === 'USD') {
    const usdAmount = amount / getUsdRate();
    return isShort ? formatUSDCompact(usdAmount) : formatUSD(usdAmount);
  }
  return isShort ? formatRupiahShort(amount) : formatRupiah(amount);
};

