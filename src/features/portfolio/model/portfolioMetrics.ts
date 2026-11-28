import type { PortfolioTransaction } from "../../../types";

const TYPE_ORDER: Record<string, number> = {
  BUY: 0,
  DEPOSIT: 1,
  DIVIDEND: 2,
  SELL: 3,
  WITHDRAWAL: 4,
  PENDING: 5,
};

export const calculatePortfolioRealizedPnL = (
  transactions: PortfolioTransaction[] | undefined,
  netWorth: number,
): { gain: number; percentage: number } => {
  if (!transactions) return { gain: 0, percentage: 0 };

  const sortedTxs = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
  });

  let totalRealized = 0;
  const runningStats: Record<
    string,
    {
      averagePrice: number;
      totalBuyQty: number;
      totalCost: number;
      currentShares: number;
    }
  > = {};

  for (const tx of sortedTxs) {
    const ticker = tx.ticker.toUpperCase();
    if (!runningStats[ticker]) {
      runningStats[ticker] = {
        averagePrice: 0,
        totalBuyQty: 0,
        totalCost: 0,
        currentShares: 0,
      };
    }

    const stats = runningStats[ticker];
    const qty = tx.shares;
    const pricePerShare = tx.pricePerShare;

    if (tx.type === "BUY") {
      stats.totalBuyQty += qty;
      stats.totalCost += qty * pricePerShare;
      stats.currentShares += qty;
      stats.averagePrice = stats.totalBuyQty > 0 ? stats.totalCost / stats.totalBuyQty : 0;
    } else if (tx.type === "SELL") {
      const costBasisOfSold = qty * stats.averagePrice;
      const revenue = qty * pricePerShare;
      totalRealized += revenue - costBasisOfSold;

      stats.currentShares = Math.max(0, stats.currentShares - qty);
      stats.currentShares = Math.round(stats.currentShares * 1e8) / 1e8;

      if (stats.currentShares === 0) {
        stats.totalBuyQty = 0;
        stats.totalCost = 0;
        stats.averagePrice = 0;
      } else {
        stats.totalBuyQty = stats.currentShares;
        stats.totalCost = stats.currentShares * stats.averagePrice;
      }
    } else if (tx.type === "DIVIDEND") {
      totalRealized += qty * pricePerShare;
    }
  }

  const percentage = netWorth > 0 ? (totalRealized / netWorth) * 100 : 0;
  return { gain: totalRealized, percentage };
};
