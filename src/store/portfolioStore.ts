import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { Portfolio, PortfolioTransaction, PortfolioAsset, PortfolioHistoryPoint, PortfolioDB } from "../types";
import {
  getPortfolios,
  createPortfolioDB,
  deletePortfolioDB,
  getPortfolioTransactions,
  addPortfolioTransaction,
  upsertAsset,
  updatePortfolioCash,
  fetchMultiStockPrices,
} from "../data/portfolioData";
import { getUsdRate } from "../utils/format";
import { supabase } from "../lib/supabase";
import { getMarketStatus } from "../utils/marketTime";

interface PortfolioStore {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  currencyView: 'IDR' | 'USD';
  isLoading: boolean;
  isRefreshing: boolean;
}

const getInitialActivePortfolioId = (): string | null => {
  try {
    return localStorage.getItem("finly_zen_active_portfolio_id");
  } catch (e) {
    return null;
  }
};

const getInitialCurrencyView = (): 'IDR' | 'USD' => {
  try {
    return (localStorage.getItem("finly_zen_currency_view") as 'IDR' | 'USD') || 'IDR';
  } catch (e) {
    return 'IDR';
  }
};

const DEFAULT_PORTFOLIO_STATE: PortfolioStore = {
  portfolios: [],
  activePortfolioId: getInitialActivePortfolioId(),
  currencyView: getInitialCurrencyView(),
  isLoading: true,
  isRefreshing: false,
};

export const [portfolioState, setPortfolioState] = createStore<PortfolioStore>(DEFAULT_PORTFOLIO_STATE);

// Helpers
export const setCurrencyView = (view: 'IDR' | 'USD') => {
  setPortfolioState("currencyView", view);
  try {
    localStorage.setItem("finly_zen_currency_view", view);
  } catch (e) {}
};

export const setActivePortfolioId = (id: string | null) => {
  setPortfolioState("activePortfolioId", id);
  try {
    if (id) {
      localStorage.setItem("finly_zen_active_portfolio_id", id);
    } else {
      localStorage.removeItem("finly_zen_active_portfolio_id");
    }
  } catch (e) {}
};

// Compute standard portfolio aggregates
const computePortfolioState = (
  p: PortfolioDB,
  txs: any[],
  priceMap: Record<string, any>
): Portfolio => {
  const assets: PortfolioAsset[] = [];
  const tickers = Array.from(new Set(txs.map((tx) => tx.asset_ticker.toUpperCase())));

  tickers.forEach((ticker) => {
    const assetTxs = txs.filter((t) => t.asset_ticker.toUpperCase() === ticker);
    let totalShares = 0;
    let totalBuyQty = 0;
    let totalCostNative = 0;
    let totalCostIDR = 0;

    assetTxs.forEach((tx) => {
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.price_currency);

      if (tx.type === "BUY") {
        totalShares += qty;
        totalBuyQty += qty;
        totalCostNative += qty * price;
        totalCostIDR += qty * price * rate;
      } else if (tx.type === "SELL") {
        totalShares -= qty;
      }
    });

    if (totalShares > 0) {
      const assetCurrency = assetTxs[0]?.currency || "USD";
      const averagePriceIDR = totalBuyQty > 0 ? totalCostIDR / totalBuyQty : 0;
      const averagePriceNative = totalBuyQty > 0 ? totalCostNative / totalBuyQty : 0;

      const { session } = getMarketStatus();

      const prePriceNative =
        priceMap[ticker]?.pre_market_price ??
        priceMap[ticker]?.preMarketPrice ??
        priceMap[ticker]?.fundamentals?.price?.preMarketPrice ??
        null;
      const postPriceNative =
        priceMap[ticker]?.post_market_price ??
        priceMap[ticker]?.postMarketPrice ??
        priceMap[ticker]?.fundamentals?.price?.postMarketPrice ??
        null;

      const regularPriceNative = priceMap[ticker]?.current_price ?? averagePriceNative;

      const activePriceNative = (() => {
        if (session === "Pre-market" && prePriceNative !== null) {
          return prePriceNative;
        } else if (session === "After-hours" && postPriceNative !== null) {
          return postPriceNative;
        }
        return regularPriceNative;
      })();

      const livePriceIDR = assetCurrency === "USD" ? activePriceNative * getUsdRate() : activePriceNative;

      const prePriceIDR = prePriceNative !== null
        ? (assetCurrency === "USD" ? prePriceNative * getUsdRate() : prePriceNative)
        : null;
      const postPriceIDR = postPriceNative !== null
        ? (assetCurrency === "USD" ? postPriceNative * getUsdRate() : postPriceNative)
        : null;

      const currentValue = totalShares * livePriceIDR;
      const costBasis = totalShares * averagePriceIDR;
      const totalGainLoss = currentValue - costBasis;

      // Load target allocation from localStorage if available
      const savedTargets = localStorage.getItem(`finly_zen_target_allocations_${p.id}`);
      let targetAllocation = 0;
      if (savedTargets) {
        try {
          const parsed = JSON.parse(savedTargets);
          targetAllocation = parsed[ticker] || 0;
        } catch (e) {}
      }

      assets.push({
        id: ticker,
        ticker,
        name: priceMap[ticker]?.fundamentals?.price?.shortName || ticker,
        logoUrl: priceMap[ticker]?.logo_url || undefined,
        currentValue,
        totalGainLoss,
        actualAllocation: 0,
        targetAllocation,
        totalShares,
        averagePrice: averagePriceIDR,
        currentPrice: livePriceIDR,
        preMarketPrice: prePriceIDR,
        postMarketPrice: postPriceIDR,
      });
    }
  });

  const assetsValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalValue = Number(p.cash) + assetsValue;

  // Compute allocations
  const updatedAssets = assets.map((a) => ({
    ...a,
    actualAllocation: totalValue > 0 ? (a.currentValue / totalValue) * 100 : 0,
  }));

  const initialCapital = Number(p.initial_capital);
  const allTimeGain = assets.reduce((sum, a) => sum + a.totalGainLoss, 0);
  const assetsCost = assets.reduce((sum, a) => sum + a.totalShares * a.averagePrice, 0);
  const totalCost = Number(p.cash) + assetsCost;
  const allTimeGainPercentage = totalCost > 0 ? (allTimeGain / totalCost) * 100 : 0;

  const history: PortfolioHistoryPoint[] = [
    { date: p.created_at || new Date().toISOString(), value: initialCapital },
    { date: new Date().toISOString(), value: totalValue },
  ];

  return {
    id: p.id,
    name: p.name,
    cash: Number(p.cash),
    initialCapital,
    totalBuyingPower: Number(p.cash),
    totalValue,
    allTimeGain,
    allTimeGainPercentage,
    assets: updatedAssets,
    transactions: txs.map((tx) => {
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.price_currency);
      return {
        id: tx.id,
        assetId: tx.asset_ticker,
        ticker: tx.asset_ticker,
        type: tx.type,
        date: tx.transaction_date,
        shares: qty,
        pricePerShare: price * rate,
        totalAmount: qty * price * rate,
      };
    }),
    history,
  };
};

export const loadPortfolios = async () => {
  setPortfolioState("isLoading", true);
  try {
    const rawPortfolios = await getPortfolios();
    const allTxs: Record<string, any[]> = {};
    const tickersSet = new Set<string>();

    for (const rp of rawPortfolios) {
      const txs = await getPortfolioTransactions(rp.id);
      allTxs[rp.id] = txs;
      txs.forEach((tx) => tickersSet.add(tx.asset_ticker.toUpperCase()));
    }

    // Fetch stock prices once for all tickers
    const tickers = Array.from(tickersSet);
    const priceRes = await fetchMultiStockPrices(tickers);
    const priceMap: Record<string, any> = {};
    (priceRes.data || []).forEach((item) => {
      priceMap[item.symbol.toUpperCase()] = item;
    });

    const computedPortfolios = rawPortfolios.map((rp) =>
      computePortfolioState(rp, allTxs[rp.id] || [], priceMap)
    );

    setPortfolioState("portfolios", reconcile(computedPortfolios));
  } catch (e) {
    console.error("Failed to load portfolios:", e);
  } finally {
    setPortfolioState("isLoading", false);
  }
};

export const refreshPortfolio = async (portfolioId: string) => {
  setPortfolioState("isRefreshing", true);
  try {
    const { data: rp, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("id", portfolioId)
      .single();

    if (error) throw error;

    const txs = await getPortfolioTransactions(portfolioId);
    const tickers = Array.from(new Set(txs.map((tx) => tx.asset_ticker.toUpperCase())));
    const priceRes = await fetchMultiStockPrices(tickers);
    const priceMap: Record<string, any> = {};
    (priceRes.data || []).forEach((item) => {
      priceMap[item.symbol.toUpperCase()] = item;
    });

    const computed = computePortfolioState(rp, txs, priceMap);

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

export const createPortfolio = async (name: string, initialCash: number) => {
  setPortfolioState("isLoading", true);
  try {
    await createPortfolioDB(name, initialCash);
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
  txParams: {
    ticker: string;
    qty: number;
    pricePerUnit: number;
    priceCurrency: number;
    currency: string;
    type: "BUY" | "SELL";
    notes: string;
    transactionDate: string;
  }
) => {
  setPortfolioState("isRefreshing", true);
  try {
    // 1. Fetch live metadata to upsert asset first
    const priceRes = await fetchMultiStockPrices([txParams.ticker]);
    const stockItem = priceRes.data?.[0];
    if (stockItem && stockItem.success) {
      await upsertAsset(stockItem);
    } else {
      // Create bare asset if API doesn't find it to avoid FK failure
      await upsertAsset({
        symbol: txParams.ticker,
        success: true,
        logo_url: "",
        current_price: txParams.pricePerUnit,
        pre_market_price: null,
        post_market_price: null,
        extended_hours_price: txParams.pricePerUnit,
        fundamentals: {
          summaryDetail: {},
          summaryProfile: {},
          price: { shortName: txParams.ticker },
        },
      });
    }

    // 2. Add transaction in DB
    await addPortfolioTransaction({
      portfolio_id: portfolioId,
      asset_ticker: txParams.ticker.toUpperCase(),
      type: txParams.type,
      qty: txParams.qty,
      price_per_unit: txParams.pricePerUnit,
      price_currency: txParams.priceCurrency,
      currency: txParams.currency,
      notes: txParams.notes || null,
      transaction_date: txParams.transactionDate,
    });

    // 3. Update cash balance in portfolio DB
    const { data: pData, error: pError } = await supabase
      .from("portfolios")
      .select("cash")
      .eq("id", portfolioId)
      .single();

    if (pError) throw pError;

    const amountIDR = txParams.qty * txParams.pricePerUnit * txParams.priceCurrency;
    const cashChange = txParams.type === "BUY" ? -amountIDR : amountIDR;
    const newCash = Number(pData.cash) + cashChange;

    await updatePortfolioCash(portfolioId, newCash);

    // 4. Refresh portfolio state
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
    const { data: p, error: pError } = await supabase
      .from("portfolios")
      .select("cash")
      .eq("id", portfolioId)
      .single();

    if (pError) throw pError;

    const { data: txs, error: txsError } = await supabase
      .from("portfolio_transactions")
      .select("type, qty, price_per_unit, price_currency")
      .eq("portfolio_id", portfolioId)
      .eq("asset_ticker", assetId);

    if (txsError) throw txsError;

    let cashAdjustment = 0;
    (txs || []).forEach((tx) => {
      const amountIDR = Number(tx.qty) * Number(tx.price_per_unit) * Number(tx.price_currency);
      if (tx.type === "BUY") {
        cashAdjustment += amountIDR;
      } else {
        cashAdjustment -= amountIDR;
      }
    });

    const newCash = Number(p.cash) + cashAdjustment;

    await updatePortfolioCash(portfolioId, newCash);

    const { error: deleteError } = await supabase
      .from("portfolio_transactions")
      .delete()
      .eq("portfolio_id", portfolioId)
      .eq("asset_ticker", assetId);

    if (deleteError) throw deleteError;

    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to delete asset:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const addCapitalToPortfolio = async (portfolioId: string, amount: number, isAdjustment: boolean = false) => {
  setPortfolioState("isRefreshing", true);
  try {
    const { data: p, error } = await supabase
      .from("portfolios")
      .select("cash, initial_capital")
      .eq("id", portfolioId)
      .single();

    if (error) throw error;

    const currentCash = Number(p.cash);
    const currentInitial = Number(p.initial_capital);

    const newCash = isAdjustment ? currentCash : currentCash + amount;
    const newInitialCapital = isAdjustment ? amount : currentInitial + amount;

    const { error: updateError } = await supabase
      .from("portfolios")
      .update({
        cash: newCash,
        initial_capital: newInitialCapital,
      })
      .eq("id", portfolioId);

    if (updateError) throw updateError;

    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to manage capital:", e);
  } finally {
    setPortfolioState("isRefreshing", false);
  }
};

export const setAssetTargetAllocation = (portfolioId: string, assetId: string, targetAllocation: number) => {
  const key = `finly_zen_target_allocations_${portfolioId}`;
  const saved = localStorage.getItem(key);
  let targets: Record<string, number> = {};
  if (saved) {
    try {
      targets = JSON.parse(saved);
    } catch (e) {}
  }
  targets[assetId] = targetAllocation;
  localStorage.setItem(key, JSON.stringify(targets));

  setPortfolioState(
    "portfolios",
    (p) => p.id === portfolioId,
    "assets",
    (a) => a.id === assetId,
    "targetAllocation",
    targetAllocation
  );
};

export const setupPortfolioPersistence = () => {
  // Legacy function. LocalStorage persistence removed in favor of direct Supabase DB storage.
};
