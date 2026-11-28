import { useNavigate, useParams } from "@solidjs/router";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import { type Accessor, Show } from "solid-js";
import { currentStockData, isStockLoading } from "../../store/stockContext";
import type { MarketStatus } from "../../types";
import { formatUSD, formatUSDCompact } from "../../utils/format";

interface TopBarStockHeaderProps {
  marketStatus: Accessor<MarketStatus>;
}

export const TopBarStockHeaderDesktop = (props: TopBarStockHeaderProps) => {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <div class="flex items-center gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
      >
        <ChevronLeftIcon />
      </button>
      <div class="h-8 w-px bg-forest/10 mx-1" />

      <Show
        when={currentStockData()}
        fallback={
          <div class="flex items-center gap-2">
            <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
              {params.ticker}
            </span>
            <span class="text-xs text-earth font-medium animate-ellipsis">Loading data</span>
          </div>
        }
      >
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-cormorant font-bold text-forest leading-none max-w-[30rem] line-clamp-1">
              {currentStockData()?.company_name}
            </h2>
            <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider">
              {currentStockData()?.ticker}
            </span>
            <span class="bg-sage text-forest text-[10px] px-1.5 py-0.5 rounded font-medium">
              {currentStockData()?.exchange}
            </span>
          </div>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-sm font-outfit font-bold text-forest">
              {formatUSD(
                currentStockData()?.valuation.active_price ||
                  currentStockData()?.valuation.current_price ||
                  0,
              )}
            </span>
            <span class="text-[10px] text-earth font-medium">
              Mkt Cap: {formatUSDCompact(currentStockData()?.valuation.market_cap || 0)}
            </span>
            <span class="text-[9px] text-earth/60 uppercase tracking-widest">
              As of: {new Date(currentStockData()?.as_of || "").toLocaleDateString()}
            </span>

            {/* Market Timing Indicator */}
            <div class="flex items-center gap-2 px-2 py-0.5 bg-sage/30 rounded-full border border-forest/5">
              <div
                class={`w-2 h-2 rounded-full ${props.marketStatus().color} animate-pulse-soft`}
              />
              <span class="text-[10px] font-bold text-forest uppercase tracking-tight">
                {props.marketStatus().session}
              </span>
            </div>

            <Show when={isStockLoading()}>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] text-forest font-bold uppercase tracking-widest animate-ellipsis">
                  Loading
                </span>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export const TopBarStockHeaderMobile = (props: TopBarStockHeaderProps) => {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <div class="flex items-center gap-2 shrink-0 py-1">
      <button
        type="button"
        onClick={() => navigate(-1)}
        class="w-7 h-7 rounded-lg bg-sage/50 flex items-center justify-center text-forest shrink-0"
      >
        <ChevronLeftIcon class="w-4 h-4" />
      </button>
      <span class="bg-forest text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
        {params.ticker}
      </span>
      <Show when={currentStockData()}>
        <span class="text-xs font-outfit font-bold text-forest shrink-0">
          {formatUSD(
            currentStockData()?.valuation.active_price ||
              currentStockData()?.valuation.current_price ||
              0,
          )}
        </span>
        <div class="flex items-center gap-1 px-1.5 py-0.5 bg-sage/40 rounded-full shrink-0">
          <div class={`w-1.5 h-1.5 rounded-full ${props.marketStatus().color}`} />
          <span class="text-[8px] font-bold text-forest uppercase">
            {props.marketStatus().session}
          </span>
        </div>
      </Show>
    </div>
  );
};
