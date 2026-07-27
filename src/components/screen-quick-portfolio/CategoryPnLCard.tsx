import { createSignal, For, Show } from "solid-js";

export interface CategoryPnLItem {
  category: "Stocks" | "IDX" | "Crypto" | "ETFs";
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
    <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all h-60">
      {/* Card Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="material-icons text-forest !text-base">category</span>
          <h4 class="font-outfit text-[11px] text-earth uppercase tracking-wider font-bold">
            PnL by Category
          </h4>
        </div>

        {/* View mode toggle */}
        <div class="flex bg-sage/40 p-0.5 rounded-lg border border-forest/5 shadow-inner">
          <button
            onClick={() => setViewMode("both")}
            class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "both",
              "text-earth/70 hover:text-forest": viewMode() !== "both",
            }}
          >
            Both
          </button>
          <button
            onClick={() => setViewMode("overall")}
            class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "overall",
              "text-earth/70 hover:text-forest": viewMode() !== "overall",
            }}
          >
            Overall
          </button>
          <button
            onClick={() => setViewMode("today")}
            class="px-2 py-0.5 rounded-md text-[9px] font-outfit font-bold uppercase tracking-wider cursor-pointer border-0 transition-all"
            classList={{
              "bg-forest text-white shadow-xs": viewMode() === "today",
              "text-earth/70 hover:text-forest": viewMode() !== "today",
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div class="grid grid-cols-2 gap-2">
        <For each={props.categories}>
          {(cat) => {
            const isOverallPos = cat.overallPL >= 0;
            const isTodayPos = cat.todayChange >= 0;

            return (
              <div class="p-2 rounded-xl bg-sage/15 border border-forest/5 flex flex-col justify-between hover:bg-sage/30 transition-colors">
                {/* Header row */}
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-1.5">
                    <span class="material-icons !text-xs text-forest">{cat.icon}</span>
                    <span class="font-outfit text-xs font-bold text-near-black">{cat.category}</span>
                  </div>
                  <span class="text-[9px] font-outfit font-semibold px-1.5 py-0.25 rounded-md bg-white border border-forest/5 text-earth">
                    {cat.assetCount} {cat.assetCount === 1 ? "asset" : "assets"}
                  </span>
                </div>

                {/* Values depending on viewMode */}
                <div class="mt-1 space-y-1">
                  {/* Overall PnL */}
                  <Show when={viewMode() === "both" || viewMode() === "overall"}>
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-[9px] text-earth/70 font-bold uppercase tracking-tight">Overall</span>
                      <div class="flex items-center gap-1 font-mono font-bold">
                        <span class={isOverallPos ? "text-forest" : "text-red-600"}>
                          {isOverallPos ? "+" : ""}{props.formatVal(cat.overallPL, true)}
                        </span>
                        <span class={`text-[9px] px-1 rounded ${isOverallPos ? "bg-forest/10 text-forest" : "bg-red-50 text-red-600"}`}>
                          {props.formatPercent(cat.overallPLPercent)}
                        </span>
                      </div>
                    </div>
                  </Show>

                  {/* Today PnL */}
                  <Show when={viewMode() === "both" || viewMode() === "today"}>
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-[9px] text-earth/70 font-bold uppercase tracking-tight">Today</span>
                      <div class="flex items-center gap-1 font-mono font-bold">
                        <span class={isTodayPos ? "text-forest" : "text-red-600"}>
                          {isTodayPos ? "+" : ""}{props.formatVal(cat.todayChange, true)}
                        </span>
                        <span class={`text-[9px] px-1 rounded ${isTodayPos ? "bg-forest/10 text-forest" : "bg-red-50 text-red-600"}`}>
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
