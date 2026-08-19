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
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium relative overflow-hidden min-h-[132px] h-full flex flex-col">
        <div class="absolute inset-0 bg-gradient-to-br from-terracotta/12 via-terracotta/4 to-transparent pointer-events-none" />
        <div class="absolute -top-12 -right-12 w-44 h-44 bg-terracotta/20 rounded-full blur-2xl pointer-events-none" />
        <div class="absolute -bottom-12 -left-12 w-36 h-36 bg-terracotta/10 rounded-full blur-xl pointer-events-none" />
        <div class="relative z-10 flex flex-1 flex-col justify-between gap-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              Total Portfolio Value
            </p>
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <span class="material-icons !text-base">account_balance_wallet</span>
            </span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-cormorant font-bold text-near-black tracking-tight">
            {props.formatVal(props.totalValue)}
          </h2>
        </div>
      </div>

      {/* KPI 2: Overall P/L */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium relative overflow-hidden min-h-[132px] h-full flex flex-col">
        <div class="absolute inset-0 bg-gradient-to-br from-ochre/12 via-ochre/4 to-transparent pointer-events-none" />
        <div class="absolute -top-12 -right-12 w-44 h-44 bg-ochre/20 rounded-full blur-2xl pointer-events-none" />
        <div class="absolute -bottom-12 -left-12 w-36 h-36 bg-ochre/10 rounded-full blur-xl pointer-events-none" />
        <div class="relative z-10 flex flex-1 flex-col justify-between gap-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              Overall P/L
            </p>
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ochre/10 text-ochre-dark">
              <span class="material-icons !text-base">trending_up</span>
            </span>
          </div>
          <div class="flex items-baseline justify-between gap-2">
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
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-outfit shrink-0"
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
      </div>

      {/* KPI 3: Today's Change */}
      <div class="bg-card-bg rounded-premium p-6 border border-forest/10 shadow-premium relative overflow-hidden min-h-[132px] h-full flex flex-col">
        <div class="absolute inset-0 bg-gradient-to-br from-mulberry/12 via-mulberry/4 to-transparent pointer-events-none" />
        <div class="absolute -top-12 -right-12 w-44 h-44 bg-mulberry/20 rounded-full blur-2xl pointer-events-none" />
        <div class="absolute -bottom-12 -left-12 w-36 h-36 bg-mulberry/10 rounded-full blur-xl pointer-events-none" />
        <div class="relative z-10 flex flex-1 flex-col justify-between gap-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              24h Daily P/L
            </p>
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mulberry/10 text-mulberry-dark">
              <span class="material-icons !text-base">today</span>
            </span>
          </div>
          <Show
            when={props.hasTodayChangeData}
            fallback={
              <div class="flex items-baseline justify-between gap-2">
                <h2 class="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight text-earth/40">—</h2>
                <span class="text-[10px] text-earth/50 font-outfit font-semibold uppercase tracking-wider text-right">
                  Awaiting market close
                </span>
              </div>
            }
          >
            <div class="flex items-baseline justify-between gap-2">
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
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-outfit shrink-0"
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
    </div>
  );
};
