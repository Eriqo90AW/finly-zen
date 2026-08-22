import { createSignal, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { getUsdRate } from "../utils/format";
import { portfolioState, setCurrencyView } from "../store/portfolioStore";
import { MarketCapTable, type MarketCapItem } from "../components/screen-market-cap/MarketCapTable";

type UniverseTab = "NASDAQ100" | "IDX100" | "CRYPTO100" | "GOLD" | "SILVER";

const NASDAQ_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "AAPL", name: "Apple Inc.", category: "US", price: 224.23, currency: "USD", dayChangePct: 1.45, marketCap: 3450000000000, peRatio: 33.4, psRatio: 8.9, pbRatio: 48.2, evEbitda: 25.1, roe: 1.45, dividendYield: 0.005 },
  { rank: 2, ticker: "MSFT", name: "Microsoft Corp.", category: "US", price: 448.37, currency: "USD", dayChangePct: -0.62, marketCap: 3330000000000, peRatio: 35.8, psRatio: 13.2, pbRatio: 12.4, evEbitda: 22.8, roe: 0.38, dividendYield: 0.007 },
  { rank: 3, ticker: "NVDA", name: "NVIDIA Corp.", category: "US", price: 121.79, currency: "USD", dayChangePct: 3.12, marketCap: 2990000000000, peRatio: 72.1, psRatio: 36.5, pbRatio: 51.6, evEbitda: 55.4, roe: 1.15, dividendYield: 0.001 },
  { rank: 4, ticker: "GOOGL", name: "Alphabet Inc.", category: "US", price: 182.60, currency: "USD", dayChangePct: 0.85, marketCap: 2280000000000, peRatio: 27.2, psRatio: 7.1, pbRatio: 7.3, evEbitda: 18.5, roe: 0.29, dividendYield: 0.004 },
  { rank: 5, ticker: "AMZN", name: "Amazon.com Inc.", category: "US", price: 186.21, currency: "USD", dayChangePct: 1.18, marketCap: 1940000000000, peRatio: 51.3, psRatio: 3.3, pbRatio: 9.1, evEbitda: 20.2, roe: 0.21, dividendYield: 0 },
  { rank: 6, ticker: "META", name: "Meta Platforms", category: "US", price: 489.15, currency: "USD", dayChangePct: 2.34, marketCap: 1240000000000, peRatio: 26.5, psRatio: 8.4, pbRatio: 8.2, evEbitda: 15.6, roe: 0.33, dividendYield: 0.004 },
  { rank: 7, ticker: "TSLA", name: "Tesla Inc.", category: "US", price: 219.80, currency: "USD", dayChangePct: -1.88, marketCap: 701000000000, peRatio: 61.2, psRatio: 7.2, pbRatio: 10.5, evEbitda: 32.1, roe: 0.18, dividendYield: 0 },
  { rank: 8, ticker: "AVGO", name: "Broadcom Inc.", category: "US", price: 158.40, currency: "USD", dayChangePct: 0.95, marketCap: 738000000000, peRatio: 54.0, psRatio: 14.8, pbRatio: 11.2, evEbitda: 24.6, roe: 0.24, dividendYield: 0.013 },
  { rank: 9, ticker: "COST", name: "Costco Wholesale", category: "US", price: 845.20, currency: "USD", dayChangePct: 0.42, marketCap: 375000000000, peRatio: 52.8, psRatio: 1.5, pbRatio: 14.1, evEbitda: 28.3, roe: 0.28, dividendYield: 0.006 },
  { rank: 10, ticker: "AMD", name: "Advanced Micro Devices", category: "US", price: 154.30, currency: "USD", dayChangePct: 4.15, marketCap: 250000000000, peRatio: 112.0, psRatio: 10.8, pbRatio: 4.5, evEbitda: 45.2, roe: 0.04, dividendYield: 0 },
  { rank: 11, ticker: "NFLX", name: "Netflix Inc.", category: "US", price: 648.90, currency: "USD", dayChangePct: -0.30, marketCap: 278000000000, peRatio: 42.1, psRatio: 7.8, pbRatio: 12.8, evEbitda: 26.8, roe: 0.35, dividendYield: 0 },
  { rank: 12, ticker: "PEP", name: "PepsiCo Inc.", category: "US", price: 165.70, currency: "USD", dayChangePct: 0.20, marketCap: 228000000000, peRatio: 24.3, psRatio: 2.5, pbRatio: 11.8, evEbitda: 16.4, roe: 0.52, dividendYield: 0.032 },
  { rank: 13, ticker: "TMUS", name: "T-Mobile US", category: "US", price: 176.40, currency: "USD", dayChangePct: 0.75, marketCap: 206000000000, peRatio: 23.5, psRatio: 2.6, pbRatio: 3.2, evEbitda: 9.8, roe: 0.14, dividendYield: 0.015 },
  { rank: 14, ticker: "SBUX", name: "Starbucks Corp.", category: "US", price: 76.50, currency: "USD", dayChangePct: -1.10, marketCap: 86700000000, peRatio: 21.8, psRatio: 2.4, pbRatio: null, evEbitda: 13.5, roe: null, dividendYield: 0.030 },
];

const IDX_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "BBCA.JK", name: "Bank Central Asia Tbk", category: "IDX", price: 10150, currency: "IDR", dayChangePct: 1.25, marketCap: 71800000000, peRatio: 24.5, psRatio: 9.2, pbRatio: 4.8, evEbitda: null, roe: 0.21, dividendYield: 0.026 },
  { rank: 2, ticker: "BBRI.JK", name: "Bank Rakyat Indonesia Tbk", category: "IDX", price: 4780, currency: "IDR", dayChangePct: -0.83, marketCap: 41600000000, peRatio: 12.1, psRatio: 4.5, pbRatio: 2.3, evEbitda: null, roe: 0.19, dividendYield: 0.065 },
  { rank: 3, ticker: "BMRI.JK", name: "Bank Mandiri Tbk", category: "IDX", price: 6525, currency: "IDR", dayChangePct: 0.77, marketCap: 34900000000, peRatio: 11.4, psRatio: 4.1, pbRatio: 2.2, evEbitda: null, roe: 0.20, dividendYield: 0.054 },
  { rank: 4, ticker: "TLKM.JK", name: "Telkom Indonesia Tbk", category: "IDX", price: 3120, currency: "IDR", dayChangePct: -1.27, marketCap: 17700000000, peRatio: 12.8, psRatio: 1.9, pbRatio: 2.1, evEbitda: 5.4, roe: 0.17, dividendYield: 0.058 },
  { rank: 5, ticker: "BBNI.JK", name: "Bank Negara Indonesia Tbk", category: "IDX", price: 5100, currency: "IDR", dayChangePct: 0.49, marketCap: 10900000000, peRatio: 9.8, psRatio: 2.8, pbRatio: 1.2, evEbitda: null, roe: 0.13, dividendYield: 0.055 },
  { rank: 6, ticker: "ASII.JK", name: "Astra International Tbk", category: "IDX", price: 4540, currency: "IDR", dayChangePct: -0.44, marketCap: 10500000000, peRatio: 6.8, psRatio: 0.6, pbRatio: 0.9, evEbitda: 4.2, roe: 0.14, dividendYield: 0.092 },
  { rank: 7, ticker: "UNVR.JK", name: "Unilever Indonesia Tbk", category: "IDX", price: 2480, currency: "IDR", dayChangePct: -2.10, marketCap: 5400000000, peRatio: 19.2, psRatio: 2.4, pbRatio: 28.5, evEbitda: 14.1, roe: 1.25, dividendYield: 0.062 },
  { rank: 8, ticker: "AMRT.JK", name: "Sumber Alfaria Trijaya Tbk", category: "IDX", price: 2850, currency: "IDR", dayChangePct: 1.42, marketCap: 6800000000, peRatio: 32.1, psRatio: 0.9, pbRatio: 7.8, evEbitda: 16.2, roe: 0.26, dividendYield: 0.012 },
  { rank: 9, ticker: "ICBP.JK", name: "Indofood CBP Sukses Tbk", category: "IDX", price: 11200, currency: "IDR", dayChangePct: 0.67, marketCap: 7500000000, peRatio: 14.5, psRatio: 1.6, pbRatio: 3.1, evEbitda: 10.4, roe: 0.22, dividendYield: 0.038 },
  { rank: 10, ticker: "GOTO.JK", name: "GoTo Gojek Tokopedia Tbk", category: "IDX", price: 54, currency: "IDR", dayChangePct: 0, marketCap: 3800000000, peRatio: null, psRatio: 3.2, pbRatio: 0.6, evEbitda: null, roe: -0.15, dividendYield: 0 },
];

const CRYPTO_100_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "BTC", name: "Bitcoin", category: "Crypto", price: 67450.00, currency: "USD", dayChangePct: 2.85, marketCap: 1330000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 2, ticker: "ETH", name: "Ethereum", category: "Crypto", price: 3480.20, currency: "USD", dayChangePct: 1.92, marketCap: 418000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 3, ticker: "SOL", name: "Solana", category: "Crypto", price: 178.40, currency: "USD", dayChangePct: 5.64, marketCap: 83200000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 4, ticker: "BNB", name: "BNB", category: "Crypto", price: 582.10, currency: "USD", dayChangePct: -0.45, marketCap: 85100000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 5, ticker: "XRP", name: "XRP", category: "Crypto", price: 0.605, currency: "USD", dayChangePct: 4.12, marketCap: 33800000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 6, ticker: "ADA", name: "Cardano", category: "Crypto", price: 0.412, currency: "USD", dayChangePct: 1.15, marketCap: 14700000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 7, ticker: "AVAX", name: "Avalanche", category: "Crypto", price: 27.80, currency: "USD", dayChangePct: 3.45, marketCap: 10900000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 8, ticker: "LINK", name: "Chainlink", category: "Crypto", price: 14.20, currency: "USD", dayChangePct: 2.10, marketCap: 8600000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
];

const METALS_SAMPLE: MarketCapItem[] = [
  { rank: 1, ticker: "XAU-USD", name: "Gold (troy oz)", category: "Commodity", price: 2415.80, currency: "USD", dayChangePct: 0.68, marketCap: 16500000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
  { rank: 2, ticker: "XAG-USD", name: "Silver (troy oz)", category: "Commodity", price: 29.40, currency: "USD", dayChangePct: 1.85, marketCap: 1620000000000, peRatio: null, psRatio: null, pbRatio: null, evEbitda: null, roe: null, dividendYield: 0 },
];

export default function MarketCapList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal<UniverseTab>("NASDAQ100");

  const currencyView = () => portfolioState.currencyView;
  const usdRate = () => getUsdRate();

  const activeUniverse = createMemo(() => {
    switch (activeTab()) {
      case "NASDAQ100":
        return NASDAQ_100_SAMPLE;
      case "IDX100":
        return IDX_100_SAMPLE;
      case "CRYPTO100":
        return CRYPTO_100_SAMPLE;
      case "GOLD":
        return METALS_SAMPLE.filter((m) => m.ticker.includes("XAU"));
      case "SILVER":
        return METALS_SAMPLE.filter((m) => m.ticker.includes("XAG"));
      default:
        return NASDAQ_100_SAMPLE;
    }
  });

  const handleSelectTicker = (ticker: string) => {
    navigate(`/stock/${ticker}`);
  };

  return (
    <div class="flex-1 flex flex-col gap-6 w-full pb-12 animate-fade-in-up">
      {/* Top Header */}
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-earth text-xs font-bold uppercase tracking-wider mb-1">
            <span class="material-icons !text-base text-forest">bar_chart</span>
            Markets & Fundamentals
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-forest font-cormorant">
            Market Cap & Multiples
          </h2>
          <p class="text-xs sm:text-sm text-earth mt-1">
            Comprehensive market rankings, valuation multiples (P/E, P/S, P/B, EV/EBITDA), and financial profitability metrics.
          </p>
        </div>

        {/* Currency Switcher */}
        <div class="flex p-1 bg-sage/30 rounded-2xl border border-forest/10 shadow-inner self-start sm:self-auto shrink-0">
          <button
            onClick={() => setCurrencyView("IDR")}
            class="px-3 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer border-0"
            classList={{
              "bg-white text-forest shadow-md": currencyView() === "IDR",
              "text-earth hover:text-forest": currencyView() !== "IDR",
            }}
          >
            IDR (Rp)
          </button>
          <button
            onClick={() => setCurrencyView("USD")}
            class="px-3 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer border-0"
            classList={{
              "bg-white text-forest shadow-md": currencyView() === "USD",
              "text-earth hover:text-forest": currencyView() !== "USD",
            }}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Universe Tabs */}
      <div class="flex items-center gap-2 border-b border-forest/10 pb-2 overflow-x-auto custom-scrollbar-thin">
        <button
          onClick={() => setActiveTab("NASDAQ100")}
          class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
          classList={{
            "bg-forest text-white shadow-sm": activeTab() === "NASDAQ100",
            "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5": activeTab() !== "NASDAQ100",
          }}
        >
          <span class="material-icons !text-sm">show_chart</span>
          NASDAQ 100
        </button>

        <button
          onClick={() => setActiveTab("IDX100")}
          class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
          classList={{
            "bg-forest text-white shadow-sm": activeTab() === "IDX100",
            "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5": activeTab() !== "IDX100",
          }}
        >
          <span class="material-icons !text-sm">flag</span>
          IDX 100
        </button>

        <button
          onClick={() => setActiveTab("CRYPTO100")}
          class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
          classList={{
            "bg-forest text-white shadow-sm": activeTab() === "CRYPTO100",
            "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5": activeTab() !== "CRYPTO100",
          }}
        >
          <span class="material-icons !text-sm">currency_bitcoin</span>
          Top 100 Crypto
        </button>

        <button
          onClick={() => setActiveTab("GOLD")}
          class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
          classList={{
            "bg-forest text-white shadow-sm": activeTab() === "GOLD",
            "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5": activeTab() !== "GOLD",
          }}
        >
          <span class="material-icons !text-sm">stars</span>
          Gold
        </button>

        <button
          onClick={() => setActiveTab("SILVER")}
          class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
          classList={{
            "bg-forest text-white shadow-sm": activeTab() === "SILVER",
            "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5": activeTab() !== "SILVER",
          }}
        >
          <span class="material-icons !text-sm">workspace_premium</span>
          Silver
        </button>
      </div>

      {/* Table Section */}
      <MarketCapTable
        items={activeUniverse()}
        currencyView={currencyView()}
        usdRate={usdRate()}
        onSelectTicker={handleSelectTicker}
      />
    </div>
  );
}
