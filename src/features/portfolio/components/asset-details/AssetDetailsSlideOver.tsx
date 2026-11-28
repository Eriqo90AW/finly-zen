import { useNavigate } from "@solidjs/router";
import CloseIcon from "@suid/icons-material/Close";
import { createEffect, createSignal, Show } from "solid-js";
import { AssetLogo } from "../../../../components/common/AssetLogo";
import { portfolioState } from "../../../../store/portfolioStore";
import type { PortfolioAsset, PortfolioTransaction } from "../../../../types";
import { formatPortfolioValue } from "../../../../utils/format";
import { AssetExposureSection } from "./AssetExposureSection";
import { AssetThesisSection } from "./AssetThesisSection";
import { AssetTransactionsSection } from "./AssetTransactionsSection";

interface AssetDetailsSlideOverProps {
  asset: PortfolioAsset | null;
  transactions: PortfolioTransaction[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteAsset: (assetId: string) => void;
  portfolioTotalValue: number;
  portfolioId: string;
  portfolioNativeCurrency?: "IDR" | "USD";
  onTrade?: (type: "BUY" | "SELL", ticker: string) => void;
}

export const AssetDetailsSlideOver = (props: AssetDetailsSlideOverProps) => {
  const navigate = useNavigate();
  const currency = () => portfolioState.currencyView;

  const [exposureExpanded, setExposureExpanded] = createSignal(true);
  const [historyExpanded, setHistoryExpanded] = createSignal(true);

  createEffect(() => {
    if (props.isOpen && props.asset && props.portfolioId) {
      setExposureExpanded(true);
      setHistoryExpanded(true);
    }
  });

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex justify-end bg-forest/40 transition-opacity duration-300"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div
          class="w-full max-w-md bg-white h-screen shadow-2xl transition-transform duration-500 flex flex-col translate-x-0 slide-over-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <Show when={props.asset}>
            {(asset) => (
              <>
                {/* Header */}
                <div class="p-6 border-b border-forest/10 flex items-center justify-between bg-sage/5">
                  <div class="flex items-center gap-3">
                    <AssetLogo
                      ticker={asset().ticker}
                      logoUrl={asset().logoUrl}
                      name={asset().name}
                      size="lg"
                      class="w-10 h-10 rounded-xl shadow-xs border border-forest/10"
                      imageClass="object-contain p-1 bg-white"
                      fallbackType="letter"
                    />
                    <div>
                      <h3
                        onClick={() => {
                          navigate(`/stock/${asset().ticker}`);
                          props.onClose();
                        }}
                        class="text-xl font-cormorant text-forest font-bold leading-tight hover:underline cursor-pointer"
                      >
                        {asset().ticker}
                      </h3>
                      <p class="text-[10px] text-earth uppercase tracking-widest">
                        {asset().name}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => props.onDeleteAsset(asset().id)}
                      class="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full cursor-pointer"
                      title="Delete Asset"
                    >
                      <span class="material-icons">delete_outline</span>
                    </button>
                    <button
                      type="button"
                      onClick={props.onClose}
                      class="text-earth hover:text-forest transition-colors p-2 hover:bg-forest/5 rounded-full cursor-pointer"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div class="flex-1 overflow-y-auto">
                  {/* Actions */}
                  <div class="px-6 py-4 flex gap-3 border-b border-forest/5 bg-white">
                    <button
                      type="button"
                      onClick={() => props.onTrade?.("BUY", asset().ticker)}
                      class="flex-1 py-2 bg-spring/10 text-spring hover:bg-spring/20 rounded-xl font-bold font-outfit text-sm transition-colors cursor-pointer border border-spring/20 flex items-center justify-center gap-1.5"
                    >
                      <span class="material-icons text-sm">add</span> Buy More
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onTrade?.("SELL", asset().ticker)}
                      class="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold font-outfit text-sm transition-colors cursor-pointer border border-red-100 flex items-center justify-center gap-1.5"
                    >
                      <span class="material-icons text-sm">remove</span> Sell
                    </button>
                  </div>

                  {/* Asset Summary */}
                  <div class="p-6 grid grid-cols-2 gap-4 border-b border-forest/5 bg-sage/2">
                    <div class="p-4 bg-sage/10 rounded-2xl">
                      <p class="text-[10px] uppercase tracking-widest text-earth mb-1">
                        Total Holding
                      </p>
                      <p class="text-lg font-outfit font-bold text-forest">
                        {formatPortfolioValue(
                          asset().currentValue,
                          currency(),
                          false,
                          props.portfolioNativeCurrency,
                        )}
                      </p>
                      <p class="text-[10px] text-earth">
                        {asset().totalShares.toFixed(4)} shares
                      </p>
                    </div>
                    <div class="p-4 bg-sage/10 rounded-2xl">
                      <p class="text-[10px] uppercase tracking-widest text-earth mb-1">
                        Total Gain/Loss
                      </p>
                      <p
                        class={`text-lg font-outfit font-bold ${
                          asset().totalGainLoss >= 0
                            ? "text-spring"
                            : "text-red-500"
                        }`}
                      >
                        {asset().totalGainLoss >= 0 ? "+" : ""}
                        {formatPortfolioValue(
                          asset().totalGainLoss,
                          currency(),
                          false,
                          props.portfolioNativeCurrency,
                        )}
                      </p>
                      <p class="text-[10px] text-earth">
                        Avg.{" "}
                        {formatPortfolioValue(
                          asset().averagePrice,
                          currency(),
                          true,
                          props.portfolioNativeCurrency,
                        )}
                      </p>
                    </div>
                  </div>

                  <AssetExposureSection
                    asset={asset()}
                    portfolioTotalValue={props.portfolioTotalValue}
                    currency={currency()}
                    portfolioNativeCurrency={props.portfolioNativeCurrency}
                    expanded={exposureExpanded()}
                    onToggle={() => setExposureExpanded(!exposureExpanded())}
                  />

                  <AssetThesisSection
                    isOpen={props.isOpen}
                    portfolioId={props.portfolioId}
                    ticker={asset().ticker}
                  />

                  <AssetTransactionsSection
                    transactions={props.transactions}
                    currency={currency()}
                    portfolioNativeCurrency={props.portfolioNativeCurrency}
                    expanded={historyExpanded()}
                    onToggle={() => setHistoryExpanded(!historyExpanded())}
                  />
                </div>
              </>
            )}
          </Show>
        </div>
      </div>
      <style>{`
        @starting-style {
          .slide-over-backdrop {
            background-color: rgba(0, 0, 0, 0) !important;
          }
          .slide-over-panel {
            transform: translateX(100%) !important;
          }
        }
      `}</style>
    </Show>
  );
};
