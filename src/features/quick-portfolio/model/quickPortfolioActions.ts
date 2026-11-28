import {
  addPortfolioTransaction,
  createQuickPortfolioRecord,
  deletePortfolioTransactionsByTicker,
  updatePortfolioBaseCurrency,
  upsertAsset,
} from "../../../data/portfolioData";
import { getUserIdSync } from "../../../lib/userContext";
import {
  adjustPortfolioCash,
  loadPortfolios,
  portfolioState,
  refreshPortfolio,
} from "../../../store/portfolioStore";
import type { Portfolio } from "../../../types";
import { getUsdRate, usdRateReady } from "../../../utils/format";
import type { EditableHoldingField } from "../types";

export const loadOrInitializeQuickPortfolio = async (): Promise<Portfolio | null> => {
  await usdRateReady;
  await loadPortfolios();

  let found = portfolioState.portfolios.find((p) => p.name === "Quick Portfolio");

  if (!found && portfolioState.portfolios.length === 0) {
    await createQuickPortfolioRecord(getUserIdSync(), "Quick Portfolio", "IDR");
    await loadPortfolios();
    found = portfolioState.portfolios.find((p) => p.name === "Quick Portfolio");
  } else if (!found && portfolioState.portfolios.length > 0) {
    found = portfolioState.portfolios[0];
  }

  if (found && found.name === "Quick Portfolio" && found.nativeCurrency !== "IDR") {
    const updatedCurrency = await updatePortfolioBaseCurrency(found.id, "IDR");
    if (updatedCurrency) {
      await loadPortfolios();
      found =
        portfolioState.portfolios.find((p) => p.name === "Quick Portfolio") ||
        portfolioState.portfolios[0];
    }
  }

  return found ?? null;
};

const insertBuyAndWithdrawal = async (params: {
  portfolioId: string;
  symbol: string;
  qty: number;
  pricePerUnit: number;
  conversionRate: number;
  currency: string;
  buyNotes: string;
  withdrawalNotes: string;
}) => {
  const nowIso = new Date().toISOString();
  const assetTx = await addPortfolioTransaction({
    portfolio_id: params.portfolioId,
    asset_ticker: params.symbol,
    type: "BUY",
    qty: params.qty,
    price_per_unit: params.pricePerUnit,
    fx_rate_to_base: params.conversionRate,
    settlement_currency: params.currency,
    notes: params.buyNotes,
    transaction_date: nowIso,
    linked_transaction_id: null,
  });

  await addPortfolioTransaction({
    portfolio_id: params.portfolioId,
    asset_ticker: params.currency.toUpperCase(),
    type: "WITHDRAWAL",
    qty: params.qty * params.pricePerUnit,
    price_per_unit: 1,
    fx_rate_to_base: params.conversionRate,
    settlement_currency: params.currency,
    notes: params.withdrawalNotes,
    transaction_date: nowIso,
    linked_transaction_id: assetTx.id,
  });
};

const upsertPlaceholderAsset = async (symbol: string, price: number) => {
  await upsertAsset({
    symbol,
    success: true,
    logo_url: "",
    active_price: price,
    pre_market_price: null,
    after_hours_price: null,
    fundamentals: {
      summaryDetail: {},
      summaryProfile: {},
      price: { shortName: symbol },
    },
  });
};

export const updateHoldingPosition = async (
  portfolio: Portfolio,
  ticker: string,
  field: EditableHoldingField,
  newVal: number,
): Promise<Portfolio | null> => {
  const asset = portfolio.assets.find((a) => a.ticker === ticker);
  if (!asset) return null;

  const isIdx = ticker.endsWith(".JK");
  const oldQty = asset.totalShares;
  const assetCurrency = isIdx ? "IDR" : asset.currency || "USD";
  const oldConversionRate = isIdx
    ? 1
    : asset.conversionRate && asset.conversionRate > 1
      ? asset.conversionRate
      : assetCurrency === "USD"
        ? getUsdRate()
        : 1;

  // asset.averagePrice in portfolioStore is stored in portfolio base currency (IDR).
  // Convert to settlement currency (e.g. USD) for price_per_unit in portfolio_transactions.
  const oldAvgPriceInSettlementCurrency = isIdx
    ? asset.averagePrice
    : assetCurrency === "USD"
      ? asset.averagePrice / oldConversionRate
      : asset.averagePrice;

  const newQty = field === "qty" ? newVal : oldQty;
  const newAvgPrice = field === "avgPrice" ? newVal : oldAvgPriceInSettlementCurrency;
  const newConversionRate = isIdx ? 1 : field === "conversionRate" ? newVal : oldConversionRate;

  await deletePortfolioTransactionsByTicker(portfolio.id, ticker);

  if (newQty > 0) {
    await insertBuyAndWithdrawal({
      portfolioId: portfolio.id,
      symbol: ticker.toUpperCase(),
      qty: newQty,
      pricePerUnit: newAvgPrice,
      conversionRate: newConversionRate,
      currency: assetCurrency,
      buyNotes: "Consolidated holding edit",
      withdrawalNotes: `Cash withdrawal for consolidated BUY ${ticker}`,
    });
  }

  await refreshPortfolio(portfolio.id);
  return portfolioState.portfolios.find((x) => x.id === portfolio.id) ?? null;
};

export const deleteHoldingPosition = async (
  portfolio: Portfolio,
  ticker: string,
): Promise<Portfolio | null> => {
  await deletePortfolioTransactionsByTicker(portfolio.id, ticker);
  await refreshPortfolio(portfolio.id);
  return portfolioState.portfolios.find((x) => x.id === portfolio.id) ?? null;
};

export const updateCashBalance = async (
  portfolio: Portfolio,
  newCash: number,
): Promise<Portfolio | null> => {
  await adjustPortfolioCash(portfolio.id, newCash);
  return portfolioState.portfolios.find((x) => x.id === portfolio.id) ?? null;
};

export const createInlineHoldingPosition = async (
  portfolio: Portfolio,
  symbol: string,
  qty: number,
  price: number,
  currency: string,
  conversionRate: number,
): Promise<Portfolio | null> => {
  const isIdx = symbol.endsWith(".JK");
  const effCurrency = isIdx ? "IDR" : currency;
  const effRate = isIdx ? 1 : conversionRate;

  await upsertPlaceholderAsset(symbol, price);
  await insertBuyAndWithdrawal({
    portfolioId: portfolio.id,
    symbol,
    qty,
    pricePerUnit: price,
    conversionRate: effRate,
    currency: effCurrency,
    buyNotes: "Quick holding added",
    withdrawalNotes: `Cash withdrawal for BUY ${symbol}`,
  });

  await refreshPortfolio(portfolio.id);
  return portfolioState.portfolios.find((x) => x.id === portfolio.id) ?? null;
};

export const submitModalHoldingPosition = async (
  portfolio: Portfolio,
  symbol: string,
  qty: number,
  price: number,
  currency: string,
  conversionRate: number,
): Promise<void> => {
  const isIdx = symbol.endsWith(".JK");
  const cost = qty * price;
  const existing = portfolio.assets?.find((a) => a.ticker === symbol);

  if (existing) {
    const oldQty = existing.totalShares;
    const oldCostIDR = oldQty * existing.averagePrice;
    const newCostIDR = isIdx ? cost : cost * conversionRate;
    const mergedQty = oldQty + qty;
    const mergedAvgCostIDR = (oldCostIDR + newCostIDR) / mergedQty;
    const mergedPriceInCurrency = isIdx
      ? mergedAvgCostIDR
      : currency === "USD"
        ? mergedAvgCostIDR / conversionRate
        : mergedAvgCostIDR;

    await deletePortfolioTransactionsByTicker(portfolio.id, symbol);
    await insertBuyAndWithdrawal({
      portfolioId: portfolio.id,
      symbol,
      qty: mergedQty,
      pricePerUnit: mergedPriceInCurrency,
      conversionRate,
      currency,
      buyNotes: "Merged position addition",
      withdrawalNotes: `Cash withdrawal for merged BUY ${symbol}`,
    });
  } else {
    await upsertPlaceholderAsset(symbol, price);
    await insertBuyAndWithdrawal({
      portfolioId: portfolio.id,
      symbol,
      qty,
      pricePerUnit: price,
      conversionRate,
      currency,
      buyNotes: "Quick holding added",
      withdrawalNotes: `Cash withdrawal for BUY ${symbol}`,
    });
  }

  await refreshPortfolio(portfolio.id);
};

export const formatPortfolioExportJson = (portfolio: Portfolio): string =>
  JSON.stringify(
    {
      name: portfolio.name,
      cash: portfolio.cash,
      initialCapital: portfolio.initialCapital,
      transactions: (portfolio.transactions || []).map((t) => ({
        ticker: t.ticker,
        shares: t.shares,
        pricePerShare: t.pricePerShare,
        date: t.date,
        type: t.type,
      })),
    },
    null,
    2,
  );
