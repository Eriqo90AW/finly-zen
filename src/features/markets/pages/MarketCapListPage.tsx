import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For } from "solid-js";
import { portfolioState, setCurrencyView } from "../../../store/portfolioStore";
import { getUsdRate } from "../../../utils/format";
import { MarketCapTable } from "../components/MarketCapTable";
import {
  CRYPTO_100_SAMPLE,
  IDX_100_SAMPLE,
  METALS_SAMPLE,
  NASDAQ_100_SAMPLE,
  UNIVERSE_TABS,
  type UniverseTab,
} from "../data/marketCapSamples";

export const MarketCapListPage = () => {
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
            Comprehensive market rankings, valuation multiples (P/E, P/S, P/B, EV/EBITDA), and
            financial profitability metrics.
          </p>
        </div>

        {/* Currency Switcher */}
        <div class="flex p-1 bg-sage/30 rounded-2xl border border-forest/10 shadow-inner self-start sm:self-auto shrink-0">
          <button
            type="button"
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
            type="button"
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
        <For each={UNIVERSE_TABS}>
          {(tab) => (
            <button
              type="button"
              onClick={() => setActiveTab(tab.id)}
              class="px-4 py-2 rounded-xl text-xs font-outfit font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
              classList={{
                "bg-forest text-white shadow-sm": activeTab() === tab.id,
                "bg-white text-earth hover:bg-sage/40 hover:text-forest border border-forest/5":
                  activeTab() !== tab.id,
              }}
            >
              <span class="material-icons !text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          )}
        </For>
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
};
