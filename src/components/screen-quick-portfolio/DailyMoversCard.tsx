import { createSignal, For, Show } from "solid-js";
import type { PortfolioAsset } from "../../types";

interface DailyMoversCardProps {
  assets: PortfolioAsset[];
  formatVal: (amount: number, isShort?: boolean) => string;
  formatPercent: (amount: number) => string;
  getDisplayTicker: (ticker: string) => string;
  getCategory?: (ticker: string) => string;
}

const getCategoryFallback = (ticker: string) => {
  const t = ticker.toUpperCase();
  if (t.endsWith(".JK")) return "IDX";
  if (t === "VOO") return "ETFs";
  if (t.endsWith("-USD") || t === "BTC" || t === "BTC-USD") return "Crypto";
  return "Stocks";
};

export const DailyMoversCard = (props: DailyMoversCardProps) => {
  const [tab, setTab] = createSignal<"gainers" | "losers">("gainers");

  const gainers = () =>
    [...props.assets]
      .filter((a) => a.dayChange > 0)
      .sort((a, b) => b.dayChange - a.dayChange)
      .slice(0, 3);

  const losers = () =>
    [...props.assets]
      .filter((a) => a.dayChange < 0)
      .sort((a, b) => a.dayChange - b.dayChange)
      .slice(0, 3);

  const activeList = () => (tab() === "gainers" ? gainers() : losers());

  return (
    <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all h-60">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="material-icons text-forest !text-base">trending_up</span>
          <h4 class="font-outfit text-[11px] text-earth uppercase tracking-wider font-bold">
            Daily Movers
          </h4>
        </div>

        {/* Tab selector */}
        <div class="flex bg-sage/40 p-0.5 rounded-lg border border-forest/5 shadow-inner">
          <button
            onClick={() => setTab("gainers")}
            class="px-2.5 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all flex items-center gap-1"
            classList={{
              "bg-forest text-white shadow-xs": tab() === "gainers",
              "text-earth/70 hover:text-forest": tab() !== "gainers",
            }}
          >
            <span class="w-1.5 h-1.5 rounded-full bg-spring"></span>
            Gainers ({gainers().length})
          </button>
          <button
            onClick={() => setTab("losers")}
            class="px-2.5 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all flex items-center gap-1"
            classList={{
              "bg-forest text-white shadow-xs": tab() === "losers",
              "text-earth/70 hover:text-forest": tab() !== "losers",
            }}
          >
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Losers ({losers().length})
          </button>
        </div>
      </div>

      {/* List */}
      <div class="flex-1 flex flex-col justify-center space-y-1.5">
        <Show
          when={activeList().length > 0}
          fallback={
            <div class="text-center py-6 text-earth/50 text-xs font-outfit italic">
              No daily {tab()} data available yet.
            </div>
          }
        >
          <For each={activeList()}>
            {(asset) => {
              const isPos = asset.dayChange >= 0;
              return (
                <div class="flex items-center justify-between p-1.5 rounded-xl bg-sage/10 hover:bg-sage/25 transition-colors">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-6 h-6 rounded-lg bg-sage flex items-center justify-center text-forest text-[10px] font-bold shrink-0 overflow-hidden">
                      <Show
                        when={asset.logoUrl}
                        fallback={props.getDisplayTicker(asset.ticker).slice(0, 3)}
                      >
                        <img
                          src={asset.logoUrl}
                          alt={asset.ticker}
                          class="w-full h-full object-cover"
                        />
                      </Show>
                    </div>
                    <div class="min-w-0">
                      <div class="font-outfit text-xs font-bold text-near-black truncate leading-tight">
                        {asset.name || asset.ticker}
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span class="text-[10px] font-mono text-earth/70 truncate">
                          {props.getDisplayTicker(asset.ticker)}
                        </span>
                        <span class="text-[8.5px] font-outfit font-semibold px-1 py-0.25 rounded bg-sage/40 border border-forest/10 text-earth shrink-0 uppercase tracking-wider">
                          {props.getCategory ? props.getCategory(asset.ticker) : getCategoryFallback(asset.ticker)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="text-right font-mono text-xs font-bold shrink-0">
                    <div class={isPos ? "text-forest" : "text-red-600"}>
                      {isPos ? "+" : ""}
                      {props.formatVal(asset.dayChange, true)}
                    </div>
                    <div class={`text-[9px] px-1.5 py-0.5 rounded-md inline-block mt-0.5 font-semibold font-mono ${isPos ? "bg-forest/10 text-forest" : "bg-red-50 text-red-600"}`}>
                      {props.formatPercent((asset.dayChangePct || 0) / 100)}
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
};
