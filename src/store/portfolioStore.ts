import { createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { createPortfolioDB, deletePortfolioDB } from "../data/portfolioData";
import type { Portfolio } from "../types";
import {
  getInitialActivePortfolioId,
  saveActivePortfolioId,
  saveAssetTargetAllocation,
  saveCurrencyView,
} from "./portfolioPersistence";
import {
  type AddTransactionParams,
  deleteAssetTransactionsInDb,
  fetchAllPortfoliosComputed,
  fetchSinglePortfolioComputed,
  persistCapitalAdjustment,
  persistCashDelta,
  persistNewTransaction,
} from "./portfolioSync";

interface PortfolioStore {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  currencyView: "IDR" | "USD";
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoadedBefore: boolean;
}

const DEFAULT_PORTFOLIO_STATE: PortfolioStore = {
  portfolios: [],
  activePortfolioId: getInitialActivePortfolioId(),
  currencyView: "IDR",
  isLoading: true,
  isRefreshing: false,
  hasLoadedBefore: false,
};

export const [portfolioState, setPortfolioState] =
  createStore<PortfolioStore>(DEFAULT_PORTFOLIO_STATE);

export const setCurrencyView = (view: "IDR" | "USD") => {
  setPortfolioState("currencyView", view);
  saveCurrencyView(view);
};

export const setActivePortfolioId = (id: string | null) => {
  setPortfolioState("activePortfolioId", id);
  saveActivePortfolioId(id);
};

export const loadPortfolios = async () => {
  const isFirstLoad = !portfolioState.hasLoadedBefore;
  if (isFirstLoad) {
    setPortfolioState("isLoading", true);
  }
  try {
    const computedPortfolios = await fetchAllPortfoliosComputed();
    setPortfolioState("portfolios", reconcile(computedPortfolios));
    setPortfolioState("hasLoadedBefore", true);
  } catch (e) {
    console.error("Failed to load portfolios:", e);
  } finally {
    if (isFirstLoad) {
      setPortfolioState("isLoading", false);
    }
  }
};

export const refreshPortfolio = async (portfolioId: string) => {
  setPortfolioState("isRefreshing", true);
  try {
    const computed = await fetchSinglePortfolioComputed(portfolioId);
    setPortfolioState("portfolios", (prev) => {
      const index = prev.findIndex((p) => p.id === portfolioId);
      if (index === -1) return prev;
      const copy = [...prev];
      copy[index] = computed;
      return copy;
    });
  } catch (e) {
    console.error(`Failed to refresh portfolio ${portfolioId}:`, e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const createPortfolio = async (
  name: string,
  initialCash: number,
  priceCurrency: number,
) => {
  setPortfolioState("isLoading", true);
  try {
    await createPortfolioDB(name, initialCash, priceCurrency);
    await loadPortfolios();
  } catch (e) {
    console.error("Failed to create portfolio:", e);
  } finally {
    setPortfolioState("isLoading", false);
  }
};

export const deletePortfolio = async (portfolioId: string) => {
  setPortfolioState("isLoading", true);
  try {
    await deletePortfolioDB(portfolioId);
    if (portfolioState.activePortfolioId === portfolioId) {
      setActivePortfolioId(null);
    }
    await loadPortfolios();
  } catch (e) {
    console.error("Failed to delete portfolio:", e);
  } finally {
    setPortfolioState("isLoading", false);
  }
};

export const addTransactionToPortfolio = async (
  portfolioId: string,
  txParams: AddTransactionParams,
) => {
  setPortfolioState("isRefreshing", true);
  try {
    await persistNewTransaction(portfolioId, txParams);
    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to add transaction to portfolio:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const deleteAssetFromPortfolio = async (portfolioId: string, assetId: string) => {
  setPortfolioState("isRefreshing", true);
  try {
    await deleteAssetTransactionsInDb(portfolioId, assetId);
    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to delete asset:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const addCapitalToPortfolio = async (
  portfolioId: string,
  amount: number,
  isAdjustment = false,
) => {
  setPortfolioState("isRefreshing", true);
  try {
    await persistCapitalAdjustment(portfolioId, amount, isAdjustment);
    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to manage capital:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const adjustPortfolioCash = async (portfolioId: string, newCash: number) => {
  setPortfolioState("isRefreshing", true);
  try {
    await refreshPortfolio(portfolioId);
    const portfolio = portfolioState.portfolios.find((x) => x.id === portfolioId);
    if (!portfolio) return;

    const updated = await persistCashDelta(portfolio, newCash);
    if (updated) {
      await refreshPortfolio(portfolioId);
    }
  } catch (e) {
    console.error("Failed to adjust portfolio cash:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const setAssetTargetAllocation = (
  portfolioId: string,
  assetId: string,
  targetAllocation: number,
) => {
  saveAssetTargetAllocation(portfolioId, assetId, targetAllocation);
  setPortfolioState(
    "portfolios",
    (p) => p.id === portfolioId,
    "assets",
    (a) => a.id === assetId,
    "targetAllocation",
    targetAllocation,
  );
};

export const setupPortfolioPersistence = () => {
  // Legacy function. LocalStorage persistence removed in favor of direct Supabase DB storage.
};

export const resetPortfolioState = () => {
  setPortfolioState(
    reconcile({
      portfolios: [],
      activePortfolioId: null,
      currencyView: "IDR",
      isLoading: false,
      isRefreshing: false,
      hasLoadedBefore: false,
    }),
  );
};

export const [quickPortfolioSearch, setQuickPortfolioSearch] = createSignal("");
