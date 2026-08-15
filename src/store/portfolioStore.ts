import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount, createSignal } from "solid-js";
import type {
  Portfolio,
  PortfolioTransaction,
  PortfolioAsset,
  PortfolioHistoryPoint,
  PortfolioDB,
  PortfolioHoldingDB,
  PortfolioTransactionDB,
} from "../types";
import {
  getPortfolios,
  createPortfolioDB,
  deletePortfolioDB,
  getPortfolioTransactions,
  getPortfolioHoldings,
  addPortfolioTransaction,
  upsertAsset,
  updatePortfolioCash,
  setPortfolioCashAndInitial,
  fetchMultiStockPrices,
  fetchUsdRate,
} from "../data/portfolioData";
import { getUsdRate, setUsdExchangeRate } from "../utils/format";
import { supabase } from "../lib/supabase";
import { getMarketStatus } from "../utils/marketTime";
import { getCachedLogo, setCachedLogo, saveCachedLogos, preloadImages } from "../utils/logoCache";

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

// Compute standard portfolio aggregates following the exact mathematical specification
const computePortfolioState = (
  p: PortfolioDB,
  holdings: PortfolioHoldingDB[],
  txs: PortfolioTransactionDB[],
  priceMap: Record<string, any>,
  fxRate: number,
  dbAssetsMap: Record<string, any> = {}
): Portfolio => {
  const assets: PortfolioAsset[] = [];

  // Source of Truth 1: Initial Capital from the single DEPOSIT row in portfolio_transactions
  const depositTx = txs.find((t) => t.type === "DEPOSIT");
  const TOTAL_CAPITAL_IDR = depositTx
    ? Number(depositTx.qty) * Number(depositTx.fx_rate_to_base || 1)
    : 0;

  // Source of Truth 2: Positions (qty) from portfolio_holdings view (excluding FIAT and <= 0)
  const activeHoldings = (holdings || []).filter(
    (h) =>
      h.category !== "FIAT" &&
      h.asset.toUpperCase() !== "IDR" &&
      h.asset.toUpperCase() !== "USD" &&
      Number(h.quantity) > 0
  );

  // Fallback: If portfolio_holdings is empty, derive active positions from transactions
  const positionMap = new Map<string, { qty: number; icon?: string | null; category?: string }>();
  if (activeHoldings.length > 0) {
    activeHoldings.forEach((h) => {
      positionMap.set(h.asset.toUpperCase(), {
        qty: Number(h.quantity),
        icon: h.icon,
        category: h.category,
      });
    });
  } else {
    // Aggregated BUY.qty - SELL.qty from txs
    const uniqueTickers = Array.from(
      new Set(
        txs
          .map((tx) => tx.asset_ticker.toUpperCase())
          .filter((t) => t !== "USD" && t !== "IDR")
      )
    );
    uniqueTickers.forEach((ticker) => {
      const assetTxs = txs.filter((t) => t.asset_ticker.toUpperCase() === ticker);
      let shares = 0;
      assetTxs.forEach((t) => {
        const qty = Number(t.qty);
        if (t.type === "BUY") shares += qty;
        else if (t.type === "SELL") shares -= qty;
      });
      shares = Math.round(shares * 1e8) / 1e8;
      if (shares > 0) {
        positionMap.set(ticker, { qty: shares });
      }
    });
  }

  const { session } = getMarketStatus();

  positionMap.forEach((pos, ticker) => {
    const qty = pos.qty;
    const isIdx = ticker.endsWith(".JK") || pos.category === "IDX";
    const isCrypto =
      ticker.endsWith("-USD") ||
      ticker === "BTC" ||
      ticker === "ETH" ||
      pos.category === "CRYPTO";

    // Source of Truth 3: Cost basis from portfolio_transactions where type = 'BUY'
    const buyTxs = txs.filter(
      (t) => t.asset_ticker.toUpperCase() === ticker && t.type === "BUY"
    );
    const totalBuyQty = buyTxs.reduce((sum, t) => sum + Number(t.qty), 0);
    const totalBuyCostIDR = buyTxs.reduce((sum, t) => {
      const tQty = Number(t.qty);
      const tPrice = Number(t.price_per_unit);
      const tRate = Number(t.fx_rate_to_base || 1);
      return sum + tQty * tPrice * tRate;
    }, 0);

    const avgCostPerUnitIDR = totalBuyQty > 0 ? totalBuyCostIDR / totalBuyQty : 0;
    const cost_basis_idr = qty * avgCostPerUnitIDR;

    const assetCurrency = buyTxs[0]?.settlement_currency || (isIdx ? "IDR" : "USD");
    const assetConversionRate =
      Number(buyTxs[0]?.fx_rate_to_base) || (assetCurrency === "USD" ? fxRate : 1);

    // Live Market Price lookup from v2-multi-stock
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
    const regularPriceNative =
      priceMap[ticker]?.current_price ?? (buyTxs[0]?.price_per_unit || 0);

    const activePriceNative = (() => {
      if (session === "Pre-market" && prePriceNative !== null) return prePriceNative;
      if (session === "After-hours" && postPriceNative !== null) return postPriceNative;
      return regularPriceNative;
    })();

    // Compute Market Value per position:
    // - US stock: qty * price_usd * fx_usd_idr
    // - IDX stock (.JK): qty * price_idr (no FX conversion)
    // - Crypto (BTC-USD, ETH-USD): qty * price_usd * fx_usd_idr
    let market_val_idr = 0;
    let livePrice = 0;

    if (isIdx) {
      market_val_idr = qty * activePriceNative;
      livePrice = activePriceNative;
    } else {
      // US stock or Crypto
      market_val_idr = qty * activePriceNative * fxRate;
      livePrice = activePriceNative * fxRate;
    }

    // Compute P&L per position
    const unrealized_pnl_idr = market_val_idr - cost_basis_idr;

    // Previous close & 24h Day Change
    const previousCloseNative =
      priceMap[ticker]?.fundamentals?.summaryDetail?.previousClose ??
      priceMap[ticker]?.fundamentals?.price?.regularMarketPreviousClose ??
      null;

    const previousClose =
      previousCloseNative !== null
        ? isIdx
          ? previousCloseNative
          : previousCloseNative * fxRate
        : null;

    const dayChange =
      previousCloseNative !== null
        ? isIdx
          ? qty * (activePriceNative - previousCloseNative)
          : qty * (activePriceNative - previousCloseNative) * fxRate
        : 0;

    const dayChangePct =
      previousCloseNative !== null && previousCloseNative > 0
        ? ((activePriceNative - previousCloseNative) / previousCloseNative) * 100
        : 0;

    // Target Allocation from localStorage
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
      name:
        (dbAsset?.name && dbAsset.name.toUpperCase() !== ticker.toUpperCase()
          ? dbAsset.name
          : undefined) ||
        priceMap[ticker]?.company_name ||
        priceMap[ticker]?.fundamentals?.price?.longName ||
        priceMap[ticker]?.fundamentals?.price?.shortName ||
        priceMap[ticker]?.fundamentals?.summaryProfile?.longName ||
        ticker,
      logoUrl: (() => {
        const resolved = pos.icon || dbAsset?.logo_url || priceMap[ticker]?.logo_url || getCachedLogo(ticker) || undefined;
        if (resolved) {
          setCachedLogo(ticker, resolved);
        }
        return resolved;
      })(),
      currency: assetCurrency,
      conversionRate: assetConversionRate,
      currentValue: market_val_idr,
      totalGainLoss: unrealized_pnl_idr,
      actualAllocation: 0,
      targetAllocation,
      totalShares: qty,
      averagePrice: avgCostPerUnitIDR,
      currentPrice: livePrice,
      preMarketPrice:
        prePriceNative !== null
          ? isIdx
            ? prePriceNative
            : prePriceNative * fxRate
          : null,
      postMarketPrice:
        postPriceNative !== null
          ? isIdx
            ? postPriceNative
            : postPriceNative * fxRate
          : null,
      previousClose,
      dayChange,
      dayChangePct,
    });
  });

  // Compute totals
  const total_cost_basis_idr = assets.reduce(
    (sum, a) => sum + (a.currentValue - a.totalGainLoss),
    0
  );
  const total_market_value_idr = assets.reduce(
    (sum, a) => sum + a.currentValue,
    0
  );
  const total_unrealized_pnl = total_market_value_idr - total_cost_basis_idr;

  // Cash (the critical formula)
  // cash_available_idr = TOTAL_CAPITAL_IDR - total_cost_basis_idr
  const cash_available_idr = TOTAL_CAPITAL_IDR - total_cost_basis_idr;

  // Total portfolio value:
  // portfolio_value_idr = cash_available_idr + total_market_value_idr
  //                     = TOTAL_CAPITAL_IDR + total_unrealized_pnl
  const portfolio_value_idr = cash_available_idr + total_market_value_idr;

  const allTimeGain = total_unrealized_pnl;
  const allTimeGainPercentage =
    TOTAL_CAPITAL_IDR > 0 ? (total_unrealized_pnl / TOTAL_CAPITAL_IDR) * 100 : 0;

  // Compute allocations
  const updatedAssets = assets.map((a) => ({
    ...a,
    actualAllocation:
      portfolio_value_idr > 0 ? (a.currentValue / portfolio_value_idr) * 100 : 0,
  }));

  const history: PortfolioHistoryPoint[] = [
    { date: p.created_at || new Date().toISOString(), value: TOTAL_CAPITAL_IDR },
    { date: new Date().toISOString(), value: portfolio_value_idr },
  ];

  return {
    id: p.id,
    name: p.name,
    cash: cash_available_idr,
    initialCapital: TOTAL_CAPITAL_IDR,
    totalBuyingPower: cash_available_idr,
    totalValue: portfolio_value_idr,
    allTimeGain,
    allTimeGainPercentage,
    assets: updatedAssets,
    price_currency: fxRate,
    nativeCurrency: "IDR",
    updated_at: p.updated_at,
    transactions: txs.map((tx) => {
      const qty = Number(tx.qty);
      const price = Number(tx.price_per_unit);
      const rate = Number(tx.fx_rate_to_base || 1);
      const txCurrency = tx.settlement_currency || "USD";

      let pricePerShare = price;
      if (txCurrency === "USD") {
        pricePerShare = price * rate;
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
    // 1. Fetch fresh USD rate first to avoid stale FX rates
    const freshFxRate = await fetchUsdRate();
    setUsdExchangeRate(freshFxRate);

    const rawPortfolios = await getPortfolios();
    const allTxs: Record<string, any[]> = {};
    const allHoldings: Record<string, any[]> = {};
    const tickersSet = new Set<string>();

    for (const rp of rawPortfolios) {
      const [txs, holdings] = await Promise.all([
        getPortfolioTransactions(rp.id),
        getPortfolioHoldings(rp.id),
      ]);
      allTxs[rp.id] = txs;
      allHoldings[rp.id] = holdings;

      holdings.forEach((h) => {
        if (h.category !== "FIAT" && h.asset.toUpperCase() !== "IDR" && h.asset.toUpperCase() !== "USD") {
          tickersSet.add(h.asset.toUpperCase());
        }
      });
      txs.forEach((tx) => {
        if (tx.asset_ticker.toUpperCase() !== "IDR" && tx.asset_ticker.toUpperCase() !== "USD") {
          tickersSet.add(tx.asset_ticker.toUpperCase());
        }
      });
    }

    // Fetch stock prices once for all active tickers
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

    // Cache and preload all discovered logos
    const discoveredLogos: Array<{ ticker: string; logoUrl?: string | null }> = [];
    (priceRes.data || []).forEach((item) => {
      if (item.logo_url) {
        discoveredLogos.push({ ticker: item.symbol, logoUrl: item.logo_url });
      }
    });
    if (!dbAssetsError && dbAssets) {
      dbAssets.forEach((a) => {
        if (a.logo_url) {
          discoveredLogos.push({ ticker: a.ticker, logoUrl: a.logo_url });
        }
      });
    }
    if (discoveredLogos.length > 0) {
      saveCachedLogos(discoveredLogos);
      preloadImages(discoveredLogos.map((d) => d.logoUrl));
    }

    const computedPortfolios = rawPortfolios.map((rp) =>
      computePortfolioState(
        rp,
        allHoldings[rp.id] || [],
        allTxs[rp.id] || [],
        priceMap,
        freshFxRate,
        dbAssetsMap
      )
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
    // 1. Fetch fresh USD rate in the same run to guarantee consistency
    const freshFxRate = await fetchUsdRate();
    setUsdExchangeRate(freshFxRate);

    const { data: rp, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("id", portfolioId)
      .single();

    if (error) throw error;

    const [txs, holdings] = await Promise.all([
      getPortfolioTransactions(portfolioId),
      getPortfolioHoldings(portfolioId),
    ]);

    const tickersSet = new Set<string>();
    holdings.forEach((h) => {
      if (h.category !== "FIAT" && h.asset.toUpperCase() !== "IDR" && h.asset.toUpperCase() !== "USD") {
        tickersSet.add(h.asset.toUpperCase());
      }
    });
    txs.forEach((tx) => {
      if (tx.asset_ticker.toUpperCase() !== "IDR" && tx.asset_ticker.toUpperCase() !== "USD") {
        tickersSet.add(tx.asset_ticker.toUpperCase());
      }
    });

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

    // Cache and preload all discovered logos
    const discoveredLogos: Array<{ ticker: string; logoUrl?: string | null }> = [];
    (priceRes.data || []).forEach((item) => {
      if (item.logo_url) {
        discoveredLogos.push({ ticker: item.symbol, logoUrl: item.logo_url });
      }
    });
    if (!dbAssetsError && dbAssets) {
      dbAssets.forEach((a) => {
        if (a.logo_url) {
          discoveredLogos.push({ ticker: a.ticker, logoUrl: a.logo_url });
        }
      });
    }
    if (discoveredLogos.length > 0) {
      saveCachedLogos(discoveredLogos);
      preloadImages(discoveredLogos.map((d) => d.logoUrl));
    }

    const computed = computePortfolioState(
      rp,
      holdings,
      txs,
      priceMap,
      freshFxRate,
      dbAssetsMap
    );

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
