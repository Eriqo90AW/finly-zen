import { Show, createSignal } from "solid-js";
import { formatPercent, formatUSD, formatUSDCompact } from "../../utils/format";
import type { StockHeroProps } from "../../types";
import { priceAlertState } from "../../store/priceAlertStore";
import { PriceAlertModal } from "./modals/PriceAlertModal";

export const StockHero = (props: StockHeroProps) => {
  const d = () => props.data;
  const status = () => props.marketStatus;
  const diff = () => d().valuation?.price_diff_percentage ?? 0;
  const isPositive = () => diff() >= 0;

  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const activeAlertsCount = () => {
    const ticker = d().ticker;
    if (!ticker) return 0;
    return priceAlertState.alerts.filter(
      (a) => a.ticker === ticker.toUpperCase() && !a.triggered
    ).length;
  };

  return (
    <div class="premium-card relative overflow-hidden p-6 bg-gradient-to-br from-white via-sage/5 to-sage/10 border-forest/10 group transition-all duration-500 hover:shadow-lg hover:cursor-default">
      {/* Decorative background element */}
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-forest/5 rounded-full blur-3xl group-hover:bg-forest/10 transition-colors duration-700"></div>

      <div class="relative flex flex-col lg:flex-row justify-between items-end gap-6">
        {/* Left Side: Company Identity & Market Status */}
        <div class="flex flex-col gap-3 w-full lg:w-auto">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-3 flex-wrap">
              {/* Price Notification Bell */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                class="relative p-2 rounded-xl border border-forest/10 bg-gradient-to-l from-forest/10 to-forest/5 hover:from-forest/15 hover:to-forest/10 text-forest/70 hover:text-forest transition-all flex items-center justify-center cursor-pointer group/bell"
                title="Price Notifications"
              >
                <span
                  class="material-icons text-xl transition-transform"
                  classList={{
                    "text-spring animate-bell-ring": activeAlertsCount() > 0,
                    "group-hover/bell:animate-bell-ring": activeAlertsCount() === 0,
                  }}
                >
                  {activeAlertsCount() > 0 ? "notifications_active" : "notifications"}
                </span>
                <Show when={activeAlertsCount() > 0}>
                  <span class="absolute -top-1 -right-1 bg-spring text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {activeAlertsCount()}
                  </span>
                </Show>
              </button>

              <h1 class="text-3xl md:text-4xl font-cormorant font-bold text-forest leading-tight tracking-tight line-clamp-1">
                {d().company_name}
              </h1>
              <div class="flex items-center gap-2">
                <span class="bg-forest text-white text-[10px] px-2 py-0.5 rounded-lg font-black tracking-widest shadow-sm">
                  {d().ticker}
                </span>
                <span class="bg-white/80 backdrop-blur-sm text-forest/60 text-[9px] px-1.5 py-0.5 rounded-lg font-bold border border-forest/10 uppercase tracking-widest">
                  {d().exchange}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3 flex-wrap mt-0.5">
              <div class="flex gap-2">
                <Show when={d().sector}>
                  <span class="bg-fin-blue/5 text-fin-blue text-[9px] px-2 py-0.5 rounded-full font-bold border border-fin-blue/10 uppercase tracking-wide">
                    {d().sector}
                  </span>
                </Show>
                <Show when={d().industry}>
                  <span class="bg-fin-purple/5 text-fin-purple text-[9px] px-2 py-0.5 rounded-full font-bold border border-fin-purple/10 uppercase tracking-wide">
                    {d().industry}
                  </span>
                </Show>
              </div>

              <div class="h-4 w-px bg-forest/10 mx-1 hidden md:block" />

              {/* Market Status Countdown - inline */}
              <div class="flex items-center gap-2 bg-white/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-forest/5 shadow-sm group/status hover:bg-white/60 transition-all duration-300">
                <div
                  class={`w-1.5 h-1.5 rounded-full ${status().color} animate-pulse-soft`}
                ></div>
                <span class="text-[9px] font-black text-forest uppercase tracking-tight whitespace-nowrap">
                  {status().session}
                </span>
                <span class="text-[9px] text-earth/60 font-bold uppercase tracking-widest border-l border-forest/10 pl-2">
                  {status().session === "Market Closed" ? "Opens" : "Closes"} in{" "}
                  {status().timeRemaining}
                </span>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-earth/60 font-bold uppercase tracking-[0.15em] mt-1">
            Last Updated •{" "}
            {new Date(d().as_of).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        {/* Right Side: Financial Stats */}
        <div class="flex items-center gap-6 lg:gap-10 bg-forest/[0.02] p-5 lg:p-4 rounded-2xl border border-forest/5 w-full lg:w-auto justify-between lg:justify-start">
          <div class="flex flex-col items-start">
            <p class="text-[9px] font-bold text-earth/60 uppercase tracking-widest mb-1.5">
              Price Action
            </p>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-start min-w-32">
                <div class="flex items-center gap-3">
                  <span class="text-[38px] font-outfit font-black text-forest leading-none tracking-tighter">
                    {formatUSD(d().valuation?.extended_hours_price ?? d().valuation?.current_price ?? 0)}
                  </span>
                  <div
                    class={`flex h-6 items-center gap-1 px-1.5 py-0.5 rounded-md border ${isPositive() ? "bg-fin-green/10 border-fin-green/10" : "bg-red-500/10 border-red-500/10"}`}
                  >
                    <span
                      class={`font-black text-[12px] ${isPositive() ? "text-fin-green" : "text-red-500"}`}
                    >
                      {formatPercent(diff())}
                    </span>
                  </div>
                </div>
                <span class="text-[8px] text-earth/40 font-bold uppercase tracking-[0.1em] mt-1 ml-0.5">
                  Next price update in {Math.floor(props.nextUpdateIn / 60)}:
                  {(props.nextUpdateIn % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <div class="h-12 w-px bg-forest/10" />

          <div class="flex flex-col items-end">
            <p class="text-[9px] font-bold text-earth/60 uppercase tracking-widest mb-1.5">
              Market Cap
            </p>
            <div class="flex flex-col items-end">
              <span class="text-xl font-outfit font-bold text-forest leading-none">
                {formatUSDCompact(d().valuation?.market_cap ?? 0)}
              </span>
              <span class="text-[9px] text-earth/60 font-bold uppercase tracking-widest mt-1">
                {(() => {
                  const cap = d().valuation?.market_cap ?? 0;
                  if (cap >= 500000000000) return "Large Cap";
                  if (cap >= 10000000000) return "Mid Cap";
                  if (cap >= 1000000000) return "Small Cap";
                  return "Micro Cap";
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <PriceAlertModal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        stockData={d()}
      />
    </div>
  );
};
