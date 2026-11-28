import type {
  Portfolio,
  PortfolioAsset,
  PortfolioDB,
  PortfolioHistoryPoint,
  PortfolioHoldingDB,
  PortfolioTransactionDB,
} from "../types";
import { getCachedLogo, setCachedLogo } from "../utils/logoCache";
import { getMarketStatus } from "../utils/marketTime";
import { getTargetAllocationsMap } from "./portfolioPersistence";
import {
  buildPositionMap,
  collectActiveTickers,
  type DbAssetMetadata,
  type StockPriceRecord,
} from "./portfolioPositions";

export {
  collectActiveTickers,
  type DbAssetMetadata,
  type StockPriceRecord,
};

const getOptionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

// Compute standard portfolio aggregates following the exact mathematical specification
export const computePortfolioState = (
  p: PortfolioDB,
  holdings: PortfolioHoldingDB[],
  txs: PortfolioTransactionDB[],
  priceMap: Record<string, StockPriceRecord>,
  fxRate: number,
  dbAssetsMap: Record<string, DbAssetMetadata> = {},
): Portfolio => {
  const assets: PortfolioAsset[] = [];

  // Source of Truth 1: Initial Capital from the single DEPOSIT row in portfolio_transactions
  const depositTx = txs.find((t) => t.type === "DEPOSIT");
  const totalCapitalIdr = depositTx
    ? Number(depositTx.qty) * Number(depositTx.fx_rate_to_base || 1)
    : 0;

  // Source of Truth 2: Positions (qty) from portfolio_holdings view (excluding FIAT and <= 0)
  const positionMap = buildPositionMap(holdings, txs);
  const savedTargets = getTargetAllocationsMap(p.id);
  const { session } = getMarketStatus();

  positionMap.forEach((pos, ticker) => {
    const qty = pos.qty;
    const isIdx = ticker.endsWith(".JK") || pos.category === "IDX";

    // Source of Truth 3: Cost basis from portfolio_transactions where type = 'BUY'
    const buyTxs = txs.filter(
      (t) => t.asset_ticker.toUpperCase() === ticker && t.type === "BUY",
    );
    const totalBuyQty = buyTxs.reduce((sum, t) => sum + Number(t.qty), 0);
    const totalBuyCostIdr = buyTxs.reduce((sum, t) => {
      const tQty = Number(t.qty);
      const tPrice = Number(t.price_per_unit);
      const tRate = Number(t.fx_rate_to_base || 1);
      return sum + tQty * tPrice * tRate;
    }, 0);

    const avgCostPerUnitIdr = totalBuyQty > 0 ? totalBuyCostIdr / totalBuyQty : 0;
    const costBasisIdr = qty * avgCostPerUnitIdr;

    const assetCurrency = buyTxs[0]?.settlement_currency || (isIdx ? "IDR" : "USD");
    const assetConversionRate =
      Number(buyTxs[0]?.fx_rate_to_base) || (assetCurrency === "USD" ? fxRate : 1);

    const priceItem = priceMap[ticker];
    const prePriceNative =
      priceItem?.pre_market_price ??
      priceItem?.preMarketPrice ??
      getOptionalNumber(priceItem?.fundamentals?.price?.preMarketPrice) ??
      null;
    const afterPriceNative =
      priceItem?.after_hours_price ??
      priceItem?.afterHoursPrice ??
      getOptionalNumber(priceItem?.fundamentals?.price?.afterHoursPrice) ??
      null;
    const regularPriceNative =
      priceItem?.active_price ??
      priceItem?.current_price ??
      (buyTxs[0]?.price_per_unit || 0);

    const activePriceNative =
      session === "Pre-market" && prePriceNative !== null
        ? prePriceNative
        : session === "After-hours" && afterPriceNative !== null
          ? afterPriceNative
          : regularPriceNative;

    const marketValIdr = isIdx ? qty * activePriceNative : qty * activePriceNative * fxRate;
    const livePrice = isIdx ? activePriceNative : activePriceNative * fxRate;
    const unrealizedPnlIdr = marketValIdr - costBasisIdr;

    const previousCloseNative =
      getOptionalNumber(priceItem?.fundamentals?.summaryDetail?.previousClose) ??
      getOptionalNumber(priceItem?.fundamentals?.price?.regularMarketPreviousClose) ??
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

    const targetAllocation = savedTargets[ticker] || 0;
    const dbAsset = dbAssetsMap[ticker];

    const resolvedLogo =
      pos.icon || dbAsset?.logo_url || priceItem?.logo_url || getCachedLogo(ticker) || undefined;
    if (resolvedLogo) {
      setCachedLogo(ticker, resolvedLogo);
    }

    const resolvedName =
      (dbAsset?.name && dbAsset.name.toUpperCase() !== ticker.toUpperCase()
        ? dbAsset.name
        : undefined) ||
      priceItem?.company_name ||
      getOptionalString(priceItem?.fundamentals?.price?.longName) ||
      getOptionalString(priceItem?.fundamentals?.price?.shortName) ||
      getOptionalString(priceItem?.fundamentals?.summaryProfile?.longName) ||
      ticker;

    assets.push({
      id: ticker,
      ticker,
      name: resolvedName,
      logoUrl: resolvedLogo,
      currency: assetCurrency,
      conversionRate: assetConversionRate,
      currentValue: marketValIdr,
      totalGainLoss: unrealizedPnlIdr,
      actualAllocation: 0,
      targetAllocation,
      totalShares: qty,
      averagePrice: avgCostPerUnitIdr,
      currentPrice: livePrice,
      preMarketPrice:
        prePriceNative !== null ? (isIdx ? prePriceNative : prePriceNative * fxRate) : null,
      afterHoursPrice:
        afterPriceNative !== null ? (isIdx ? afterPriceNative : afterPriceNative * fxRate) : null,
      previousClose,
      dayChange,
      dayChangePct,
    });
  });

  const totalCostBasisIdr = assets.reduce(
    (sum, a) => sum + (a.currentValue - a.totalGainLoss),
    0,
  );
  const totalMarketValueIdr = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalUnrealizedPnl = totalMarketValueIdr - totalCostBasisIdr;

  const cashAvailableIdr = totalCapitalIdr - totalCostBasisIdr;
  const portfolioValueIdr = cashAvailableIdr + totalMarketValueIdr;
  const allTimeGain = totalUnrealizedPnl;
  const allTimeGainPercentage =
    totalCapitalIdr > 0 ? (totalUnrealizedPnl / totalCapitalIdr) * 100 : 0;

  const updatedAssets = assets.map((a) => ({
    ...a,
    actualAllocation: portfolioValueIdr > 0 ? (a.currentValue / portfolioValueIdr) * 100 : 0,
  }));

  const history: PortfolioHistoryPoint[] = [
    { date: p.created_at || new Date().toISOString(), value: totalCapitalIdr },
    { date: new Date().toISOString(), value: portfolioValueIdr },
  ];

  return {
    id: p.id,
    name: p.name,
    cash: cashAvailableIdr,
    initialCapital: totalCapitalIdr,
    totalBuyingPower: cashAvailableIdr,
    totalValue: portfolioValueIdr,
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
      const pricePerShare = txCurrency === "USD" ? price * rate : price;

      return {
        id: tx.id,
        assetId: tx.asset_ticker,
        ticker: tx.asset_ticker,
        type: tx.type,
        date: tx.transaction_date,
        shares: qty,
        pricePerShare,
        totalAmount: qty * pricePerShare,
        linked_transaction_id: tx.linked_transaction_id,
      };
    }),
    history,
  };
};
