import type {
  MultiStockItem,
  PortfolioHoldingDB,
  PortfolioTransactionDB,
} from "../types";

export interface StockPriceRecord extends MultiStockItem {
  company_name?: string;
  preMarketPrice?: number | null;
  afterHoursPrice?: number | null;
}

export interface DbAssetMetadata {
  ticker: string;
  name: string | null;
  logo_url: string | null;
}

export interface PositionEntry {
  qty: number;
  icon?: string | null;
  category?: string;
}

export const collectActiveTickers = (
  holdings: PortfolioHoldingDB[],
  txs: PortfolioTransactionDB[],
): string[] => {
  const tickersSet = new Set<string>();
  for (const h of holdings) {
    const upper = h.asset.toUpperCase();
    if (h.category !== "FIAT" && upper !== "IDR" && upper !== "USD") {
      tickersSet.add(upper);
    }
  }
  for (const tx of txs) {
    const upper = tx.asset_ticker.toUpperCase();
    if (upper !== "IDR" && upper !== "USD") {
      tickersSet.add(upper);
    }
  }
  return Array.from(tickersSet);
};

export const buildPositionMap = (
  holdings: PortfolioHoldingDB[],
  txs: PortfolioTransactionDB[],
): Map<string, PositionEntry> => {
  const activeHoldings = (holdings || []).filter(
    (h) =>
      h.category !== "FIAT" &&
      h.asset.toUpperCase() !== "IDR" &&
      h.asset.toUpperCase() !== "USD" &&
      Number(h.quantity) > 0,
  );

  const positionMap = new Map<string, PositionEntry>();
  if (activeHoldings.length > 0) {
    for (const h of activeHoldings) {
      positionMap.set(h.asset.toUpperCase(), {
        qty: Number(h.quantity),
        icon: h.icon,
        category: h.category,
      });
    }
    return positionMap;
  }

  const uniqueTickers = Array.from(
    new Set(
      txs
        .map((tx) => tx.asset_ticker.toUpperCase())
        .filter((t) => t !== "USD" && t !== "IDR"),
    ),
  );

  for (const ticker of uniqueTickers) {
    const assetTxs = txs.filter((t) => t.asset_ticker.toUpperCase() === ticker);
    let shares = 0;
    for (const t of assetTxs) {
      const qty = Number(t.qty);
      if (t.type === "BUY") shares += qty;
      else if (t.type === "SELL") shares -= qty;
    }
    shares = Math.round(shares * 1e8) / 1e8;
    if (shares > 0) {
      positionMap.set(ticker, { qty: shares });
    }
  }

  return positionMap;
};
