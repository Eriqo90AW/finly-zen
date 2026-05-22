export const formatRupiah = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);
  return (amount < 0 ? "-" : "") + "Rp" + formatted;
};

export const formatRupiahShort = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absAmount >= 1000000) {
    const value = absAmount / 1000000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return sign + "Rp" + formatted.replace(".", ",") + "jt";
  }
  if (absAmount >= 1000) {
    const value = absAmount / 1000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return sign + "Rp" + formatted.replace(".", ",") + "rb";
  }
  return sign + "Rp" + absAmount.toString();
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
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absAmount >= 1000000000) {
    return sign + "$" + (absAmount / 1000000000).toFixed(2) + "B";
  }
  if (absAmount >= 1000000) {
    return sign + "$" + (absAmount / 1000000).toFixed(2) + "M";
  }
  if (absAmount >= 1000) {
    return sign + "$" + (absAmount / 1000).toFixed(2) + "K";
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

export const formatUSDInput = (val: string): string => {
  if (!val) return "";
  const parts = val.split(".");
  const integerPart = parseInt(parts[0].replace(/\D/g, ""));
  if (isNaN(integerPart) && parts.length === 1) return "";

  const formattedInteger = isNaN(integerPart)
    ? ""
    : new Intl.NumberFormat("en-US").format(integerPart);

  if (parts.length > 1) {
    return formattedInteger + "." + parts[1];
  }
  return formattedInteger;
};
export const formatHexColor = (c: string | null | undefined): string | undefined => {
  if (!c) return undefined;
  if (c.startsWith("0x")) {
    return "#" + c.substring(4); // Skip 0x and Alpha FF
  }
  return c;
};

import { createSignal } from "solid-js";

const [usdRate, setUsdRate] = createSignal(Number(import.meta.env.VITE_DEFAULT_USD_RATE) || 17400);
export const getUsdRate = () => usdRate();
export const setUsdExchangeRate = (rate: number) => setUsdRate(rate);

export const formatPortfolioValue = (
  amount: number,
  displayCurrency: 'IDR' | 'USD',
  isShort = false,
  nativeCurrency: 'IDR' | 'USD' = 'IDR',
  customRate?: number,
) => {
  let displayAmount = amount;

  if (nativeCurrency === 'USD' && displayCurrency === 'IDR') {
    // USD Portfolio → display as IDR: multiply by customRate if provided, otherwise live rate
    displayAmount = amount * (customRate !== undefined ? customRate : getUsdRate());
  } else if (nativeCurrency === 'IDR' && displayCurrency === 'USD') {
    // IDR Portfolio → display as USD: divide by customRate if provided, otherwise live rate
    displayAmount = amount / (customRate !== undefined ? customRate : getUsdRate());
  }
  // If displayCurrency === nativeCurrency, no conversion is needed

  if (displayCurrency === 'USD') {
    return isShort ? formatUSDCompact(displayAmount) : formatUSD(displayAmount);
  }
  return isShort ? formatRupiahShort(displayAmount) : formatRupiah(displayAmount);
};

export const getCurrencyPills = (isIDR: boolean) => {
  if (isIDR) {
    return [
      { label: "Rp1.000.000", value: "1000000" },
      { label: "Rp5.000.000", value: "5000000" },
      { label: "Rp10.000.000", value: "10000000" },
    ];
  } else {
    return [
      { label: "$100", value: "100" },
      { label: "$200", value: "200" },
      { label: "$500", value: "500" },
    ];
  }
};

export const calculateDisplayGainAndPercentage = (
  totalValue: number,
  initialCapital: number,
  priceCurrency: number,
  nativeCurrency: 'IDR' | 'USD',
  displayCurrency: 'IDR' | 'USD',
) => {
  // 1. Calculate Total Value in Display Currency
  // Total Value is always converted using the current live rate (getUsdRate())
  let displayTotalValue = totalValue;
  if (nativeCurrency === 'USD' && displayCurrency === 'IDR') {
    displayTotalValue = totalValue * getUsdRate();
  } else if (nativeCurrency === 'IDR' && displayCurrency === 'USD') {
    displayTotalValue = totalValue / getUsdRate();
  }

  // 2. Calculate Initial Capital in Display Currency
  // Initial Capital is converted using the historical rate (priceCurrency)
  let displayInitialCapital = initialCapital;
  if (nativeCurrency === 'USD' && displayCurrency === 'IDR') {
    displayInitialCapital = initialCapital * priceCurrency;
  } else if (nativeCurrency === 'IDR' && displayCurrency === 'USD') {
    displayInitialCapital = initialCapital / priceCurrency;
  }

  // 3. Calculate Gain in Display Currency
  const displayGain = displayTotalValue - displayInitialCapital;

  // 4. Calculate Gain Percentage in Display Currency
  const displayGainPercentage = displayInitialCapital > 0 
    ? (displayGain / displayInitialCapital) * 100 
    : 0;

  return {
    gain: displayGain,
    percentage: displayGainPercentage,
    isPositive: displayGain >= 0,
  };
};
