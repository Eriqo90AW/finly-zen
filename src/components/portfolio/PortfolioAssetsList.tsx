import { For } from "solid-js";
import { formatPortfolioValue } from "../../utils/format";
import { PortfolioAsset } from "../../types";
import { portfolioState } from "../../store/portfolioStore";

interface PortfolioAssetsListProps {
  assets: PortfolioAsset[];
  onSelectAsset: (asset: PortfolioAsset) => void;
  onAddAsset: () => void;
}

export const PortfolioAssetsList = (props: PortfolioAssetsListProps) => {
  const currency = () => portfolioState.currencyView;

  return (
    <div class="premium-card overflow-hidden">
      <div class="px-6 py-4 border-b border-forest/5 flex justify-between items-center">
        <h4 class="font-outfit font-bold text-forest">Assets</h4>
        <button 
          onClick={() => props.onAddAsset()}
          class="text-xs font-bold text-spring hover:text-forest transition-colors uppercase tracking-widest cursor-pointer"
        >
          + Add Asset
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-[10px] uppercase tracking-widest text-earth font-bold border-b border-forest/5">
              <th class="px-6 py-4">Asset</th>
              <th class="px-6 py-4">Holdings</th>
              <th class="px-6 py-4 text-right">Value</th>
              <th class="px-6 py-4 text-right">Gain / Loss</th>
              <th class="px-6 py-4 text-right">Allocation (Actual / Target)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-forest/5">
            <For each={props.assets} fallback={
              <tr>
                <td colspan="5" class="px-6 py-12 text-center text-earth/40 italic font-outfit">
                  No assets in this portfolio yet. Click "+ Add Asset" to start.
                </td>
              </tr>
            }>
              {(asset) => (
                <tr 
                  onClick={() => props.onSelectAsset(asset)}
                  class="group hover:bg-forest/5 transition-colors cursor-pointer"
                >
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="font-outfit font-bold text-forest">{asset.ticker}</span>
                      <span class="text-[10px] text-earth uppercase tracking-tighter">{asset.name}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="font-outfit text-forest">{asset.totalShares.toFixed(4)} shares</span>
                      <span class="text-[10px] text-earth">Avg. {formatPortfolioValue(asset.averagePrice, currency(), true)}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="font-outfit font-medium text-forest">{formatPortfolioValue(asset.currentValue, currency())}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class={`font-outfit font-medium ${asset.totalGainLoss >= 0 ? 'text-spring' : 'text-red-500'}`}>
                      {asset.totalGainLoss >= 0 ? '+' : ''}{formatPortfolioValue(asset.totalGainLoss, currency())}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex flex-col items-end">
                      <span class="font-outfit text-forest font-bold">{asset.actualAllocation.toFixed(1)}%</span>
                      <div class="w-16 h-1 bg-forest/10 rounded-full mt-1 overflow-hidden">
                        <div 
                          class="h-full bg-forest" 
                          style={{ width: `${Math.min(asset.actualAllocation, 100)}%` }}
                        />
                      </div>
                      <span class="text-[10px] text-earth mt-0.5">Target: {asset.targetAllocation}%</span>
                    </div>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};
