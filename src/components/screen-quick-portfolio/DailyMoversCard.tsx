import { For, Show } from "solid-js";
import type { PortfolioAsset } from "../../types";
import { AssetLogo } from "../common/AssetLogo";

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
  if (t.endsWith("-USD") || t === "BTC" || t === "BTC-USD") return "Crypto";
  return "Stocks";
};

export const DailyMoversCard = (props: DailyMoversCardProps) => {
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

  const renderRow = (asset: PortfolioAsset) => {
    const isPos = asset.dayChange >= 0;
    return (
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-sage/20 hover:bg-sage/40 transition-all">
        <div class="flex items-center gap-2.5 min-w-0">
          <AssetLogo
            ticker={asset.ticker}
            logoUrl={asset.logoUrl}
            name={asset.name}
            category={props.getCategory ? props.getCategory(asset.ticker) : getCategoryFallback(asset.ticker)}
            size="sm"
            class="w-7 h-7 rounded-lg bg-sage shadow-xs border border-forest/10"
          />
          <div class="min-w-0">
            <div class="font-outfit text-xs font-bold text-near-black truncate leading-tight">
              {asset.name || asset.ticker}
            </div>
            <div class="flex items-center gap-2 mt-0.5 min-w-0">
              <span class="text-[10px] font-outfit font-bold text-earth/80 truncate">
                {props.getDisplayTicker(asset.ticker)}
              </span>
              <span class="text-[8.5px] font-outfit font-bold px-1.5 py-0.25 rounded-full bg-white/80 border border-forest/10 text-forest shrink-0 uppercase tracking-wider">
                {props.getCategory ? props.getCategory(asset.ticker) : getCategoryFallback(asset.ticker)}
              </span>
            </div>
          </div>
        </div>

        <div class="text-right font-outfit text-xs font-bold shrink-0">
          <div class={isPos ? "text-emerald-700" : "text-rose-600"}>
            {isPos ? "+" : ""}
            {props.formatVal(asset.dayChange, true)}
          </div>
          <div class={`text-[9px] px-2 py-0.5 rounded-full inline-block mt-0.5 font-bold ${isPos ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600"}`}>
            {props.formatPercent((asset.dayChangePct || 0) / 100)}
          </div>
        </div>
      </div>
    );
  };

  const columns = () => [
    { key: "gainers", label: "Gainers", items: gainers(), dotClass: "bg-spring" },
    { key: "losers", label: "Losers", items: losers(), dotClass: "bg-rose-500" },
  ];

  return (
    <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col justify-between group transition-all min-h-[260px] h-full">
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="material-icons text-forest !text-xl">trending_up</span>
          <h3 class="text-xs sm:text-sm font-outfit font-bold text-forest uppercase tracking-wider">
            Daily Movers (24h)
          </h3>
        </div>
      </div>

      {/* Two-Column List */}
      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Show
          when={gainers().length > 0 || losers().length > 0}
          fallback={
            <div class="col-span-2 flex items-center justify-center py-6 text-earth/50 text-xs font-outfit italic">
              No daily movement data available yet.
            </div>
          }
        >
          <For each={columns()}>
            {(col) => (
              <div class="flex flex-col min-h-0">
                <div class="flex items-center gap-1.5 mb-2">
                  <span class={`w-1.5 h-1.5 rounded-full ${col.dotClass}`} />
                  <span class="text-[9px] font-outfit font-bold uppercase tracking-wider text-earth">
                    {col.label} ({col.items.length})
                  </span>
                </div>
                <Show
                  when={col.items.length > 0}
                  fallback={
                    <div class="flex-1 flex items-center justify-center py-6 text-earth/40 text-[10px] font-outfit italic">
                      No {col.label.toLowerCase()} yet.
                    </div>
                  }
                >
                  <div class="flex-1 flex flex-col gap-2">
                    <For each={col.items}>{(asset) => renderRow(asset)}</For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
};

