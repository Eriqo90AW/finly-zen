import { For } from "solid-js";
import { AssetLogo } from "../../../../components/common/AssetLogo";
import { formatPortfolioValue } from "../../../../utils/format";
import type { LeadersBoardData } from "./tradeHistoryHelpers";

interface TradePerformersGridProps {
  leadersBoard: LeadersBoardData;
  tickerLogos: Record<string, string>;
  tickerNames: Record<string, string>;
  currency: "IDR" | "USD";
  nativeCurrency: "IDR" | "USD";
  onNavigateStock: (ticker: string) => void;
}

export const TradePerformersGrid = (props: TradePerformersGridProps) => {
  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up stagger-4">
      {/* Top Gainers */}
      <div class="premium-card p-5 border-l-4 border-l-spring flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-4">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-spring text-base">
              emoji_events
            </span>
            Top Performers
          </h4>
          <p class="text-earth/50 text-[10px] font-outfit uppercase tracking-wider font-bold">
            Highest Realized Gains
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <For
            each={props.leadersBoard.gainers}
            fallback={
              <span class="text-earth/40 text-xs italic py-2">
                No realized gains recorded yet.
              </span>
            }
          >
            {(item) => (
              <div class="flex items-center justify-between p-3 rounded-xl bg-sage/10 border border-forest/5 hover:border-forest/10 transition-all">
                <div class="flex items-center gap-2.5">
                  <AssetLogo
                    ticker={item.ticker}
                    logoUrl={props.tickerLogos[item.ticker.toUpperCase()]}
                    size="sm"
                    class="w-7 h-7 rounded-lg shadow-xs border border-forest/10"
                    imageClass="object-contain p-0.5 bg-white"
                    fallbackType="letter"
                  />
                  <div class="flex flex-col min-w-0">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onNavigateStock(item.ticker);
                      }}
                      class="font-outfit font-bold text-forest text-sm leading-tight hover:text-spring transition-colors hover:underline cursor-pointer"
                    >
                      {item.ticker}
                    </span>
                    <span class="text-[10px] text-earth/60 truncate max-w-[120px]">
                      {props.tickerNames[item.ticker.toUpperCase()] ||
                        "Unknown Asset"}
                    </span>
                  </div>
                </div>
                <span class="font-outfit font-black text-sm text-spring">
                  +
                  {formatPortfolioValue(
                    item.realizedPnL,
                    props.currency,
                    false,
                    props.nativeCurrency,
                  )}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Top Losers */}
      <div class="premium-card p-5 border-l-4 border-l-[#f43f5e] flex flex-col">
        <div class="border-b border-forest/5 pb-3 mb-4">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-2">
            <span class="material-icons text-[#f43f5e] text-base">
              trending_down
            </span>
            Worst Performers
          </h4>
          <p class="text-earth/50 text-[10px] font-outfit uppercase tracking-wider font-bold">
            Highest Realized Losses
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <For
            each={props.leadersBoard.losers}
            fallback={
              <span class="text-earth/40 text-xs italic py-2">
                No realized losses recorded yet.
              </span>
            }
          >
            {(item) => (
              <div class="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/5 hover:border-red-500/10 transition-all">
                <div class="flex items-center gap-2.5">
                  <AssetLogo
                    ticker={item.ticker}
                    logoUrl={props.tickerLogos[item.ticker.toUpperCase()]}
                    size="sm"
                    class="w-7 h-7 rounded-lg shadow-xs border border-forest/10"
                    imageClass="object-contain p-0.5 bg-white"
                    fallbackType="letter"
                  />
                  <div class="flex flex-col min-w-0">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onNavigateStock(item.ticker);
                      }}
                      class="font-outfit font-bold text-forest text-sm leading-tight hover:text-spring transition-colors hover:underline cursor-pointer"
                    >
                      {item.ticker}
                    </span>
                    <span class="text-[10px] text-earth/60 truncate max-w-[120px]">
                      {props.tickerNames[item.ticker.toUpperCase()] ||
                        "Unknown Asset"}
                    </span>
                  </div>
                </div>
                <span class="font-outfit font-black text-sm text-[#f43f5e]">
                  {formatPortfolioValue(
                    item.realizedPnL,
                    props.currency,
                    false,
                    props.nativeCurrency,
                  )}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
