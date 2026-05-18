export type AssetType = 'IDX' | 'US_STOCK' | 'CRYPTO' | 'METAL' | 'CASH';
export type PortfolioTransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'PENDING';

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
  logoUrl?: string;
  currentValue: number;
  totalGainLoss: number;
  actualAllocation: number; // Percentage 0-100
  targetAllocation: number; // Percentage 0-100
  totalShares: number;
  averagePrice: number;
  currentPrice: number;
  preMarketPrice: number | null;
  postMarketPrice: number | null;
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

// --- DB Row Interfaces ---
export interface PortfolioDB {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  cash: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTransactionDB {
  id: string;
  portfolio_id: string;
  asset_ticker: string;
  type: PortfolioTransactionType;
  qty: number;
  price_per_unit: number;
  price_currency: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transaction_date: string;
}

export interface AssetDB {
  ticker: string;
  name: string;
  type: AssetType;
  industry: string | null;
  sector: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

// --- API Response Interfaces ---
export interface MultiStockItem {
  symbol: string;
  success: boolean;
  logo_url: string;
  current_price: number;
  pre_market_price: number | null;
  post_market_price: number | null;
  extended_hours_price: number;
  fundamentals: {
    summaryDetail: Record<string, any>;
    summaryProfile: Record<string, any>;
    price: Record<string, any>;
    financialData?: Record<string, any>;
  };
}

export interface MultiStockResponse {
  data: MultiStockItem[];
}

