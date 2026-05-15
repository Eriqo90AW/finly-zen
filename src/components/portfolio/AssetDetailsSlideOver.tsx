import { Show, For } from "solid-js";
import CloseIcon from "@suid/icons-material/Close";
import { PortfolioAsset, PortfolioTransaction } from "../../types";
import { formatPortfolioValue } from "../../utils/format";
import { portfolioState } from "../../store/portfolioStore";

interface AssetDetailsSlideOverProps {
  asset: PortfolioAsset | null;
  transactions: PortfolioTransaction[];
  isOpen: boolean;
  onClose: () => void;
}

export const AssetDetailsSlideOver = (props: AssetDetailsSlideOverProps) => {
  const currency = () => portfolioState.currencyView;

  return (
    <div 
      class={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${props.isOpen ? 'bg-black/20' : 'opacity-0 pointer-events-none'}`}
      onClick={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <div 
        class={`w-full max-w-md bg-white h-screen shadow-2xl transition-transform duration-500 flex flex-col ${props.isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Show when={props.asset}>
          {(asset) => (
            <>
              {/* Header */}
              <div class="p-6 border-b border-forest/10 flex items-center justify-between bg-sage/5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-white">
                    <span class="material-icons text-xl font-bold">{asset().ticker.substring(0, 1)}</span>
                  </div>
                  <div>
                    <h3 class="text-xl font-cormorant text-forest font-bold leading-tight">{asset().ticker}</h3>
                    <p class="text-[10px] text-earth uppercase tracking-widest">{asset().name}</p>
                  </div>
                </div>
                <button onClick={props.onClose} class="text-earth hover:text-forest transition-colors p-2 hover:bg-forest/5 rounded-full cursor-pointer">
                  <CloseIcon />
                </button>
              </div>

              {/* Asset Summary */}
              <div class="p-6 grid grid-cols-2 gap-4 border-b border-forest/5">
                <div class="p-4 bg-sage/10 rounded-2xl">
                  <p class="text-[10px] uppercase tracking-widest text-earth mb-1">Total Holding</p>
                  <p class="text-lg font-outfit font-bold text-forest">{formatPortfolioValue(asset().currentValue, currency())}</p>
                  <p class="text-[10px] text-earth">{asset().totalShares.toFixed(4)} shares</p>
                </div>
                <div class="p-4 bg-sage/10 rounded-2xl">
                  <p class="text-[10px] uppercase tracking-widest text-earth mb-1">Total Gain/Loss</p>
                  <p class={`text-lg font-outfit font-bold ${asset().totalGainLoss >= 0 ? 'text-spring' : 'text-red-500'}`}>
                    {asset().totalGainLoss >= 0 ? '+' : ''}{formatPortfolioValue(asset().totalGainLoss, currency())}
                  </p>
                  <p class="text-[10px] text-earth">Avg. {formatPortfolioValue(asset().averagePrice, currency(), true)}</p>
                </div>
              </div>

              {/* Transactions History */}
              <div class="flex-1 overflow-y-auto p-6">
                <h4 class="font-outfit font-bold text-forest mb-4 text-sm uppercase tracking-widest">Transaction History</h4>
                <div class="space-y-3">
                  <For each={props.transactions} fallback={
                    <div class="text-center py-10 text-earth/30 italic font-outfit text-sm">No transactions found for this asset.</div>
                  }>
                    {(tx) => (
                      <div class="p-4 rounded-2xl border border-forest/5 hover:border-forest/20 transition-all group">
                        <div class="flex justify-between items-start">
                          <div>
                            <div class="flex items-center gap-2 mb-1">
                              <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${tx.type === 'BUY' ? 'bg-spring/10 text-spring' : 'bg-red-100 text-red-600'}`}>
                                {tx.type}
                              </span>
                              <span class="text-[10px] text-earth font-outfit">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p class="text-sm font-outfit font-medium text-forest">{tx.shares.toFixed(4)} @ {formatPortfolioValue(tx.pricePerShare, currency(), true)}</p>
                          </div>
                          <div class="text-right">
                            <p class="text-sm font-outfit font-bold text-forest">{formatPortfolioValue(tx.totalAmount, currency())}</p>
                            <Show when={tx.gainLoss !== undefined}>
                              <p class={`text-[10px] font-bold ${tx.gainLoss! >= 0 ? 'text-spring' : 'text-red-500'}`}>
                                {tx.gainLoss! >= 0 ? '+' : ''}{formatPortfolioValue(tx.gainLoss!, currency(), true)}
                              </p>
                            </Show>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  );
};
