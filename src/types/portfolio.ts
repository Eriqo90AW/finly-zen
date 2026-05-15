export type PortfolioTransactionType = 'BUY' | 'SELL';

export interface PortfolioTransaction {
  id: string;
  assetId: string;
  ticker: string;
  type: PortfolioTransactionType;
  date: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  gainLoss?: number;
}

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  currentValue: number;
  totalGainLoss: number;
  actualAllocation: number; // Percentage 0-100
  targetAllocation: number; // Percentage 0-100
  totalShares: number;
  averagePrice: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface Portfolio {
  id: string;
  name: string;
  cash: number;
  initialCapital: number;
  totalBuyingPower: number;
  totalValue: number;
  allTimeGain: number;
  allTimeGainPercentage: number;
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  history: PortfolioHistoryPoint[];
}
