const ACTIVE_PORTFOLIO_KEY = "finly_zen_active_portfolio_id";
const CURRENCY_VIEW_KEY = "finly_zen_currency_view";
const TARGET_ALLOCATIONS_PREFIX = "finly_zen_target_allocations_";

export const getInitialActivePortfolioId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
  } catch {
    return null;
  }
};

export const saveCurrencyView = (view: "IDR" | "USD"): void => {
  try {
    localStorage.setItem(CURRENCY_VIEW_KEY, view);
  } catch {
    // Ignore storage write errors (e.g., private mode)
  }
};

export const saveActivePortfolioId = (id: string | null): void => {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
};

export const getTargetAllocationsMap = (portfolioId: string): Record<string, number> => {
  try {
    const saved = localStorage.getItem(`${TARGET_ALLOCATIONS_PREFIX}${portfolioId}`);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          result[key] = value;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
};

export const saveAssetTargetAllocation = (
  portfolioId: string,
  assetId: string,
  targetAllocation: number,
): void => {
  const targets = getTargetAllocationsMap(portfolioId);
  targets[assetId] = targetAllocation;
  try {
    localStorage.setItem(`${TARGET_ALLOCATIONS_PREFIX}${portfolioId}`, JSON.stringify(targets));
  } catch {
    // Ignore storage write errors
  }
};
