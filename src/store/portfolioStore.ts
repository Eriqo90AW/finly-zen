import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount, createSignal } from "solid-js";
import type { Portfolio, PortfolioTransaction, PortfolioAsset, PortfolioHistoryPoint, PortfolioDB } from "../types";
import {
  getPortfolios,
  createPortfolioDB,
  deletePortfolioDB,
  getPortfolioTransactions,
  addPortfolioTransaction,
  upsertAsset,
  updatePortfolioCash,
  setPortfolioCashAndInitial,
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
  hasLoadedBefore: boolean;
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
  currencyView: 'IDR',
  isLoading: true,
  isRefreshing: false,
  hasLoadedBefore: false,
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
  priceMap: Record<string, any>,
  dbAssetsMap: Record<string, any> = {}
): Portfolio => {
  const assets: PortfolioAsset[] = [];
  const tickers = Array.from(
    new Set(
      txs
        .map((tx) => tx.asset_ticker.toUpperCase())
        .filter((ticker) => ticker !== "USD" && ticker !== "IDR")
    )
  );

  const isUSD = p.base_currency === "USD";
  const portfolioRate = isUSD ? getUsdRate() : 1;

  tickers.forEach((ticker) => {
    const assetTxs = txs.filter((t) => t.asset_ticker.toUpperCase() === ticker);
    let totalShares = 0;
    let totalBuyQty = 0;
    let totalCostNative = 0;
    let totalCostIDR = 0;

    assetTxs.forEach((tx) => {
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.fx_rate_to_base);

      if (tx.type === "BUY") {
        totalShares += qty;
        totalBuyQty += qty;
        totalCostNative += qty * price;
        totalCostIDR += qty * price * rate;
      } else if (tx.type === "SELL") {
        totalShares -= qty;
      }
    });
    
    // Round totalShares to 8 decimal places to handle floating-point precision errors (e.g. 3.6 - 1.2 - 2.4 = 1.11e-16)
    totalShares = Math.round(totalShares * 1e8) / 1e8;

    if (totalShares > 0) {
      const assetCurrency = assetTxs[0]?.settlement_currency || "USD";
      const assetConversionRate = Number(assetTxs[0]?.fx_rate_to_base) || 1;
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

      const marketCurrency = priceMap[ticker]?.fundamentals?.price?.currency || (ticker.toUpperCase().endsWith(".JK") ? "IDR" : "USD");

      const livePrice = isUSD
        ? (marketCurrency === "USD" ? activePriceNative : activePriceNative / getUsdRate())
        : (marketCurrency === "USD" ? activePriceNative * getUsdRate() : activePriceNative);

      const prePrice = prePriceNative !== null
        ? (isUSD
            ? (marketCurrency === "USD" ? prePriceNative : prePriceNative / getUsdRate())
            : (marketCurrency === "USD" ? prePriceNative * getUsdRate() : prePriceNative))
        : null;

      const postPrice = postPriceNative !== null
        ? (isUSD
            ? (marketCurrency === "USD" ? postPriceNative : postPriceNative / getUsdRate())
            : (marketCurrency === "USD" ? postPriceNative * getUsdRate() : postPriceNative))
        : null;

      const averagePrice = isUSD
        ? (assetCurrency === "USD" ? averagePriceNative : averagePriceNative / getUsdRate())
        : averagePriceIDR;

      const previousCloseNative =
        priceMap[ticker]?.fundamentals?.summaryDetail?.previousClose ??
        priceMap[ticker]?.fundamentals?.price?.regularMarketPreviousClose ??
        null;

      const previousClose = previousCloseNative !== null
        ? (isUSD
            ? (marketCurrency === "USD" ? previousCloseNative : previousCloseNative / getUsdRate())
            : (marketCurrency === "USD" ? previousCloseNative * getUsdRate() : previousCloseNative))
        : null;

      const dayChange = previousClose !== null ? totalShares * (livePrice - previousClose) : 0;
      const dayChangePct = previousClose !== null && previousClose > 0
        ? ((livePrice - previousClose) / previousClose) * 100
        : 0;

      const currentValue = totalShares * livePrice;
      const costBasis = totalShares * averagePrice;
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

      const dbAsset = dbAssetsMap[ticker];

      assets.push({
        id: ticker,
        ticker,
        name: (dbAsset?.name && dbAsset.name.toUpperCase() !== ticker.toUpperCase() ? dbAsset.name : undefined)
          || priceMap[ticker]?.company_name 
          || priceMap[ticker]?.fundamentals?.price?.longName 
          || priceMap[ticker]?.fundamentals?.price?.shortName 
          || priceMap[ticker]?.fundamentals?.summaryProfile?.longName 
          || ticker,
        logoUrl: dbAsset?.logo_url || priceMap[ticker]?.logo_url || undefined,
        currency: assetCurrency,
        conversionRate: assetConversionRate,
        currentValue,
        totalGainLoss,
        actualAllocation: 0,
        targetAllocation,
        totalShares,
        averagePrice,
        currentPrice: livePrice,
        preMarketPrice: prePrice,
        postMarketPrice: postPrice,
        previousClose,
        dayChange,
        dayChangePct,
      });
    }
  });

  const hasFiatTransactions = txs.some(tx => {
    const ticker = tx.asset_ticker.toUpperCase();
    return ticker === "USD" || ticker === "IDR";
  });

  let portfolioCash = 0;
  let initialCapital = 0;

  if (hasFiatTransactions) {
    let balanceUSD = 0;
    let balanceIDR = 0;
    let investedCapital = 0;

    txs.forEach((tx) => {
      const ticker = tx.asset_ticker.toUpperCase();
      const qty = Number(tx.qty);
      const type = tx.type;
      const rate = Number(tx.fx_rate_to_base || 1);

      const factor = (type === "DEPOSIT" || type === "BUY") ? 1 : -1;

      if (ticker === "USD") {
        balanceUSD += qty * factor;
        if (!tx.linked_transaction_id && (type === "DEPOSIT" || type === "WITHDRAWAL")) {
          investedCapital += qty * rate * factor;
        }
      } else if (ticker === "IDR") {
        balanceIDR += qty * factor;
        if (!tx.linked_transaction_id && (type === "DEPOSIT" || type === "WITHDRAWAL")) {
          investedCapital += qty * rate * factor;
        }
      }
    });

    if (isUSD) {
      portfolioCash = balanceUSD + (balanceIDR / getUsdRate());
    } else {
      portfolioCash = balanceIDR + (balanceUSD * getUsdRate());
    }
    initialCapital = investedCapital;
  } else {
    portfolioCash = 0;
    initialCapital = 0;
  }

  const assetsValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalValue = portfolioCash + assetsValue;

  // Compute allocations
  const updatedAssets = assets.map((a) => ({
    ...a,
    actualAllocation: totalValue > 0 ? (a.currentValue / totalValue) * 100 : 0,
  }));

  const allTimeGain = totalValue - initialCapital;
  const allTimeGainPercentage = initialCapital > 0 ? (allTimeGain / initialCapital) * 100 : 0;


  const history: PortfolioHistoryPoint[] = [
    { date: p.created_at || new Date().toISOString(), value: initialCapital },
    { date: new Date().toISOString(), value: totalValue },
  ];

  return {
    id: p.id,
    name: p.name,
    cash: portfolioCash,
    initialCapital,
    totalBuyingPower: portfolioCash,
    totalValue,
    allTimeGain,
    allTimeGainPercentage,
    assets: updatedAssets,
    price_currency: portfolioRate,
    nativeCurrency: isUSD ? 'USD' : 'IDR',
    updated_at: p.updated_at,
    transactions: txs.map((tx) => {
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.fx_rate_to_base || 1);
      const txCurrency = tx.settlement_currency || "USD";

      let pricePerShare = price;
      if (isUSD) {
        if (txCurrency !== "USD") {
          pricePerShare = price / rate;
        }
      } else {
        if (txCurrency === "USD") {
          pricePerShare = price * rate;
        }
      }

      return {
        id: tx.id,
        assetId: tx.asset_ticker,
        ticker: tx.asset_ticker,
        type: tx.type,
        date: tx.transaction_date,
        shares: qty,
        pricePerShare: pricePerShare,
        totalAmount: qty * pricePerShare,
        linked_transaction_id: tx.linked_transaction_id,
      };
    }),
    history,
  };
};

export const loadPortfolios = async () => {
  const isFirstLoad = !portfolioState.hasLoadedBefore;
  if (isFirstLoad) {
    setPortfolioState("isLoading", true);
  }
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

    // Fetch DB assets to load custom logos and names
    const { data: dbAssets, error: dbAssetsError } = await supabase
      .from("assets")
      .select("ticker, name, logo_url")
      .in("ticker", tickers);

    const dbAssetsMap: Record<string, any> = {};
    if (!dbAssetsError && dbAssets) {
      dbAssets.forEach((a) => {
        dbAssetsMap[a.ticker.toUpperCase()] = a;
      });
    }

    const computedPortfolios = rawPortfolios.map((rp) =>
      computePortfolioState(rp, allTxs[rp.id] || [], priceMap, dbAssetsMap)
    );

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

    // Fetch DB assets to load custom logos and names
    const { data: dbAssets, error: dbAssetsError } = await supabase
      .from("assets")
      .select("ticker, name, logo_url")
      .in("ticker", tickers);

    const dbAssetsMap: Record<string, any> = {};
    if (!dbAssetsError && dbAssets) {
      dbAssets.forEach((a) => {
        dbAssetsMap[a.ticker.toUpperCase()] = a;
      });
    }

    const computed = computePortfolioState(rp, txs, priceMap, dbAssetsMap);

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

export const createPortfolio = async (name: string, initialCash: number, priceCurrency: number) => {
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
    const assetTx = await addPortfolioTransaction({
      portfolio_id: portfolioId,
      asset_ticker: txParams.ticker.toUpperCase(),
      type: txParams.type,
      qty: txParams.qty,
      price_per_unit: txParams.pricePerUnit,
      fx_rate_to_base: txParams.priceCurrency,
      settlement_currency: txParams.currency,
      notes: txParams.notes || null,
      transaction_date: txParams.transactionDate,
      linked_transaction_id: null,
    });

    // 3. Add linked fiat cash transaction (double-entry ledger rule)
    const txAmount = txParams.qty * txParams.pricePerUnit;
    const cashTxType = txParams.type === "BUY" ? "WITHDRAWAL" : "DEPOSIT";

    await addPortfolioTransaction({
      portfolio_id: portfolioId,
      asset_ticker: txParams.currency.toUpperCase(),
      type: cashTxType,
      qty: txAmount,
      price_per_unit: 1,
      fx_rate_to_base: txParams.priceCurrency,
      settlement_currency: txParams.currency,
      notes: `Cash adjustment for ${txParams.type} ${txParams.ticker}`,
      transaction_date: txParams.transactionDate,
      linked_transaction_id: assetTx.id,
    });

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
    // Delete parent asset transactions.
    // The DB foreign key ON DELETE CASCADE will automatically delete the linked cash transactions!
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
      .select("base_currency")
      .eq("id", portfolioId)
      .single();

    if (error) throw error;

    const isUSD = p.base_currency === "USD";
    const rate = isUSD ? getUsdRate() : 1;
    const currency = isUSD ? "USD" : "IDR";

    // Insert capital deposit or withdrawal transaction (double-entry ledger)
    await addPortfolioTransaction({
      portfolio_id: portfolioId,
      asset_ticker: currency,
      type: amount >= 0 ? "DEPOSIT" : "WITHDRAWAL",
      qty: Math.abs(amount),
      price_per_unit: 1,
      fx_rate_to_base: rate,
      settlement_currency: currency,
      notes: isAdjustment ? "Capital Adjustment" : "Capital Deposit/Withdrawal",
      transaction_date: new Date().toISOString(),
      linked_transaction_id: null,
    });

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
    // 1. Fetch current portfolio to find current cash
    await refreshPortfolio(portfolioId);
    const p = portfolioState.portfolios.find(x => x.id === portfolioId);
    if (!p) return;

    const currentCash = p.cash;
    const delta = newCash - currentCash;
    if (Math.abs(delta) < 0.0001) return;

    const rate = Number(p.price_currency || 1);
    const currency = p.nativeCurrency;

    // 2. Insert standalone cash transaction to cover the delta
    await addPortfolioTransaction({
      portfolio_id: portfolioId,
      asset_ticker: currency,
      type: delta > 0 ? "DEPOSIT" : "WITHDRAWAL",
      qty: Math.abs(delta),
      price_per_unit: 1,
      fx_rate_to_base: rate,
      settlement_currency: currency,
      notes: "Manual cash balance adjustment",
      transaction_date: new Date().toISOString(),
      linked_transaction_id: null,
    });

    await refreshPortfolio(portfolioId);
  } catch (e) {
    console.error("Failed to adjust portfolio cash:", e);
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

export const [quickPortfolioSearch, setQuickPortfolioSearch] = createSignal("");
