import { For, Show } from "solid-js";
import type { PortfolioAsset, TickerSearchResult } from "../../../../../types";

interface AddAssetTickerFieldProps {
  type: "BUY" | "SELL";
  ticker: string;
  selectedTicker: string | null;
  isValidTicker: boolean;
  isLoadingResults: boolean;
  showSuggestions: boolean;
  searchResults: TickerSearchResult[];
  assets?: PortfolioAsset[];
  onTickerInput: (value: string) => void;
  onFocus: () => void;
  onSelectSuggestion: (symbol: string) => void;
  onSelectHeldAsset: (symbol: string) => void;
}

export const AddAssetTickerField = (props: AddAssetTickerFieldProps) => {
  return (
    <div class="relative ticker-container">
      <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
        Ticker Symbol
      </label>
      <Show
        when={props.type === "SELL"}
        fallback={
          <div class="relative">
            <input
              type="text"
              value={props.ticker}
              onInput={(e) => props.onTickerInput(e.currentTarget.value.toUpperCase())}
              onFocus={props.onFocus}
              placeholder="e.g., NVDA, BTC-USD, BBCA.JK"
              class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
              required
            />
            <Show when={props.isLoadingResults}>
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
              </div>
            </Show>

            <Show when={props.showSuggestions}>
              <div class="absolute top-full left-0 right-0 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="max-h-48 overflow-y-auto custom-scrollbar-thin">
                  <For each={props.searchResults}>
                    {(tickerItem) => (
                      <button
                        type="button"
                        onClick={() => props.onSelectSuggestion(tickerItem.symbol)}
                        class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sage/10 transition-colors border-b border-forest/5 last:border-0 text-left cursor-pointer"
                      >
                        <div class="flex flex-col">
                          <span class="font-outfit font-bold text-forest text-xs">
                            {tickerItem.symbol}
                          </span>
                          <span class="text-[9px] text-earth truncate max-w-[180px]">
                            {tickerItem.name}
                          </span>
                        </div>
                        <div class="flex flex-col items-end">
                          <span class="text-[8px] font-bold text-forest/40 uppercase tracking-tighter">
                            {tickerItem.exchange}
                          </span>
                          <span class="text-[7px] bg-forest/5 text-forest/60 px-1 py-0.5 rounded uppercase mt-0.5">
                            {tickerItem.type}
                          </span>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        }
      >
        {/* Dropdown for SELL mode */}
        <div class="relative">
          <select
            value={props.selectedTicker || ""}
            onChange={(e) => props.onSelectHeldAsset(e.currentTarget.value)}
            class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest bg-white appearance-none cursor-pointer pr-10"
            required
          >
            <option value="" disabled selected class="text-earth">
              Select an asset...
            </option>
            <For each={props.assets || []}>
              {(assetItem) => (
                <option value={assetItem.ticker} class="text-forest">
                  {assetItem.ticker} — {assetItem.name}
                </option>
              )}
            </For>
          </select>
          <span class="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-xl">
            expand_more
          </span>
        </div>
      </Show>

      <Show
        when={
          props.type === "BUY" &&
          props.ticker.trim() !== "" &&
          !props.isValidTicker
        }
      >
        <p class="text-[10px] text-red-500 font-outfit mt-1 animate-pulse flex items-center gap-1">
          <span>⚠️</span> Please select a ticker from the autocomplete
          suggestions.
        </p>
      </Show>
    </div>
  );
};
