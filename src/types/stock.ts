export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CorporateAction {
  date: string;
  type: string;
  amount: number | null;
  stock_split: string;
}

export interface Valuation {
  market_cap: number;
  enterprise_value: number;
  current_price: number;
  pre_market_price: number;
  post_market_price: number;
  extended_hours_price: number;
  price_diff_percentage: number;
  pe_ttm: number;
  pe_forward: number;
  price_to_sales_ttm: number;
  ev_to_ebitda: number;
  ev_to_revenue: number;
  price_to_book: number;
  profit_margin: number;
  quarterly_revenue: any[];
}

export interface StandardizedFinancials {
  revenue_ttm: number | null;
  net_income_ttm: number | null;
  gross_profit_ttm: number | null;
  ebitda_ttm: number | null;
  operating_income_ttm: number | null;
  operating_margin_ttm: number | null;
  gross_margin_ttm: number | null;
  net_margin_ttm: number | null;
  free_cash_flow_ttm: number | null;
  cfo_ttm: number | null;
  capex_ttm: number | null;
  eps_ttm: number;
  eps_forward: number;
  quarterly_eps: any[];
  cash_and_equivalents: number | null;
  total_debt: number | null;
  net_cash: number | null;
}

export interface AdvancedRatios {
  roe: number;
  roa: number;
  roic: number | null;
  gross_margin: number;
  operating_margin: number;
  net_margin: number;
  ebitda_margin: number | null;
  current_ratio: number;
  quick_ratio: number;
  debt_to_equity: number;
  peg_ratio: number;
  beta: number;
  dividend_yield: number | null;
  dividend_rate: number | null;
  payout_ratio: number;
  shares_outstanding: number;
  float_shares: number;
  short_ratio: number;
  short_percent_of_float: number;
  book_value_per_share: number;
  ev_to_revenue: number;
  ev_to_ebitda: number;
}

export interface FinancialYear {
  year: number;
  revenue: number;
  earnings: number;
}

export interface FinancialQuarter {
  period: string;
  revenue: number;
  earnings: number;
}

export interface SegmentData {
  note: string;
  quarterly_financials: FinancialQuarter[];
  annual_financials: FinancialYear[];
}

export interface Estimate {
  period_end_date: string;
  eps_avg: number;
  eps_low: number;
  eps_high: number;
  eps_num_analysts: number;
  eps_growth: number;
  eps_year_ago: number;
  revenue_avg: number;
  revenue_low: number;
  revenue_high: number;
  revenue_num_analysts: number;
  revenue_growth: number;
  revenue_year_ago: number;
  eps_trend_current: number;
  eps_trend_7d_ago: number;
  eps_trend_30d_ago: number;
  eps_trend_60d_ago: number;
  eps_trend_90d_ago: number;
  eps_revisions_up_7d: number;
  eps_revisions_up_30d: number;
  eps_revisions_down_30d: number;
  eps_revisions_down_90d: number | null;
}

export interface EarningsEstimates {
  by_period: {
    current_quarter: Estimate;
    next_quarter: Estimate;
    current_year: Estimate;
    next_year: Estimate;
  };
  eps_actuals_vs_estimates: {
    quarter: string;
    eps_actual: number;
    eps_estimate: number;
  }[];
}

export interface StockData {
  ticker: string;
  company_name: string;
  exchange: string;
  currency: string;
  sector: string | null;
  industry: string | null;
  as_of: string;
  price_action: PricePoint[];
  corporate_actions: CorporateAction[];
  valuation: Valuation;
  standardized_financials: StandardizedFinancials;
  advanced_ratios: AdvancedRatios;
  segment_data: SegmentData;
  earnings_estimates: EarningsEstimates;
  fundamentals?: any;
}
