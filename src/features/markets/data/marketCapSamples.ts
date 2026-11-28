import type { MarketCapItem } from "../components/marketCapTableHelpers";

export type UniverseTab = "NASDAQ100" | "IDX100" | "CRYPTO100" | "GOLD" | "SILVER";

export const UNIVERSE_TABS: { id: UniverseTab; label: string; icon: string }[] = [
  { id: "NASDAQ100", label: "NASDAQ 100", icon: "show_chart" },
  { id: "IDX100", label: "IDX 100", icon: "flag" },
  { id: "CRYPTO100", label: "Top 100 Crypto", icon: "currency_bitcoin" },
  { id: "GOLD", label: "Gold", icon: "stars" },
  { id: "SILVER", label: "Silver", icon: "workspace_premium" },
];

export const NASDAQ_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "AAPL", name: "Apple Inc.", category: "US", price: 224.23, currency: "USD", dayChangePct: 1.45, marketCap: 3450000000000, peRatio: 33.4, psRatio: 8.9, pbRatio: 48.2, evEbitda: 25.1, roe: 1.45, dividendYield: 0.005 },
  { rank: 2, ticker: "MSFT", name: "Microsoft Corp.", category: "US", price: 448.37, currency: "USD", dayChangePct: -0.62, marketCap: 3330000000000, peRatio: 35.8, psRatio: 13.2, pbRatio: 12.4, evEbitda: 22.8, roe: 0.38, dividendYield: 0.007 },
  { rank: 3, ticker: "NVDA", name: "NVIDIA Corp.", category: "US", price: 121.79, currency: "USD", dayChangePct: 3.12, marketCap: 2990000000000, peRatio: 72.1, psRatio: 36.5, pbRatio: 51.6, evEbitda: 55.4, roe: 1.15, dividendYield: 0.001 },
  { rank: 4, ticker: "GOOGL", name: "Alphabet Inc.", category: "US", price: 182.6, currency: "USD", dayChangePct: 0.85, marketCap: 2280000000000, peRatio: 27.2, psRatio: 7.1, pbRatio: 7.3, evEbitda: 18.5, roe: 0.29, dividendYield: 0.004 },
  { rank: 5, ticker: "AMZN", name: "Amazon.com Inc.", category: "US", price: 186.21, currency: "USD", dayChangePct: 1.18, marketCap: 1940000000000, peRatio: 51.3, psRatio: 3.3, pbRatio: 9.1, evEbitda: 20.2, roe: 0.21, dividendYield: 0 },
  { rank: 6, ticker: "META", name: "Meta Platforms", category: "US", price: 489.15, currency: "USD", dayChangePct: 2.34, marketCap: 1240000000000, peRatio: 26.5, psRatio: 8.4, pbRatio: 8.2, evEbitda: 15.6, roe: 0.33, dividendYield: 0.004 },
  { rank: 7, ticker: "TSLA", name: "Tesla Inc.", category: "US", price: 219.8, currency: "USD", dayChangePct: -1.88, marketCap: 701000000000, peRatio: 61.2, psRatio: 7.2, pbRatio: 10.5, evEbitda: 32.1, roe: 0.18, dividendYield: 0 },
  { rank: 8, ticker: "AVGO", name: "Broadcom Inc.", category: "US", price: 158.4, currency: "USD", dayChangePct: 0.95, marketCap: 738000000000, peRatio: 54.0, psRatio: 14.8, pbRatio: 11.2, evEbitda: 24.6, roe: 0.24, dividendYield: 0.013 },
  { rank: 9, ticker: "COST", name: "Costco Wholesale", category: "US", price: 845.2, currency: "USD", dayChangePct: 0.42, marketCap: 375000000000, peRatio: 52.8, psRatio: 1.5, pbRatio: 14.1, evEbitda: 28.3, roe: 0.28, dividendYield: 0.006 },
  { rank: 10, ticker: "AMD", name: "Advanced Micro Devices", category: "US", price: 154.3, currency: "USD", dayChangePct: 4.15, marketCap: 250000000000, peRatio: 112.0, psRatio: 10.8, pbRatio: 4.5, evEbitda: 45.2, roe: 0.04, dividendYield: 0 },
  { rank: 11, ticker: "NFLX", name: "Netflix Inc.", category: "US", price: 648.9, currency: "USD", dayChangePct: -0.3, marketCap: 278000000000, peRatio: 42.1, psRatio: 7.8, pbRatio: 12.8, evEbitda: 26.8, roe: 0.35, dividendYield: 0 },
  { rank: 12, ticker: "PEP", name: "PepsiCo Inc.", category: "US", price: 165.7, currency: "USD", dayChangePct: 0.2, marketCap: 228000000000, peRatio: 24.3, psRatio: 2.5, pbRatio: 11.8, evEbitda: 16.4, roe: 0.52, dividendYield: 0.032 },
  { rank: 13, ticker: "TMUS", name: "T-Mobile US", category: "US", price: 176.4, currency: "USD", dayChangePct: 0.75, marketCap: 206000000000, peRatio: 23.5, psRatio: 2.6, pbRatio: 3.2, evEbitda: 9.8, roe: 0.14, dividendYield: 0.015 },
  { rank: 14, ticker: "SBUX", name: "Starbucks Corp.", category: "US", price: 76.5, currency: "USD", dayChangePct: -1.1, marketCap: 86700000000, peRatio: 21.8, psRatio: 2.4, pbRatio: null, evEbitda: 13.5, roe: null, dividendYield: 0.03 },
];

export const IDX_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "BBCA.JK", name: "Bank Central Asia Tbk", category: "IDX", price: 10150, currency: "IDR", dayChangePct: 1.25, marketCap: 71800000000, peRatio: 24.5, psRatio: 9.2, pbRatio: 4.8, evEbitda: null, roe: 0.21, dividendYield: 0.026 },
  { rank: 2, ticker: "BBRI.JK", name: "Bank Rakyat Indonesia Tbk", category: "IDX", price: 4780, currency: "IDR", dayChangePct: -0.83, marketCap: 41600000000, peRatio: 12.1, psRatio: 4.5, pbRatio: 2.3, evEbitda: null, roe: 0.19, dividendYield: 0.065 },
  { rank: 3, ticker: "BMRI.JK", name: "Bank Mandiri Tbk", category: "IDX", price: 6525, currency: "IDR", dayChangePct: 0.77, marketCap: 34900000000, peRatio: 11.4, psRatio: 4.1, pbRatio: 2.2, evEbitda: null, roe: 0.2, dividendYield: 0.054 },
  { rank: 4, ticker: "TLKM.JK", name: "Telkom Indonesia Tbk", category: "IDX", price: 3120, currency: "IDR", dayChangePct: -1.27, marketCap: 17700000000, peRatio: 12.8, psRatio: 1.9, pbRatio: 2.1, evEbitda: 5.4, roe: 0.17, dividendYield: 0.058 },
  { rank: 5, ticker: "BBNI.JK", name: "Bank Negara Indonesia Tbk", category: "IDX", price: 5100, currency: "IDR", dayChangePct: 0.49, marketCap: 10900000000, peRatio: 9.8, psRatio: 2.8, pbRatio: 1.2, evEbitda: null, roe: 0.13, dividendYield: 0.055 },
  { rank: 6, ticker: "ASII.JK", name: "Astra International Tbk", category: "IDX", price: 4540, currency: "IDR", dayChangePct: -0.44, marketCap: 10500000000, peRatio: 6.8, psRatio: 0.6, pbRatio: 0.9, evEbitda: 4.2, roe: 0.14, dividendYield: 0.092 },
  { rank: 7, ticker: "UNVR.JK", name: "Unilever Indonesia Tbk", category: "IDX", price: 2480, currency: "IDR", dayChangePct: -2.1, marketCap: 5400000000, peRatio: 19.2, psRatio: 2.4, pbRatio: 28.5, evEbitda: 14.1, roe: 1.25, dividendYield: 0.062 },
  { rank: 8, ticker: "AMRT.JK", name: "Sumber Alfaria Trijaya Tbk", category: "IDX", price: 2850, currency: "IDR", dayChangePct: 1.42, marketCap: 6800000000, peRatio: 32.1, psRatio: 0.9, pbRatio: 7.8, evEbitda: 16.2, roe: 0.26, dividendYield: 0.012 },
  { rank: 9, ticker: "ICBP.JK", name: "Indofood CBP Sukses Tbk", category: "IDX", price: 11200, currency: "IDR", dayChangePct: 0.67, marketCap: 7500000000, peRatio: 14.5, psRatio: 1.6, pbRatio: 3.1, evEbitda: 10.4, roe: 0.22, dividendYield: 0.038 },
  { rank: 10, ticker: "GOTO.JK", name: "GoTo Gojek Tokopedia Tbk", category: "IDX", price: 54, currency: "IDR", dayChangePct: 0, marketCap: 3800000000, peRatio: null, psRatio: 3.2, pbRatio: 0.6, evEbitda: null, roe: -0.15, dividendYield: 0 },
];

export const CRYPTO_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "BTC", name: "Bitcoin", category: "Crypto", price: 67450.0, currency: "USD", dayChangePct: 2.85, marketCap: 1330000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 2, ticker: "ETH", name: "Ethereum", category: "Crypto", price: 3480.2, currency: "USD", dayChangePct: 1.92, marketCap: 418000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 3, ticker: "SOL", name: "Solana", category: "Crypto", price: 178.4, currency: "USD", dayChangePct: 5.64, marketCap: 83200000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 4, ticker: "BNB", name: "BNB", category: "Crypto", price: 582.1, currency: "USD", dayChangePct: -0.45, marketCap: 85100000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 5, ticker: "XRP", name: "XRP", category: "Crypto", price: 0.605, currency: "USD", dayChangePct: 4.12, marketCap: 33800000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 6, ticker: "ADA", name: "Cardano", category: "Crypto", price: 0.412, currency: "USD", dayChangePct: 1.15, marketCap: 14700000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 7, ticker: "AVAX", name: "Avalanche", category: "Crypto", price: 27.8, currency: "USD", dayChangePct: 3.45, marketCap: 10900000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 8, ticker: "LINK", name: "Chainlink", category: "Crypto", price: 14.2, currency: "USD", dayChangePct: 2.1, marketCap: 8600000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
];

export const METALS_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "XAU-USD", name: "Gold (troy oz)", category: "Commodity", price: 2415.8, currency: "USD", dayChangePct: 0.68, marketCap: 16500000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 2, ticker: "XAG-USD", name: "Silver (troy oz)", category: "Commodity", price: 29.4, currency: "USD", dayChangePct: 1.85, marketCap: 1620000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
];
