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
  linked_transaction_id?: string | null;
}

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  logoUrl?: string;
  currency: string;
  conversionRate: number;
  currentValue: number;
  totalGainLoss: number;
  actualAllocation: number; // Percentage 0-100
  targetAllocation: number; // Percentage 0-100
  totalShares: number;
  averagePrice: number;
  currentPrice: number;
  preMarketPrice: number | null;
  afterHoursPrice: number | null;
  previousClose: number | null;
  dayChange: number;
  dayChangePct: number;
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
  price_currency?: number;
  nativeCurrency: 'IDR' | 'USD';
  updated_at?: string;
}

// --- DB Row Interfaces ---
export interface PortfolioDB {
  id: string;
  user_id: string;
  name: string;
  base_currency: string;
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
  settlement_currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transaction_date: string;
  fx_rate_to_base: number;
  linked_transaction_id: string | null;
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

export interface PortfolioHoldingDB {
  portfolio_id: string;
  user_id: string;
  portfolio_name: string;
  base_currency: string;
  icon: string | null;
  asset: string;
  category: string;
  quantity: number;
  live_market_price: number;
  current_value_base: number;
  pnl: number;
  allocation: number;
}

// --- API Response Interfaces ---
export interface MultiStockItem {
  symbol: string;
  success: boolean;
  logo_url: string;
  active_price: number;
  current_price?: number;
  market_state?: string;
  is_extended_hours?: boolean;
  regular_market_price?: number;
  pre_market_price: number | null;
  after_hours_price: number | null;
  pre_market_change_percent?: number | null;
  after_hours_change_percent?: number | null;
  regular_change_percent?: number | null;
  extended_hours_price?: number;
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

export interface AllocationItem {
  isCash: boolean;
  ticker: string;
  name: string;
  value: number;
  costBasis?: number;
  percentage: number;
  costPercentage?: number;
  drift?: number;
  color: string;
}

