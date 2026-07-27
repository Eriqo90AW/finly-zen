import { Show } from "solid-js";

interface QuickPortfolioKPIsProps {
  totalValue: number;
  overallPL: number;
  overallPLPercent: number;
  todayChange: number;
  todayChangePercent: number;
  hasTodayChangeData: boolean;
  formatVal: (amount: number) => string;
  formatPercent: (amount: number) => string;
}

export const QuickPortfolioKPIs = (props: QuickPortfolioKPIsProps) => {
  return (
    <div class="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* KPI 1: Total Portfolio Value */}
      <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div class="absolute top-0 right-0 w-24 h-24 bg-forest/5 rounded-bl-full opacity-50 -mr-8 -mt-8"></div>
        <p class="font-label-md text-[11px] text-earth uppercase tracking-wider mb-1 font-bold">Total Portfolio Value</p>
        <h3 class="text-3xl font-outfit font-bold text-near-black tracking-tight">{props.formatVal(props.totalValue)}</h3>
      </div>

      {/* KPI 2: Overall P/L */}
      <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
        <p class="font-label-md text-[11px] text-earth uppercase tracking-wider mb-1 font-bold">Overall P/L</p>
        <div class="flex items-baseline gap-2 mt-1">
          <h3 class="text-2xl font-outfit font-bold tracking-tight" classList={{ "text-forest": props.overallPL >= 0, "text-red-600": props.overallPL < 0 }}>
            {props.overallPL >= 0 ? "+" : ""}{props.formatVal(props.overallPL)}
          </h3>
          <span class="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            classList={{ 
              "bg-forest/10 text-forest": props.overallPL >= 0, 
              "bg-red-50 text-red-600": props.overallPL < 0 
            }}
          >
            <span class="material-icons !text-xs font-bold">{props.overallPL >= 0 ? "trending_up" : "trending_down"}</span>
            {props.formatPercent(props.overallPLPercent)}
          </span>
        </div>
      </div>

      {/* KPI 3: Today's Change */}
      <div class="bg-white rounded-2xl p-4 border border-forest/10 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
        <p class="font-label-md text-[11px] text-earth uppercase tracking-wider mb-1 font-bold">Today's Change</p>
        <Show
          when={props.hasTodayChangeData}
          fallback={
            <div class="flex items-baseline gap-2 mt-1">
              <h3 class="text-2xl font-outfit font-bold tracking-tight text-earth/50">—</h3>
              <span class="text-[10px] text-earth/50 font-outfit font-semibold uppercase tracking-wider">
                Awaiting previous close
              </span>
            </div>
          }
        >
          <div class="flex items-baseline gap-2 mt-1">
            <h3
              class="text-2xl font-outfit font-bold tracking-tight"
              classList={{
                "text-forest": props.todayChange >= 0,
                "text-red-600": props.todayChange < 0,
              }}
            >
              {props.todayChange >= 0 ? "+" : ""}{props.formatVal(props.todayChange)}
            </h3>
            <span
              class="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              classList={{
                "bg-forest/10 text-forest": props.todayChange >= 0,
                "bg-red-50 text-red-600": props.todayChange < 0,
              }}
            >
              <span class="material-icons !text-xs font-bold">
                {props.todayChange >= 0 ? "trending_up" : "trending_down"}
              </span>
              {props.formatPercent(props.todayChangePercent / 100)}
            </span>
          </div>
        </Show>
      </div>
    </div>
  );
};

