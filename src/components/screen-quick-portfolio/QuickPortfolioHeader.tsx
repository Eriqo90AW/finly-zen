interface QuickPortfolioHeaderProps {
  lastUpdatedLabel: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const QuickPortfolioHeader = (props: QuickPortfolioHeaderProps) => {
  return (
    <div class="flex justify-between items-end">
      <div>
        <h2 class="font-headline-xl text-3xl font-bold text-forest">Quick Portfolio</h2>
        <p class="font-body-md text-sm text-earth mt-1">Real-time asset management and performance tracking.</p>
      </div>
      <div class="flex gap-3 items-center select-none">
        <div class="bg-white border border-forest/10 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xs">
          <span class="w-2 h-2 rounded-full bg-spring animate-pulse-soft"></span>
          <span class="font-outfit text-xs text-earth font-medium">
            Price Refreshed: <span class="font-bold text-near-black">{props.lastUpdatedLabel}</span>
          </span>
          {props.onRefresh && (
            <button
              onClick={props.onRefresh}
              disabled={props.isRefreshing}
              title="Refresh Market Prices"
              class="ml-1 p-1 text-earth hover:text-forest hover:bg-sage/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50 border-0 outline-none"
            >
              <span class={`material-icons !text-sm ${props.isRefreshing ? "animate-spin" : ""}`}>
                sync
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

