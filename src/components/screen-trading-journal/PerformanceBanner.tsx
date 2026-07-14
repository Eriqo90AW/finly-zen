import { MonthlyPerformance } from "../../data/TradingJournal/data/types";
import { formatRupiah } from "../../utils/format";

interface PerformanceBannerProps {
  performance: MonthlyPerformance;
}

export default function PerformanceBanner(props: PerformanceBannerProps) {
  return (
    <div class="premium-card bg-gradient-to-b from-white to-sage/5 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div class="absolute -top-12 -right-12 w-48 h-48 bg-spring/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="flex items-center gap-4 z-10">
        <div class="bg-sage/40 flex flex-col items-center justify-center w-20 h-20 rounded-xl border border-forest/5 shadow-sm">
          <span class="text-3xl font-cormorant font-bold text-forest">{props.performance.streak}</span>
          <span class="text-[9px] font-bold text-earth uppercase tracking-wider mt-1 flex items-center gap-0.5">
            Streak <span class="text-terracotta text-[10px]">🔥</span>
          </span>
        </div>
        <div>
          <h2 class="text-2xl font-cormorant text-forest font-bold mb-1">{props.performance.monthName} Summary</h2>
          <p class="text-xs text-earth">Consistent execution aligned with trading plan.</p>
        </div>
      </div>
      
      <div class="flex flex-wrap gap-6 md:gap-8 z-10">
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Total PnL</span>
          <span class="font-cormorant text-2xl text-emerald-600 font-bold"
            classList={{
              "text-emerald-600": props.performance.totalPnL >= 0,
              "text-rose-500": props.performance.totalPnL < 0
            }}
          >
            {props.performance.totalPnL >= 0 ? "+" : ""}{formatRupiah(props.performance.totalPnL)}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">R-Multiple</span>
          <span class="font-cormorant text-2xl text-emerald-600 font-bold">
            +{props.performance.totalR.toFixed(1)}R
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Win Rate</span>
          <span class="font-cormorant text-2xl text-forest font-bold">
            {props.performance.winRate}%
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-[9px] font-bold text-earth uppercase tracking-widest mb-1">Profit Factor</span>
          <span class="font-cormorant text-2xl text-forest font-bold">
            {props.performance.profitFactor.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
