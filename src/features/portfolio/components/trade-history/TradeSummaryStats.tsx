import { formatPortfolioValue } from "../../../../utils/format";
import type { TradeSummaryStatsData } from "./tradeHistoryHelpers";

interface TradeSummaryStatsProps {
  stats: TradeSummaryStatsData;
  isLoading: boolean;
  currency: "IDR" | "USD";
  nativeCurrency: "IDR" | "USD";
}

export const TradeSummaryStats = (props: TradeSummaryStatsProps) => {
  const isPositivePnL = () => props.stats.realizedPnL >= 0;

  return (
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up stagger-2">
      <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-forest">
        <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">
          Total Trades
        </span>
        <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-2">
          {props.isLoading ? "..." : props.stats.totalTrades}
          <span class="material-icons text-forest/20 text-lg">history</span>
        </span>
      </div>

      <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-spring">
        <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">
          Realized Return
        </span>
        <span
          class={`text-2xl font-bold mt-auto flex items-center gap-1.5 ${
            isPositivePnL() ? "text-spring" : "text-[#f43f5e]"
          }`}
        >
          {formatPortfolioValue(
            props.stats.realizedPnL,
            props.currency,
            false,
            props.nativeCurrency,
          )}
          <span class="material-icons text-xs">
            {isPositivePnL() ? "trending_up" : "trending_down"}
          </span>
        </span>
      </div>

      <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#52C278]">
        <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">
          Capital Invested
        </span>
        <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
          {formatPortfolioValue(
            props.stats.buyVolume,
            props.currency,
            true,
            props.nativeCurrency,
          )}
          <span class="material-icons text-[#52C278]/30 text-lg">
            shopping_cart
          </span>
        </span>
      </div>

      <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#f43f5e]">
        <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">
          Capital Released
        </span>
        <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
          {formatPortfolioValue(
            props.stats.sellVolume,
            props.currency,
            true,
            props.nativeCurrency,
          )}
          <span class="material-icons text-[#f43f5e]/30 text-lg">sell</span>
        </span>
      </div>

      <div class="fin-metric-card p-5 flex flex-col font-outfit relative overflow-hidden border-l-4 border-l-[#6366f1] col-span-2 md:col-span-1">
        <span class="text-[9px] text-earth/50 uppercase font-black tracking-wider mb-1">
          Dividends Earned
        </span>
        <span class="text-2xl font-bold text-forest mt-auto flex items-center gap-1.5">
          {formatPortfolioValue(
            props.stats.dividendIncome,
            props.currency,
            true,
            props.nativeCurrency,
          )}
          <span class="material-icons text-[#6366f1]/30 text-lg">payments</span>
        </span>
      </div>
    </div>
  );
};
