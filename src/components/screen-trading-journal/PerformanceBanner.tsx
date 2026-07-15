import { createSignal } from "solid-js";
import { MonthlyPerformance } from "../../data/TradingJournal/data/types";
import { formatRupiah } from "../../utils/format";

interface PerformanceBannerProps {
  performance: MonthlyPerformance;
  allTimePerformance: MonthlyPerformance;
}

export default function PerformanceBanner(props: PerformanceBannerProps) {
  const [viewMode, setViewMode] = createSignal<"Monthly" | "AllTime">("Monthly");
  
  const currentPerformance = () => 
    viewMode() === "Monthly" ? props.performance : props.allTimePerformance;

  return (
    <div class="premium-card bg-gradient-to-b from-white to-sage/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div class="absolute -top-12 -right-12 w-48 h-48 bg-spring/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="flex items-center gap-4 z-10">
        <div class="bg-sage/40 flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-forest/5 shadow-sm shrink-0">
          <span class="text-3xl font-cormorant font-bold text-forest">{currentPerformance().streak}</span>
          <span class="text-[9px] font-bold text-earth uppercase tracking-wider mt-1 flex items-center gap-0.5">
            Streak <span class="text-terracotta text-[10px]">🔥</span>
          </span>
        </div>
        <div>
          <h2 class="text-2xl font-cormorant text-forest font-bold mb-1">
            {currentPerformance().monthName} Summary
          </h2>
          <p class="text-xs text-earth">Consistent execution aligned with trading plan.</p>
          
          {/* View Mode Toggle Switch */}
          <div class="flex bg-sage/20 p-[0.125rem] rounded-lg border border-forest/5 shrink-0 mt-2.5 w-fit">
            <button
              onClick={() => setViewMode("Monthly")}
              class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                viewMode() === "Monthly" 
                  ? "bg-forest text-white shadow-sm" 
                  : "text-forest/60 hover:text-forest"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("AllTime")}
              class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                viewMode() === "AllTime" 
                  ? "bg-forest text-white shadow-sm" 
                  : "text-forest/60 hover:text-forest"
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex flex-wrap gap-6 md:gap-8 z-10">
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Total PnL</span>
          <span class="font-cormorant text-2xl text-emerald-600 font-bold"
            classList={{
              "text-emerald-600": currentPerformance().totalPnL >= 0,
              "text-rose-500": currentPerformance().totalPnL < 0
            }}
          >
            {currentPerformance().totalPnL >= 0 ? "+" : ""}{formatRupiah(currentPerformance().totalPnL)}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">R-Multiple</span>
          <span class="font-cormorant text-2xl font-bold"
            classList={{
              "text-emerald-600": currentPerformance().totalR >= 0,
              "text-rose-500": currentPerformance().totalR < 0
            }}
          >
            {currentPerformance().totalR >= 0 ? "+" : ""}{currentPerformance().totalR.toFixed(1)}R
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Win Rate</span>
          <span class="font-cormorant text-2xl text-forest font-bold">
            {currentPerformance().winRate}%
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Profit Factor</span>
          <span class="font-cormorant text-2xl text-forest font-bold">
            {currentPerformance().profitFactor.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
