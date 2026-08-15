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
    <div class="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* KPI 1: Total Portfolio Value */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium relative overflow-hidden group transition-all">
        <div class="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-forest/10 via-sage/10 to-transparent rounded-bl-full pointer-events-none"></div>
        <p class="text-[10px] font-bold text-earth uppercase tracking-widest mb-1.5">
          Total Portfolio Value
        </p>
        <h2 class="text-3xl sm:text-4xl font-cormorant font-bold text-near-black tracking-tight">
          {props.formatVal(props.totalValue)}
        </h2>
      </div>

      {/* KPI 2: Overall P/L */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col justify-between group transition-all">
        <p class="text-[10px] font-bold text-earth uppercase tracking-widest mb-1.5">
          Overall P/L
        </p>
        <div class="flex items-baseline justify-between gap-2 mt-1">
          <h2
            class="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight"
            classList={{
              "text-emerald-700": props.overallPL >= 0,
              "text-rose-600": props.overallPL < 0,
            }}
          >
            {props.overallPL >= 0 ? "+" : ""}{props.formatVal(props.overallPL)}
          </h2>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-outfit"
            classList={{
              "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20": props.overallPL >= 0,
              "bg-rose-500/10 text-rose-600 border border-rose-500/20": props.overallPL < 0,
            }}
          >
            <span class="material-icons !text-xs font-bold">
              {props.overallPL >= 0 ? "trending_up" : "trending_down"}
            </span>
            {props.formatPercent(props.overallPLPercent)}
          </span>
        </div>
      </div>

      {/* KPI 3: Today's Change */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium flex flex-col justify-between group transition-all">
        <p class="text-[10px] font-bold text-earth uppercase tracking-widest mb-1.5">
          24h Daily P/L
        </p>
        <Show
          when={props.hasTodayChangeData}
          fallback={
            <div class="flex items-baseline gap-2 mt-1">
              <h2 class="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight text-earth/40">—</h2>
              <span class="text-[10px] text-earth/50 font-outfit font-semibold uppercase tracking-wider">
                Awaiting market close
              </span>
            </div>
          }
        >
          <div class="flex items-baseline justify-between gap-2 mt-1">
            <h2
              class="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight"
              classList={{
                "text-emerald-700": props.todayChange >= 0,
                "text-rose-600": props.todayChange < 0,
              }}
            >
              {props.todayChange >= 0 ? "+" : ""}{props.formatVal(props.todayChange)}
            </h2>
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-outfit"
              classList={{
                "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20": props.todayChange >= 0,
                "bg-rose-500/10 text-rose-600 border border-rose-500/20": props.todayChange < 0,
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


