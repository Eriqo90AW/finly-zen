import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import { Portfolio, PortfolioAsset, PortfolioTransaction } from "../types";

interface PortfolioStore {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  currencyView: 'IDR' | 'USD';
}

const DEFAULT_PORTFOLIO_STATE: PortfolioStore = {
  portfolios: [],
  activePortfolioId: null,
  currencyView: 'IDR',
};

const PORTFOLIO_STORE_KEY = "finly_zen_portfolio_v1";

export const [portfolioState, setPortfolioState] = createStore<PortfolioStore>(DEFAULT_PORTFOLIO_STATE);

export function setupPortfolioPersistence() {
  onMount(() => {
    const saved = localStorage.getItem(PORTFOLIO_STORE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPortfolioState(reconcile(parsed));
      } catch (e) {
        console.error("Failed to load portfolio state", e);
      }
    }
  });

  createEffect(() => {
    localStorage.setItem(PORTFOLIO_STORE_KEY, JSON.stringify(portfolioState));
  });
}

// Helpers
export const setCurrencyView = (view: 'IDR' | 'USD') => {
  setPortfolioState("currencyView", view);
};

export const setActivePortfolioId = (id: string | null) => {
  setPortfolioState("activePortfolioId", id);
};
export const createPortfolio = (name: string, initialCash: number) => {
  const id = Math.random().toString(36).substr(2, 9);
  const newPortfolio: Portfolio = {
    id,
    name,
    cash: initialCash,
    totalBuyingPower: initialCash,
    totalValue: initialCash,
    allTimeGain: 0,
    allTimeGainPercentage: 0,
    assets: [],
    transactions: [],
    history: [
      { date: new Date().toISOString(), value: initialCash }
    ],
  };

  setPortfolioState("portfolios", (p) => [...p, newPortfolio]);
  setPortfolioState("activePortfolioId", id);
};

export const addTransactionToPortfolio = (portfolioId: string, transaction: Omit<PortfolioTransaction, "id">) => {
  const id = Math.random().toString(36).substr(2, 9);
  const newTx = { ...transaction, id };

  setPortfolioState("portfolios", (p) => p.id === portfolioId, (p) => {
    const updatedTransactions = [...p.transactions, newTx];
    
    // Update assets based on transaction
    let updatedAssets = [...p.assets];
    const assetIndex = updatedAssets.findIndex(a => a.ticker === transaction.ticker);
    
    if (assetIndex === -1 && transaction.type === 'BUY') {
      updatedAssets.push({
        id: Math.random().toString(36).substr(2, 9),
        ticker: transaction.ticker,
        name: transaction.ticker, 
        currentValue: transaction.totalAmount,
        totalGainLoss: 0,
        actualAllocation: 0, 
        targetAllocation: 0,
        totalShares: transaction.shares,
        averagePrice: transaction.pricePerShare
      });
    } else if (assetIndex !== -1) {
      const asset = { ...updatedAssets[assetIndex] };
      if (transaction.type === 'BUY') {
        const totalShares = asset.totalShares + transaction.shares;
        const totalCost = (asset.totalShares * asset.averagePrice) + transaction.totalAmount;
        asset.totalShares = totalShares;
        asset.averagePrice = totalCost / totalShares;
      } else {
        asset.totalShares -= transaction.shares;
      }
      asset.currentValue = asset.totalShares * transaction.pricePerShare;
      asset.totalGainLoss = asset.currentValue - (asset.totalShares * asset.averagePrice);
      updatedAssets[assetIndex] = asset;
    }

    // Update cash
    const cashChange = transaction.type === 'BUY' ? -transaction.totalAmount : transaction.totalAmount;
    const newCash = p.cash + cashChange;

    // Recalculate totals
    const assetsValue = updatedAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalValue = newCash + assetsValue;
    
    // Simple gain calculation (current total - historical cost)
    // For a more accurate gain, we'd need to track total deposits
    const allTimeGain = updatedAssets.reduce((sum, a) => {
      const costBasis = a.totalShares * a.averagePrice;
      return sum + (a.currentValue - costBasis);
    }, 0);

    const totalCost = updatedAssets.reduce((sum, a) => sum + (a.totalShares * a.averagePrice), 0);
    const allTimeGainPercentage = totalCost > 0 ? (allTimeGain / totalCost) * 100 : 0;

    // Update allocations
    updatedAssets = updatedAssets.map(a => ({
      ...a,
      actualAllocation: totalValue > 0 ? (a.currentValue / totalValue) * 100 : 0
    }));

    return {
      ...p,
      transactions: updatedTransactions,
      assets: updatedAssets,
      cash: newCash,
      totalValue,
      allTimeGain,
      allTimeGainPercentage,
      totalBuyingPower: newCash,
      history: [...p.history, { date: new Date().toISOString(), value: totalValue }]
    };
  });
};
