interface QuickPortfolioHeaderProps {
  lastUpdatedLabel: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const QuickPortfolioHeader = (props: QuickPortfolioHeaderProps) => {
  return (
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-forest"></span>
          <span class="text-[10px] font-bold text-earth uppercase tracking-widest">
            Portfolio Management
          </span>
        </div>
        <h1 class="font-cormorant text-3xl sm:text-4xl font-bold text-forest tracking-tight">
          Quick Portfolio
        </h1>
        <p class="font-outfit text-xs sm:text-sm text-earth/80 mt-1">
          Real-time multi-asset management, IDX performance, and live valuation tracking.
        </p>
      </div>
      <div class="flex gap-3 items-center select-none self-end">
        <div class="bg-white/80 backdrop-blur-sm border border-forest/10 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-premium">
          <span class="w-2 h-2 rounded-full bg-spring animate-pulse-soft"></span>
          <span class="font-outfit text-xs text-earth font-medium">
            Live Prices: <span class="font-bold text-near-black">{props.lastUpdatedLabel}</span>
          </span>
          {props.onRefresh && (
            <button
              onClick={props.onRefresh}
              disabled={props.isRefreshing}
              title="Refresh Market Prices"
              class="ml-1 p-1 text-earth hover:text-forest hover:bg-sage/50 rounded-lg transition-all cursor-pointer disabled:opacity-50 border-0 outline-none active:scale-95"
            >
              <span class={`material-icons !text-base ${props.isRefreshing ? "animate-spin" : ""}`}>
                sync
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


