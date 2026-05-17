import { For, Show } from "solid-js";
import { formatPortfolioValue } from "../../utils/format";
import { PortfolioAsset } from "../../types";
import { portfolioState } from "../../store/portfolioStore";

interface PortfolioAssetsListProps {
  assets: PortfolioAsset[];
  onSelectAsset: (asset: PortfolioAsset) => void;
  onAddAsset: () => void;
  onDeleteAsset: (assetId: string) => void;
}

// Helper to generate a deterministic color from a string (the ticker)
const getAssetColor = (ticker: string) => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const PortfolioAssetsList = (props: PortfolioAssetsListProps) => {
  const currency = () => portfolioState.currencyView;

  const calculateGainPercentage = (asset: PortfolioAsset) => {
    const costBasis = asset.totalShares * asset.averagePrice;
    if (costBasis === 0) return 0;
    return (asset.totalGainLoss / costBasis) * 100;
  };

  return (
    <div class="premium-card overflow-hidden">
      <div class="px-8 py-6 border-b border-forest/5 flex justify-between items-center bg-white/50 backdrop-blur-sm">
        <h4 class="font-outfit font-bold text-forest text-lg">Assets</h4>
        <button 
          onClick={() => props.onAddAsset()}
          class="px-4 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest/90 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
        >
          <span class="material-icons text-sm">add</span>
          ADD ASSET
        </button>
      </div>

      <div class="flex flex-col min-w-[900px]">
        {/* Header Row */}
        <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60">
          {/* Spacer for the vertical bar */}
          <div class="w-1 mr-4" />
          
          <div class="flex-[2] min-w-0">Asset</div>
          <div class="flex-1 flex items-center gap-1">
            Value
            <span class="material-icons text-[14px] text-earth/40">expand_more</span>
          </div>
          <div class="flex-1 text-right">Price / Avg</div>
          <div class="flex-1 flex items-center justify-end gap-1">
            Total Gain / MWR
            <span class="material-icons text-[14px] text-earth/40">info_outline</span>
          </div>
          <div class="flex-1 text-right">Actual / Target</div>
        </div>

        {/* Assets List */}
        <div class="flex flex-col">
          <For each={props.assets} fallback={
            <div class="px-8 py-16 text-center text-earth/40 italic font-outfit">
              No assets in this portfolio yet. Click "+ Add Asset" to start.
            </div>
          }>
            {(asset) => {
              const assetColor = getAssetColor(asset.ticker);
              const gainPercent = calculateGainPercentage(asset);
              const isPositive = asset.totalGainLoss >= 0;
              const currentPrice = asset.totalShares > 0 ? asset.currentValue / asset.totalShares : 0;

              return (
                <div 
                  onClick={() => props.onSelectAsset(asset)}
                  class="group flex items-center px-8 py-5 border-b border-forest/5 hover:bg-slate-50/80 transition-colors duration-200 cursor-pointer relative"
                >
                  <div 
                    class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
                    style={{ "background-color": assetColor }}
                  />

                  {/* Name Column */}
                  <div class="flex-[2] flex items-center gap-4 min-w-0">
                    <div 
                      class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ "background-color": assetColor }}
                    >
                      {asset.ticker.charAt(0)}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors">
                        {asset.ticker}
                      </span>
                      <span class="text-xs text-earth/60 truncate max-w-[180px]">
                        {asset.name}
                      </span>
                    </div>
                  </div>

                  {/* Value Column */}
                  <div class="flex-1 flex items-center">
                    <span class="font-outfit font-medium text-forest text-sm">
                      {formatPortfolioValue(asset.currentValue, currency())}
                    </span>
                  </div>

                  {/* Price / Avg Column */}
                  <div class="flex-1 flex flex-col items-end gap-0.5">
                    <span class="font-outfit font-medium text-forest text-sm">
                      {formatPortfolioValue(currentPrice, currency())}
                    </span>
                    <span class="text-[11px] text-earth/60 font-medium">
                      Avg {formatPortfolioValue(asset.averagePrice, currency())}
                    </span>
                  </div>

                  {/* Gain Column */}
                  <div class="flex-1 flex flex-col items-end gap-0.5">
                    <span class={`font-outfit font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{formatPortfolioValue(asset.totalGainLoss, currency())}
                    </span>
                    <div class={`flex items-center text-[11px] font-bold ${isPositive ? 'text-emerald-600/80' : 'text-rose-500/80'}`}>
                      <span class="material-icons text-[14px]">
                        {isPositive ? 'arrow_drop_up' : 'arrow_drop_down'}
                      </span>
                      {Math.abs(gainPercent).toFixed(2)}%
                    </div>
                  </div>

                  {/* Allocation Column */}
                  <div class="flex-1 flex flex-col items-end gap-0.5">
                    <div class="flex items-center gap-2">
                      <span class="font-outfit text-earth/60 text-xs font-medium">
                        {asset.actualAllocation.toFixed(1)}%
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onDeleteAsset(asset.id);
                        }}
                        class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/20 hover:text-rose-500 p-1 hover:bg-rose-50 rounded-md cursor-pointer"
                        title="Delete Asset"
                      >
                        <span class="material-icons text-base">delete_outline</span>
                      </button>
                    </div>
                    <span class="font-outfit text-forest font-bold text-sm">
                      {asset.targetAllocation.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
