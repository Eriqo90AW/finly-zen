import { createSignal, Show, createEffect, For, onMount, onCleanup } from "solid-js";
import {
  addTransactionToPortfolio,
} from "../../../store/portfolioStore";
import { getUsdRate } from "../../../utils/format";
import { searchTickers } from "../../../data/marketData";
import { debounce } from "../../../utils/debounce";
import type { TickerSearchResult } from "../../../types";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const AddAssetModal = (props: AddAssetModalProps) => {
  const [ticker, setTicker] = createSignal("");
  const [shares, setShares] = createSignal<number | null>(null);
  const [price, setPrice] = createSignal<number | null>(null);
  const [currency, setCurrency] = createSignal<string>("USD");
  const [priceCurrency, setPriceCurrency] = createSignal<number>(getUsdRate());
  const [transactionDate, setTransactionDate] = createSignal(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = createSignal("");
  const [type, setType] = createSignal<"BUY" | "SELL">("BUY");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Debounced search signals
  const [searchResults, setSearchResults] = createSignal<TickerSearchResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = createSignal(false);
  const [showSuggestions, setShowSuggestions] = createSignal(false);

  const performTickerSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    try {
      const data = await searchTickers(query);
      setSearchResults(data);
      setShowSuggestions(data.length > 0);
    } catch (e) {
      console.error("Failed to search tickers:", e);
    } finally {
      setIsLoadingResults(false);
    }
  }, 300);

  createEffect(() => {
    const query = ticker();
    if (query) {
      performTickerSearch(query);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".ticker-container")) {
      setShowSuggestions(false);
    }
  };

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("click", handleClickOutside);
  });

  // Initialize or update the exchange rate when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setPriceCurrency(getUsdRate());
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const t = ticker().trim().toUpperCase();
    const qty = Number(shares());
    const p = Number(price());
    const rate = Number(priceCurrency());

    if (t && qty > 0 && p > 0 && rate > 0) {
      setIsSubmitting(true);
      try {
        await addTransactionToPortfolio(props.portfolioId, {
          ticker: t,
          qty,
          pricePerUnit: p,
          priceCurrency: rate,
          currency: currency(),
          type: type(),
          notes: notes(),
          transactionDate: new Date(transactionDate()).toISOString(),
        });

        // Reset form
        setTicker("");
        setShares(null);
        setPrice(null);
        setNotes("");
        props.onClose();
      } catch (error) {
        console.error("Failed to add transaction:", error);
        alert("Failed to save transaction. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 transition-opacity duration-300 p-6"
        onClick={props.onClose}
      >
        <div
          class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-6">
            Add Transaction
          </h3>
          <form onSubmit={handleSubmit} class="space-y-4">
            {/* BUY/SELL Toggle */}
            <div class="flex bg-forest/5 p-1 rounded-xl mb-4">
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === "BUY" ? "bg-white text-forest shadow-sm" : "text-earth hover:text-forest"}`}
                onClick={() => setType("BUY")}
              >
                BUY
              </button>
              <button
                type="button"
                class={`flex-1 py-2 rounded-lg font-outfit font-bold text-xs transition-all cursor-pointer ${type() === "SELL" ? "bg-white text-red-600 shadow-sm" : "text-earth hover:text-red-500"}`}
                onClick={() => setType("SELL")}
              >
                SELL
              </button>
            </div>

            {/* Ticker Input */}
            <div class="relative ticker-container">
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Ticker Symbol
              </label>
              <div class="relative">
                <input
                  type="text"
                  value={ticker()}
                  onInput={(e) => setTicker(e.currentTarget.value.toUpperCase())}
                  onFocus={() => searchResults().length > 0 && setShowSuggestions(true)}
                  placeholder="e.g., NVDA, BTC-USD"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
                <Show when={isLoadingResults()}>
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                  </div>
                </Show>
              </div>

              <Show when={showSuggestions()}>
                <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div class="max-h-48 overflow-y-auto custom-scrollbar">
                    <For each={searchResults()}>
                      {(tickerItem) => (
                        <button
                          type="button"
                          onClick={() => {
                            setTicker(tickerItem.symbol);
                            setShowSuggestions(false);
                            if (tickerItem.symbol.toUpperCase().endsWith(".JK")) {
                              setCurrency("IDR");
                              setPriceCurrency(1);
                            } else {
                              setCurrency("USD");
                              setPriceCurrency(getUsdRate());
                            }
                          }}
                          class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sage/10 transition-colors border-b border-forest/5 last:border-0 text-left cursor-pointer"
                        >
                          <div class="flex flex-col">
                            <span class="font-outfit font-bold text-forest text-xs">{tickerItem.symbol}</span>
                            <span class="text-[9px] text-earth truncate max-w-[180px]">{tickerItem.name}</span>
                          </div>
                          <div class="flex flex-col items-end">
                            <span class="text-[8px] font-bold text-forest/40 uppercase tracking-tighter">{tickerItem.exchange}</span>
                            <span class="text-[7px] bg-forest/5 text-forest/60 px-1 py-0.5 rounded uppercase mt-0.5">{tickerItem.type}</span>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Qty and Price Row */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={shares() ?? ""}
                  onInput={(e) =>
                    setShares(
                      e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : null,
                    )
                  }
                  placeholder="0.00"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Price per Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price() ?? ""}
                  onInput={(e) =>
                    setPrice(
                      e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : null,
                    )
                  }
                  placeholder="0.00"
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
            </div>

            {/* Currency and Exchange Rate Row */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Currency
                </label>
                <div class="relative group">
                  <select
                    value={currency()}
                    onChange={(e) => setCurrency(e.currentTarget.value)}
                    class="appearance-none w-full border border-forest/10 rounded-xl px-4 py-3 pr-10 font-outfit text-sm font-bold text-forest focus:outline-none focus:ring-1 focus:ring-forest/20 transition-all cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="IDR">IDR</option>
                  </select>
                  <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Exchange Rate (to IDR)
                </label>
                <input
                  type="number"
                  value={priceCurrency()}
                  onInput={(e) =>
                    setPriceCurrency(Number(e.currentTarget.value))
                  }
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                  required
                />
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                Transaction Date
              </label>
              <input
                type="date"
                value={transactionDate()}
                onInput={(e) => setTransactionDate(e.currentTarget.value)}
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
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                placeholder="Optional notes..."
                class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest resize-none h-20"
              />
            </div>

            {/* Buttons */}
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                onClick={props.onClose}
                disabled={isSubmitting()}
                class="flex-1 px-6 py-3 rounded-xl font-outfit font-bold text-earth hover:bg-spring/5 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting()}
                class="flex-1 bg-forest text-white px-6 py-3 rounded-xl font-outfit font-bold shadow-lg hover:bg-forest/90 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-80"
              >
                <Show when={isSubmitting()} fallback="Submit">
                  <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </Show>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
