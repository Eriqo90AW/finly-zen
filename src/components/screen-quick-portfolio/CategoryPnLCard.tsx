import { createSignal, For, Show } from "solid-js";

export interface CategoryPnLItem {
  category: "Stocks" | "IDX" | "Crypto";
  icon: string;
  totalValue: number;
  overallPL: number;
  overallPLPercent: number;
  todayChange: number;
  todayChangePercent: number;
  assetCount: number;
}

interface CategoryPnLCardProps {
  categories: CategoryPnLItem[];
  formatVal: (amount: number, isShort?: boolean) => string;
  formatPercent: (amount: number) => string;
}

export const CategoryPnLCard = (props: CategoryPnLCardProps) => {
  const [viewMode, setViewMode] = createSignal<"overall" | "today" | "both">("both");

  return (
    <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col justify-between group transition-all min-h-[260px] h-full">
      {/* Card Header */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="material-icons text-forest !text-xl">category</span>
          <h3 class="text-xs sm:text-sm font-outfit font-bold text-forest uppercase tracking-wider">
            PnL by Category
          </h3>
        </div>

        {/* View mode toggle */}
        <div class="flex bg-sage/50 p-1 rounded-xl border border-forest/10">
          <button
            onClick={() => setViewMode("both")}
            class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "both",
              "text-earth hover:text-forest": viewMode() !== "both",
            }}
          >
            Both
          </button>
          <button
            onClick={() => setViewMode("overall")}
            class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "overall",
              "text-earth hover:text-forest": viewMode() !== "overall",
            }}
          >
            Overall
          </button>
          <button
            onClick={() => setViewMode("today")}
            class="px-2.5 py-1 rounded-lg text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "today",
              "text-earth hover:text-forest": viewMode() !== "today",
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 items-stretch">
        <For each={props.categories}>
          {(cat) => {
            const isOverallPos = cat.overallPL >= 0;
            const isTodayPos = cat.todayChange >= 0;

            return (
              <div class="p-3.5 rounded-2xl bg-sage/20 border border-forest/5 flex flex-col justify-between hover:bg-sage/35 transition-all gap-2.5">
                {/* Header row */}
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-sage/60 flex items-center justify-center text-forest">
                      <span class="material-icons !text-sm">{cat.icon}</span>
                    </div>
                    <span class="font-outfit text-sm font-bold text-near-black">{cat.category}</span>
                  </div>
                  <span class="text-[9.5px] font-outfit font-bold px-2 py-0.5 rounded-full bg-white/80 border border-forest/10 text-earth">
                    {cat.assetCount} {cat.assetCount === 1 ? "asset" : "assets"}
                  </span>
                </div>

                {/* Metric Sub-Squares */}
                <div class="flex-1 flex flex-col justify-between gap-2 min-h-[140px]">
                  <Show
                    when={viewMode() === "both"}
                    fallback={
                      /* Single Expanded Square (Overall or Today) */
                      <div class="p-3 rounded-xl bg-white/85 border border-forest/5 flex-1 flex flex-col justify-between shadow-2xs hover:bg-white transition-all">
                        {/* Top: Label & Total Category Value */}
                        <div class="flex items-center justify-between gap-1">
                          <span class="text-[9.5px] font-bold text-earth uppercase tracking-wider">
                            {viewMode() === "overall" ? "Overall P/L" : "24h Daily P/L"}
                          </span>
                          <span class="text-[9.5px] font-outfit font-bold text-earth/70">
                            Val: {props.formatVal(cat.totalValue, true)}
                          </span>
                        </div>

                        {/* Middle: Amount & Percentage Badge (2 centered rows) */}
                        <div class="flex flex-col items-center justify-center gap-1.5 py-2 my-auto text-center">
                          <span
                            class="font-outfit font-bold text-lg sm:text-xl tracking-tight whitespace-nowrap leading-none"
                            classList={{
                              "text-emerald-700": viewMode() === "overall" ? isOverallPos : isTodayPos,
                              "text-rose-600": viewMode() === "overall" ? !isOverallPos : !isTodayPos,
                            }}
                          >
                            {(viewMode() === "overall" ? isOverallPos : isTodayPos) ? "+" : ""}
                            {props.formatVal(viewMode() === "overall" ? cat.overallPL : cat.todayChange, true)}
                          </span>
                          <span
                            class="text-[10.5px] px-2.5 py-0.5 rounded-full font-bold font-mono whitespace-nowrap inline-flex items-center gap-1 shadow-2xs"
                            classList={{
                              "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20": viewMode() === "overall" ? isOverallPos : isTodayPos,
                              "bg-rose-500/10 text-rose-600 border border-rose-500/20": viewMode() === "overall" ? !isOverallPos : !isTodayPos,
                            }}
                          >
                            <span class="material-icons !text-[11px] font-bold">
                              {(viewMode() === "overall" ? isOverallPos : isTodayPos) ? "trending_up" : "trending_down"}
                            </span>
                            {viewMode() === "overall"
                              ? props.formatPercent(cat.overallPLPercent)
                              : props.formatPercent(cat.todayChangePercent / 100)}
                          </span>
                        </div>

                        {/* Bottom: Holding Share */}
                        <div class="flex items-center justify-between pt-1.5 border-t border-forest/5 text-[9.5px] font-outfit">
                          <span class="text-earth/60 font-medium">Holding share</span>
                          <span class="font-bold text-forest">{((cat.totalValue / (props.categories.reduce((s, c) => s + c.totalValue, 0) || 1)) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    }
                  >
                    {/* Both Mode: Two stacked squares */}
                    {/* Overall PnL Square */}
                    <div class="p-2.5 rounded-xl bg-white/85 border border-forest/5 flex-1 flex flex-col justify-between shadow-2xs hover:bg-white transition-colors">
                      <span class="text-[9px] font-bold text-earth uppercase tracking-wider mb-0.5">
                        Overall P/L
                      </span>
                      <div class="flex items-center justify-between gap-1.5">
                        <span
                          class="font-outfit font-bold text-xs sm:text-sm tracking-tight truncate"
                          classList={{
                            "text-emerald-700": isOverallPos,
                            "text-rose-600": !isOverallPos,
                          }}
                        >
                          {isOverallPos ? "+" : ""}{props.formatVal(cat.overallPL, true)}
                        </span>
                        <span
                          class="text-[9.5px] px-2 py-0.5 rounded-full font-bold font-mono shrink-0"
                          classList={{
                            "bg-emerald-500/10 text-emerald-700": isOverallPos,
                            "bg-rose-500/10 text-rose-600": !isOverallPos,
                          }}
                        >
                          {props.formatPercent(cat.overallPLPercent)}
                        </span>
                      </div>
                    </div>

                    {/* 24h PnL Square */}
                    <div class="p-2.5 rounded-xl bg-white/85 border border-forest/5 flex-1 flex flex-col justify-between shadow-2xs hover:bg-white transition-colors">
                      <span class="text-[9px] font-bold text-earth uppercase tracking-wider mb-0.5">
                        24h Daily
                      </span>
                      <div class="flex items-center justify-between gap-1.5">
                        <span
                          class="font-outfit font-bold text-xs sm:text-sm tracking-tight truncate"
                          classList={{
                            "text-emerald-700": isTodayPos,
                            "text-rose-600": !isTodayPos,
                          }}
                        >
                          {isTodayPos ? "+" : ""}{props.formatVal(cat.todayChange, true)}
                        </span>
                        <span
                          class="text-[9.5px] px-2 py-0.5 rounded-full font-bold font-mono shrink-0"
                          classList={{
                            "bg-emerald-500/10 text-emerald-700": isTodayPos,
                            "bg-rose-500/10 text-rose-600": !isTodayPos,
                          }}
                        >
                          {props.formatPercent(cat.todayChangePercent / 100)}
                        </span>
                      </div>
                    </div>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

