import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";
import type { Portfolio } from "../../../types";

interface PortfolioHeroProps {
  portfolio: Portfolio;
}

export const PortfolioHero = (props: PortfolioHeroProps) => {
  const currency = () => portfolioState.currencyView;
  const isPositive = () => props.portfolio.allTimeGain >= 0;

  return (
    <div class="premium-card relative overflow-hidden p-8 border-forest/10 group mb-6 cursor-default bg-sand">
      <div class="relative flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Main Highlight */}
        <div class="flex flex-col items-center md:items-start text-center md:text-left min-w-[300px]">
          <div class="flex items-center gap-2 mb-2">
            <div
              class={`w-2 h-2 rounded-2xl ${isPositive() ? "bg-spring" : "bg-red-500"} animate-pulse-soft`}
              style={{ "will-change": "transform, opacity" }}
            ></div>
            <p class="text-[10px] font-bold text-earth/60 uppercase tracking-[0.25em]">
              Portfolio Net Worth
            </p>
          </div>
          <div class="flex flex-col">
            <span class="text-[56px] font-outfit font-[500] text-forest leading-none tracking-tighter">
              {formatPortfolioValue(props.portfolio.totalValue, currency())}
            </span>
            <div class="flex items-center gap-2 mt-4 justify-center md:justify-start">
              <div
                class={`px-3 py-1 rounded-lg text-sm font-black shadow-sm flex items-center gap-1.5 ${isPositive() ? "bg-spring/10 text-spring border border-spring/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}
              >
                <span class="material-icons text-sm">
                  {isPositive() ? "trending_up" : "trending_down"}
                </span>
                {isPositive() ? "+" : ""}
                {formatPortfolioValue(
                  props.portfolio.allTimeGain,
                  currency(),
                  true,
                )}
              </div>
              <span
                class={`text-sm font-bold ${isPositive() ? "text-spring" : "text-red-500"}`}
              >
                ({props.portfolio.allTimeGainPercentage.toFixed(2)}%)
              </span>
              <span class="text-earth/40 font-medium text-sm">All time Profit / Loss</span>
            </div>
          </div>
        </div>
 
        {/* Secondary Metrics Grid */}
        <div class="flex gap-10 bg-forest/[0.03] p-8 rounded-2xl border border-forest/5 w-full md:w-auto items-center">
          <div class="flex flex-col items-center md:items-start group/stat">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">
                payments
              </span>
              <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">
                Cash
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xl font-outfit font-bold text-forest leading-none">
                {formatPortfolioValue(props.portfolio.cash, currency())}
              </span>
              <span class="text-[10px] font-[900] text-orange-500 bg-orange-300/30 px-1.5 py-0.5 rounded-md border border-spring/20">
                {props.portfolio.totalValue > 0
                  ? (
                      (props.portfolio.cash / props.portfolio.totalValue) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
          </div>

          <div class="h-12 w-[2px] bg-forest/10" />

          <div class="flex flex-col items-center md:md:items-start group/stat ">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">
                inventory_2
              </span>
              <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">
                Assets Value
              </p>
            </div>
            <span class="text-xl font-outfit font-bold text-forest leading-none">
              {formatPortfolioValue(
                props.portfolio.totalValue - props.portfolio.cash,
                currency(),
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
