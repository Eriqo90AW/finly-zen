import type { Portfolio, PortfolioHoldingDB, PortfolioTransactionDB } from "../types";
import {
  addPortfolioTransaction,
  fetchMultiStockPrices,
  fetchUsdRate,
  getPortfolioHoldings,
  getPortfolios,
  getPortfolioTransactions,
  upsertAsset,
} from "../data/portfolioData";
import { getUsdRate, setUsdExchangeRate } from "../utils/format";
import { supabase } from "../lib/supabase";
import { preloadImages, saveCachedLogos } from "../utils/logoCache";
import {
  collectActiveTickers,
  computePortfolioState,
  type DbAssetMetadata,
  type StockPriceRecord,
} from "./portfolioCalculations";

export interface AddTransactionParams {
  ticker: string;
  qty: number;
  pricePerUnit: number;
  priceCurrency: number;
  currency: string;
  type: "BUY" | "SELL";
  notes: string;
  transactionDate: string;
}

const fetchMarketMetadata = async (
  tickers: string[],
): Promise<{
  priceMap: Record<string, StockPriceRecord>;
  dbAssetsMap: Record<string, DbAssetMetadata>;
}> => {
  const priceRes = await fetchMultiStockPrices(tickers);
  const priceMap: Record<string, StockPriceRecord> = {};
  for (const item of priceRes.data || []) {
    priceMap[item.symbol.toUpperCase()] = item as StockPriceRecord;
  }

  const { data: dbAssets, error: dbAssetsError } = await supabase
    .from("assets")
    .select("ticker, name, logo_url")
    .in("ticker", tickers);

  const dbAssetsMap: Record<string, DbAssetMetadata> = {};
  if (!dbAssetsError && dbAssets) {
    for (const a of dbAssets as DbAssetMetadata[]) {
      dbAssetsMap[a.ticker.toUpperCase()] = a;
    }
  }

  // Cache and preload all discovered logos
  const discoveredLogos: Array<{ ticker: string; logoUrl?: string | null }> = [];
  for (const item of priceRes.data || []) {
    if (item.logo_url) {
      discoveredLogos.push({ ticker: item.symbol, logoUrl: item.logo_url });
    }
  }
  if (!dbAssetsError && dbAssets) {
    for (const a of dbAssets as DbAssetMetadata[]) {
      if (a.logo_url) {
        discoveredLogos.push({ ticker: a.ticker, logoUrl: a.logo_url });
      }
    }
  }
  if (discoveredLogos.length > 0) {
    saveCachedLogos(discoveredLogos);
    preloadImages(discoveredLogos.map((d) => d.logoUrl));
  }

  return { priceMap, dbAssetsMap };
};

export const fetchAllPortfoliosComputed = async (): Promise<Portfolio[]> => {
  const freshFxRate = await fetchUsdRate();
  setUsdExchangeRate(freshFxRate);

  const rawPortfolios = await getPortfolios();
  const allTxs: Record<string, PortfolioTransactionDB[]> = {};
  const allHoldings: Record<string, PortfolioHoldingDB[]> = {};
  const tickersSet = new Set<string>();

  for (const rp of rawPortfolios) {
    const [txs, holdings] = await Promise.all([
      getPortfolioTransactions(rp.id),
      getPortfolioHoldings(rp.id),
    ]);
    allTxs[rp.id] = txs;
    allHoldings[rp.id] = holdings;
    for (const ticker of collectActiveTickers(holdings, txs)) {
      tickersSet.add(ticker);
    }
  }

  const { priceMap, dbAssetsMap } = await fetchMarketMetadata(Array.from(tickersSet));

  return rawPortfolios.map((rp) =>
    computePortfolioState(
      rp,
      allHoldings[rp.id] || [],
      allTxs[rp.id] || [],
      priceMap,
      freshFxRate,
      dbAssetsMap,
    ),
  );
};

export const fetchSinglePortfolioComputed = async (
  portfolioId: string,
): Promise<Portfolio> => {
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

  const tickers = collectActiveTickers(holdings, txs);
  const { priceMap, dbAssetsMap } = await fetchMarketMetadata(tickers);

  return computePortfolioState(rp, holdings, txs, priceMap, freshFxRate, dbAssetsMap);
};

export const persistNewTransaction = async (
  portfolioId: string,
  txParams: AddTransactionParams,
): Promise<void> => {
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
      active_price: txParams.pricePerUnit,
      pre_market_price: null,
      after_hours_price: null,
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
};

export const deleteAssetTransactionsInDb = async (
  portfolioId: string,
  assetId: string,
): Promise<void> => {
  // Delete parent asset transactions; ON DELETE CASCADE removes linked cash rows
  const { error: deleteError } = await supabase
    .from("portfolio_transactions")
    .delete()
    .eq("portfolio_id", portfolioId)
    .eq("asset_ticker", assetId);

  if (deleteError) throw deleteError;
};

export const persistCapitalAdjustment = async (
  portfolioId: string,
  amount: number,
  isAdjustment: boolean,
): Promise<void> => {
  const { data: p, error } = await supabase
    .from("portfolios")
    .select("base_currency")
    .eq("id", portfolioId)
    .single();

  if (error) throw error;

  const isUSD = p.base_currency === "USD";
  const rate = isUSD ? getUsdRate() : 1;
  const currency = isUSD ? "USD" : "IDR";

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
};

export const persistCashDelta = async (
  portfolio: Portfolio,
  newCash: number,
): Promise<boolean> => {
  const delta = newCash - portfolio.cash;
  if (Math.abs(delta) < 0.0001) return false;

  const rate = Number(portfolio.price_currency || 1);
  const currency = portfolio.nativeCurrency;

  await addPortfolioTransaction({
    portfolio_id: portfolio.id,
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

  return true;
};
