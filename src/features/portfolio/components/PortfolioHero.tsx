import { Show } from "solid-js";
import { portfolioState } from "../../../store/portfolioStore";
import type { Portfolio } from "../../../types";
import {
  calculateDisplayGainAndPercentage,
  formatPortfolioValue,
} from "../../../utils/format";
import { calculatePortfolioRealizedPnL } from "../model/portfolioMetrics";

interface PortfolioHeroProps {
  portfolio?: Portfolio;
}

export const PortfolioHero = (props: PortfolioHeroProps) => {
  const currency = () => portfolioState.currencyView;

  const gainStats = () => {
    if (!props.portfolio) return { gain: 0, percentage: 0, isPositive: true };
    return calculateDisplayGainAndPercentage(
      props.portfolio.totalValue,
      props.portfolio.initialCapital,
      props.portfolio.price_currency ?? 1,
      props.portfolio.nativeCurrency,
      currency(),
    );
  };

  const isPositive = () => gainStats().isPositive;

  const totalUnrealizedGainLoss = () => {
    if (!props.portfolio?.assets) return 0;
    return props.portfolio.assets.reduce(
      (sum, asset) => sum + asset.totalGainLoss,
      0,
    );
  };

  const totalUnrealizedGainLossPercentage = () => {
    if (!props.portfolio || props.portfolio.totalValue === 0) return 0;
    return (totalUnrealizedGainLoss() / props.portfolio.totalValue) * 100;
  };

  const realizedPnLStats = () =>
    calculatePortfolioRealizedPnL(
      props.portfolio?.transactions,
      props.portfolio?.totalValue ?? 0,
    );

  return (
    <Show
      when={!portfolioState.isLoading && props.portfolio}
      fallback={
        <div class="premium-card relative overflow-hidden p-8 border-forest/10 group mb-6 cursor-default bg-sand animate-pulse">
          <div class="relative flex flex-col md:flex-row items-center justify-between gap-10">
            <div class="flex flex-col items-center md:items-start text-center md:text-left min-w-[300px] space-y-4">
              <div class="h-3 bg-sage/20 rounded w-1/3" />
              <div class="h-12 bg-sage/20 rounded w-2/3" />
              <div class="flex items-center gap-2 mt-4">
                <div class="h-6 bg-sage/20 rounded w-16" />
                <div class="h-4 bg-sage/20 rounded w-12" />
                <div class="h-4 bg-sage/20 rounded w-24" />
              </div>
            </div>
            <div class="flex gap-10 bg-forest/[0.03] p-8 rounded-2xl border border-forest/5 w-full md:w-auto items-center">
              <div class="space-y-3">
                <div class="h-3 bg-sage/20 rounded w-10" />
                <div class="h-5 bg-sage/20 rounded w-24" />
              </div>
              <div class="h-12 w-[2px] bg-forest/10" />
              <div class="space-y-3">
                <div class="h-3 bg-sage/20 rounded w-16" />
                <div class="h-5 bg-sage/20 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      {(portfolio) => (
        <div class="premium-card relative overflow-hidden p-8 border-forest/10 group mb-6 cursor-default bg-sand">
          <div class="relative flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Main Highlight */}
            <div class="flex flex-col items-center md:items-start text-center md:text-left min-w-[300px]">
              <div class="flex items-center gap-2 mb-2">
                <div
                  class={`w-2 h-2 rounded-2xl ${
                    isPositive() ? "bg-spring" : "bg-red-500"
                  } animate-pulse-soft`}
                  style={{ "will-change": "transform, opacity" }}
                />
                <p class="text-[10px] font-bold text-earth/60 uppercase tracking-[0.25em]">
                  Portfolio Net Worth
                </p>
              </div>
              <div class="flex flex-col">
                <span class="text-[56px] font-outfit font-[500] text-forest leading-none tracking-tighter">
                  {formatPortfolioValue(
                    portfolio().totalValue,
                    currency(),
                    false,
                    portfolio().nativeCurrency,
                  )}
                </span>
                <div class="flex items-center gap-2 mt-4 justify-center md:justify-start">
                  <div
                    class={`px-3 py-1 rounded-lg text-sm font-black shadow-sm flex items-center gap-1.5 ${
                      isPositive()
                        ? "bg-spring/10 text-spring border border-spring/20"
                        : "bg-red-500/10 text-red-500 border border-red-500/20"
                    }`}
                  >
                    <span class="material-icons text-sm">
                      {isPositive() ? "trending_up" : "trending_down"}
                    </span>
                    {isPositive() ? "+" : ""}
                    {formatPortfolioValue(
                      gainStats().gain,
                      currency(),
                      true,
                      currency(),
                    )}
                  </div>
                  <span
                    class={`text-sm font-bold ${
                      isPositive() ? "text-spring" : "text-red-500"
                    }`}
                  >
                    ({gainStats().percentage.toFixed(2)}%)
                  </span>
                  <span class="text-earth/40 font-medium text-sm">
                    All time Profit / Loss
                  </span>
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
                    {formatPortfolioValue(
                      portfolio().cash,
                      currency(),
                      false,
                      portfolio().nativeCurrency,
                      portfolio().price_currency,
                    )}
                  </span>
                  <span class="text-[10px] font-[900] text-orange-500 bg-orange-300/30 px-1.5 py-0.5 rounded-md border border-spring/20">
                    {portfolio().totalValue > 0
                      ? ((portfolio().cash / portfolio().totalValue) * 100).toFixed(
                          1,
                        )
                      : "0.0"}
                    %
                  </span>
                </div>
              </div>

              <div class="h-12 w-[2px] bg-forest/10" />

              <div class="flex flex-col items-center md:md:items-start group/stat">
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
                    portfolio().totalValue - portfolio().cash,
                    currency(),
                    false,
                    portfolio().nativeCurrency,
                  )}
                </span>
              </div>

              <div class="h-12 w-[2px] bg-forest/10" />

              <div class="flex flex-col items-center md:items-start group/stat">
                <div class="flex items-center gap-2 mb-2">
                  <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">
                    show_chart
                  </span>
                  <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">
                    Total Gain / Loss
                  </p>
                </div>
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider min-w-[70px]">
                      Unrealized:
                    </span>
                    <span
                      class={`text-[13px] font-outfit font-bold leading-none ${
                        totalUnrealizedGainLoss() >= 0
                          ? "text-spring"
                          : "text-red-500"
                      }`}
                    >
                      {totalUnrealizedGainLoss() >= 0 ? "+" : ""}
                      {formatPortfolioValue(
                        totalUnrealizedGainLoss(),
                        currency(),
                        false,
                        portfolio().nativeCurrency,
                      )}
                    </span>
                    <span
                      class={`text-[10px] font-[900] px-[2px] py-[1px] rounded ${
                        totalUnrealizedGainLoss() >= 0
                          ? "text-spring bg-spring/10 border border-spring/20"
                          : "text-red-500 bg-red-500/10 border border-red-500/20"
                      }`}
                    >
                      {totalUnrealizedGainLoss() >= 0 ? "+" : ""}
                      {totalUnrealizedGainLossPercentage().toFixed(1)}%
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider min-w-[70px]">
                      Realized:
                    </span>
                    <span
                      class={`text-[13px] font-outfit font-bold leading-none ${
                        realizedPnLStats().gain >= 0
                          ? "text-spring"
                          : "text-red-500"
                      }`}
                    >
                      {realizedPnLStats().gain >= 0 ? "+" : ""}
                      {formatPortfolioValue(
                        realizedPnLStats().gain,
                        currency(),
                        false,
                        portfolio().nativeCurrency,
                      )}
                    </span>
                    <span
                      class={`text-[10px] font-[900] px-[2px] py-[1px] rounded ${
                        realizedPnLStats().gain >= 0
                          ? "text-spring bg-spring/10 border border-spring/20"
                          : "text-red-500 bg-red-500/10 border border-red-500/20"
                      }`}
                    >
                      {realizedPnLStats().gain >= 0 ? "+" : ""}
                      {realizedPnLStats().percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
};
