import type { Budget, DatePeriod } from "../types/store";

const parseEnvNumber = (val: string | undefined, fallback: number): number => {
  if (val === undefined || val === "") return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
};

export const DEFAULT_CATEGORY_TARGETS: Record<string, number> = {
  Food: parseEnvNumber(import.meta.env.VITE_TARGET_FOOD, 2400000),
  Groceries: parseEnvNumber(import.meta.env.VITE_TARGET_GROCERIES, 1200000),
  Utilities: parseEnvNumber(import.meta.env.VITE_TARGET_UTILITIES, 1205000),
  Transfer: parseEnvNumber(import.meta.env.VITE_TARGET_TRANSFER, 1400000),
  Shopping: parseEnvNumber(import.meta.env.VITE_TARGET_SHOPPING, 1200000),
  Transport: parseEnvNumber(import.meta.env.VITE_TARGET_TRANSPORT, 800000),
  Entertainment: parseEnvNumber(import.meta.env.VITE_TARGET_ENTERTAINMENT, 500000),
  Cash: parseEnvNumber(import.meta.env.VITE_TARGET_CASH, 300000),
  Healthcare: parseEnvNumber(import.meta.env.VITE_TARGET_HEALTHCARE, 200000),
  Health: parseEnvNumber(import.meta.env.VITE_TARGET_HEALTHCARE, 200000),
  Others: parseEnvNumber(import.meta.env.VITE_TARGET_OTHERS, 95000),
  Accommodation: parseEnvNumber(import.meta.env.VITE_TARGET_ACCOMMODATION, 0),
};

export const DEFAULT_BUDGETS: Budget[] = [
  { category: "Food", limit: DEFAULT_CATEGORY_TARGETS.Food },
  { category: "Transfer", limit: DEFAULT_CATEGORY_TARGETS.Transfer },
  { category: "Utilities", limit: DEFAULT_CATEGORY_TARGETS.Utilities },
  { category: "Groceries", limit: DEFAULT_CATEGORY_TARGETS.Groceries },
  { category: "Shopping", limit: DEFAULT_CATEGORY_TARGETS.Shopping },
  { category: "Transport", limit: DEFAULT_CATEGORY_TARGETS.Transport },
  { category: "Entertainment", limit: DEFAULT_CATEGORY_TARGETS.Entertainment },
  { category: "Cash", limit: DEFAULT_CATEGORY_TARGETS.Cash },
  { category: "Healthcare", limit: DEFAULT_CATEGORY_TARGETS.Healthcare },
  { category: "Others", limit: DEFAULT_CATEGORY_TARGETS.Others },
  { category: "Accommodation", limit: DEFAULT_CATEGORY_TARGETS.Accommodation },
].sort((a, b) => b.limit - a.limit);

export const DEFAULT_CONFIG = {
  dailyBudget: parseEnvNumber(import.meta.env.VITE_DEFAULT_DAILY_BUDGET, 300000),
  monthlyLimit: parseEnvNumber(import.meta.env.VITE_DEFAULT_MONTHLY_LIMIT, 9100000),
  userName: import.meta.env.VITE_DEFAULT_USER_NAME || "Eriqo",
  usdRate: parseEnvNumber(import.meta.env.VITE_DEFAULT_USD_RATE, 18000),
  datePeriod: (import.meta.env.VITE_DEFAULT_DATE_PERIOD as DatePeriod) || "1-30",
  ai: {
    baseUrl:
      import.meta.env.VITE_AI_BASE_URL ||
      import.meta.env.VITE_OPENCODE_BASE_URL ||
      "https://openagent.ercloud.site/v1",
    apiKey:
      import.meta.env.VITE_AI_API_KEY ||
      import.meta.env.VITE_OPENCODE_API_KEY ||
      "",
    defaultModel: import.meta.env.VITE_DEFAULT_MODEL || "finly",
    expenseModel: import.meta.env.VITE_EXPENSE_MODEL || "finly",
    marketModel: import.meta.env.VITE_MARKET_MODEL || "market_quant",
  },
  opencode: {
    baseUrl:
      import.meta.env.VITE_AI_BASE_URL ||
      import.meta.env.VITE_OPENCODE_BASE_URL ||
      "https://openagent.ercloud.site/v1",
    apiKey:
      import.meta.env.VITE_AI_API_KEY ||
      import.meta.env.VITE_OPENCODE_API_KEY ||
      "",
    model: import.meta.env.VITE_DEFAULT_MODEL || "finly",
  },
};

export const getCategoryDefaultTarget = (category: string): number => {
  const normalized = category.trim().toLowerCase();
  for (const [key, value] of Object.entries(DEFAULT_CATEGORY_TARGETS)) {
    if (key.toLowerCase() === normalized) return value;
  }
  return 0;
};

export const getCategoryFallbackColor = (category: string): string => {
  const normalized = category.trim().toLowerCase();
  switch (normalized) {
    case "food":
      return "#F59E0B";
    case "groceries":
      return "#059669";
    case "utilities":
      return "#F97316";
    case "transfer":
      return "#06B6D4";
    case "shopping":
      return "#EC4899";
    case "transport":
      return "#3B82F6";
    case "entertainment":
      return "#8B5CF6";
    case "cash":
      return "#6366F1";
    case "healthcare":
    case "health":
      return "#10B981";
    case "accommodation":
      return "#84CC16";
    case "others":
      return "#9CA3AF";
    default:
      return "#1A4D2E";
  }
};
