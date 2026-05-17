import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { Portfolio, PortfolioTransaction } from "../types";

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

// Helper to calculate portfolio metrics consistently
const calculateMetrics = (totalValue: number, initialCapital: number) => {
  const allTimeGain = totalValue - initialCapital;
  // Multiply by 100 to get percentage value (e.g. 5.0 instead of 0.05)
  const allTimeGainPercentage = initialCapital > 0 ? (allTimeGain / initialCapital) * 100 : 0;
  return { allTimeGain, allTimeGainPercentage };
};

export const createPortfolio = (name: string, initialCash: number) => {
  const id = Math.random().toString(36).substr(2, 9);
  const newPortfolio: Portfolio = {
    id,
    name,
    cash: initialCash,
    initialCapital: initialCash,
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

export const addTransactionToPortfolio = (portfolioId: string, transaction: Omit<PortfolioTransaction, "id" | "assetId">) => {
  const id = Math.random().toString(36).substr(2, 9);
  const assetId = Math.random().toString(36).substr(2, 9); // Fallback for new assets
  const newTx = { ...transaction, id, assetId };

  setPortfolioState("portfolios", (p) => p.id === portfolioId, (p) => {
    const updatedTransactions = [...p.transactions, newTx as PortfolioTransaction];
    
    // Update assets based on transaction
    let updatedAssets = [...p.assets];
    const assetIndex = updatedAssets.findIndex(a => a.ticker === transaction.ticker);
    
    if (assetIndex === -1 && transaction.type === 'BUY') {
      updatedAssets.push({
        id: assetId,
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
    
    // Portfolio gain vs Initial Capital
    const initialCapital = p.initialCapital !== undefined ? p.initialCapital : (p.history.length > 0 ? p.history[0].value : totalValue);
    const { allTimeGain, allTimeGainPercentage } = calculateMetrics(totalValue, initialCapital);

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
      initialCapital, // Ensure it's preserved or initialized
      totalValue,
      allTimeGain,
      allTimeGainPercentage,
      totalBuyingPower: newCash,
      history: [...p.history, { date: new Date().toISOString(), value: totalValue }]
    };
  });
};

export const addCapitalToPortfolio = (portfolioId: string, amount: number, isAdjustment: boolean = false) => {
  setPortfolioState("portfolios", (p) => p.id === portfolioId, (p) => {
    const newCash = isAdjustment ? p.cash : p.cash + amount;
    const currentInitial = p.initialCapital || (p.history.length > 0 ? p.history[0].value : p.totalValue);
    const newInitialCapital = isAdjustment ? amount : currentInitial + amount;
    
    const assetsValue = p.assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalValue = newCash + assetsValue;
    
    const { allTimeGain, allTimeGainPercentage } = calculateMetrics(totalValue, newInitialCapital);

    return {
      ...p,
      cash: newCash,
      initialCapital: newInitialCapital,
      totalValue,
      allTimeGain,
      allTimeGainPercentage,
      totalBuyingPower: newCash,
      history: [...p.history, { date: new Date().toISOString(), value: totalValue }]
    };
  });
};
export const deletePortfolio = (portfolioId: string) => {
  if (portfolioState.activePortfolioId === portfolioId) {
    setPortfolioState("activePortfolioId", null);
  }
  setPortfolioState("portfolios", (p) => p.filter(item => item.id !== portfolioId));
};

export const deleteAssetFromPortfolio = (portfolioId: string, assetId: string) => {
  setPortfolioState("portfolios", (p) => p.id === portfolioId, (p) => {
    const assetToRemove = p.assets.find(a => a.id === assetId);
    if (!assetToRemove) return p;

    const tickerToRemove = assetToRemove.ticker;
    const updatedTransactions = p.transactions.filter(t => t.ticker !== tickerToRemove);
    const updatedAssets = p.assets.filter(a => a.id !== assetId);

    // Recalculate cash by undoing all transactions of this asset
    let cashAdjustment = 0;
    p.transactions.filter(t => t.ticker === tickerToRemove).forEach(t => {
      if (t.type === 'BUY') {
        cashAdjustment += t.totalAmount;
      } else {
        cashAdjustment -= t.totalAmount;
      }
    });

    const newCash = p.cash + cashAdjustment;

    // Recalculate totals
    const assetsValue = updatedAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalValue = newCash + assetsValue;
    
    // Portfolio gain vs Initial Capital
    const initialCapital = p.initialCapital !== undefined ? p.initialCapital : (p.history.length > 0 ? p.history[0].value : totalValue);
    const { allTimeGain, allTimeGainPercentage } = calculateMetrics(totalValue, initialCapital);

    // Update allocations
    const finalAssets = updatedAssets.map(a => ({
      ...a,
      actualAllocation: totalValue > 0 ? (a.currentValue / totalValue) * 100 : 0
    }));

    return {
      ...p,
      transactions: updatedTransactions,
      assets: finalAssets,
      cash: newCash,
      totalValue,
      allTimeGain,
      allTimeGainPercentage,
      totalBuyingPower: newCash,
      history: [...p.history, { date: new Date().toISOString(), value: totalValue }]
    };
  });
};

export const setAssetTargetAllocation = (portfolioId: string, assetId: string, targetAllocation: number) => {
  setPortfolioState("portfolios", (p) => p.id === portfolioId, (p) => {
    const updatedAssets = p.assets.map(a => {
      if (a.id === assetId) {
        return { ...a, targetAllocation };
      }
      return a;
    });

    return {
      ...p,
      assets: updatedAssets
    };
  });
};

