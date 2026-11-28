import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { PortfolioAsset } from "../../../../../types";
import { getUsdRate } from "../../../../../utils/format";
import { AddAssetPricingFields } from "./AddAssetPricingFields";
import { AddAssetTickerField } from "./AddAssetTickerField";
import { useAddAssetForm } from "./useAddAssetForm";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  assets?: PortfolioAsset[];
  initialType?: "BUY" | "SELL";
  initialTicker?: string;
}

export const AddAssetModal = (props: AddAssetModalProps) => {
  const form = useAddAssetForm({
    isOpen: () => props.isOpen,
    onClose: () => props.onClose(),
    portfolioId: () => props.portfolioId,
    assets: () => props.assets,
    initialType: () => props.initialType,
    initialTicker: () => props.initialTicker,
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs transition-opacity duration-300 p-4 sm:p-6 animate-fade-in"
          onClick={props.onClose}
        >
          <div
            class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90dvh] flex flex-col"
            onClick={(e) => {
              e.stopPropagation();
              const target = e.target as HTMLElement;
              if (!target.closest(".ticker-container")) {
                form.setShowSuggestions(false);
              }
            }}
          >
            <div class="absolute top-0 left-0 w-full h-1 bg-spring" />
            <h3 class="text-2xl font-cormorant text-forest font-bold mb-6 flex-shrink-0">
              Add Transaction
            </h3>
            <form
              onSubmit={form.handleSubmit}
              class="flex flex-col flex-1 overflow-hidden"
            >
              {/* Scrollable Form Content */}
              <div class="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar-thin pb-2">
                {/* BUY/SELL Toggle */}
                <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${
                      form.type() === "BUY"
                        ? "bg-white text-forest shadow-sm"
                        : "text-earth hover:text-forest"
                    }`}
                    onClick={() => form.handleTypeChange("BUY")}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${
                      form.type() === "SELL"
                        ? "bg-white text-red-600 shadow-sm"
                        : "text-earth hover:text-red-500"
                    }`}
                    onClick={() => form.handleTypeChange("SELL")}
                  >
                    SELL
                  </button>
                </div>

                <AddAssetTickerField
                  type={form.type()}
                  ticker={form.ticker()}
                  selectedTicker={form.selectedTicker()}
                  isValidTicker={form.isValidTicker()}
                  isLoadingResults={form.isLoadingResults()}
                  showSuggestions={form.showSuggestions()}
                  searchResults={form.searchResults()}
                  assets={props.assets}
                  onTickerInput={(value) => {
                    form.setTicker(value);
                    form.setSelectedTicker(null);
                  }}
                  onFocus={() => {
                    if (
                      form.ticker().trim().toUpperCase() !==
                        form.selectedTicker()?.trim().toUpperCase() &&
                      form.searchResults().length > 0
                    ) {
                      form.setShowSuggestions(true);
                    }
                  }}
                  onSelectSuggestion={form.handleSelectSuggestion}
                  onSelectHeldAsset={form.handleSelectHeldAsset}
                />

                <AddAssetPricingFields
                  type={form.type()}
                  selectedHeldAsset={form.selectedHeldAsset()}
                  nativeCurrency={form.nativeCurrency()}
                  shares={form.shares()}
                  price={form.price()}
                  currency={form.currency()}
                  priceCurrency={form.priceCurrency()}
                  isLoadingPrice={form.isLoadingPrice()}
                  amount={form.amount()}
                  onSharesInput={form.setShares}
                  onPriceInput={form.setPrice}
                  onCurrencyChange={(newCurr) => {
                    form.setCurrency(newCurr);
                    form.setPriceCurrency(newCurr === "IDR" ? 1 : getUsdRate());
                  }}
                  onPriceCurrencyChange={form.setPriceCurrency}
                />

                {/* Date Picker */}
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={form.transactionDate()}
                    onInput={(e) => form.setTransactionDate(e.currentTarget.value)}
                    class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest cursor-pointer"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                    Notes
                  </label>
                  <textarea
                    value={form.notes()}
                    onInput={(e) => form.setNotes(e.currentTarget.value)}
                    placeholder="Optional notes..."
                    class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest resize-none h-16"
                  />
                </div>
              </div>

              {/* Buttons - Sticky to Bottom */}
              <div class="flex gap-4 pt-4 border-t border-forest/5 bg-white mt-auto">
                <button
                  type="button"
                  onClick={props.onClose}
                  disabled={form.isSubmitting()}
                  class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-spring/5 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={form.isSubmitting() || !form.isValidTicker()}
                  class={`flex-1 px-6 py-3 rounded-xl font-outfit font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    form.isSubmitting() || !form.isValidTicker()
                      ? "bg-forest/40 text-white/60 cursor-not-allowed shadow-none"
                      : "bg-forest text-white hover:bg-forest/90 hover:shadow-xl"
                  }`}
                >
                  <Show when={form.isSubmitting()} fallback="Submit">
                    <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Saving...
                  </Show>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(26, 77, 46, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 77, 46, 0.6);
          border-radius: 10px;
        }
      `}</style>
    </Show>
  );
};
