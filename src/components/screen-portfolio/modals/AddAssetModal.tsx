import {
  createSignal,
  Show,
  createEffect,
  For,
  onMount,
  onCleanup,
} from "solid-js";
import { addTransactionToPortfolio } from "../../../store/portfolioStore";
import { getUsdRate } from "../../../utils/format";
import { searchTickers } from "../../../data/marketData";
import { debounce } from "../../../utils/debounce";
import { fetchMultiStockPrices } from "../../../data/portfolioData";
import type { TickerSearchResult } from "../../../types";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

export const AddAssetModal = (props: AddAssetModalProps) => {
  const [ticker, setTicker] = createSignal("");
  const [selectedTicker, setSelectedTicker] = createSignal<string | null>(null);
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
  const [isLoadingPrice, setIsLoadingPrice] = createSignal(false);

  // Debounced search signals
  const [searchResults, setSearchResults] = createSignal<TickerSearchResult[]>(
    [],
  );
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
      // Guard: If the current ticker now matches the selected ticker (user locked in a choice), discard the search response
      if (
        ticker().trim().toUpperCase() === selectedTicker()?.trim().toUpperCase()
      ) {
        setShowSuggestions(false);
        return;
      }
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
    // Only search if the query is not empty and it doesn't match the currently selected ticker
    if (query && query !== selectedTicker()) {
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

  // Initialize or update the exchange rate and reset form fields when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setPriceCurrency(getUsdRate());
      setTicker("");
      setSelectedTicker(null);
      setShares(null);
      setPrice(null);
      setNotes("");
    }
  });

  const fetchAndSetPrice = async (symbol: string) => {
    setIsLoadingPrice(true);
    try {
      const response = await fetchMultiStockPrices([symbol]);
      if (response && response.data && response.data.length > 0) {
        const item = response.data[0];
        if (item.success && item.current_price !== undefined) {
          setPrice(item.current_price);
        }
      }
    } catch (err) {
      console.error("Failed to fetch current price:", err);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const isValidTicker = () => {
    const currentTicker = ticker().trim().toUpperCase();
    return currentTicker !== "" && selectedTicker() === currentTicker;
  };

  const amount = () => {
    const qty = shares();
    const p = price();
    if (qty === null || p === null) return null;
    return qty * p;
  };

  const amountDisplay = () => {
    const amt = amount();
    if (amt === null) return "—";

    if (currency() === "IDR") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amt);
    } else {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(amt);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!isValidTicker()) {
      alert(
        "Please select a ticker symbol from the autocomplete dropdown list.",
      );
      return;
    }

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
        setSelectedTicker(null);
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
          class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            if (!target.closest(".ticker-container")) {
              setShowSuggestions(false);
            }
          }}
        >
          <div class="absolute top-0 left-0 w-full h-1 bg-spring"></div>
          <h3 class="text-2xl font-cormorant text-forest font-bold mb-6 flex-shrink-0">
            Add Transaction
          </h3>
          <form
            onSubmit={handleSubmit}
            class="flex flex-col flex-1 overflow-hidden"
          >
            {/* Scrollable Form Content */}
            <div class="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar-thin pb-2">
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
                    onInput={(e) => {
                      const value = e.currentTarget.value.toUpperCase();
                      setTicker(value);
                      setSelectedTicker(null);
                    }}
                    onFocus={() => {
                      if (
                        ticker().trim().toUpperCase() !==
                          selectedTicker()?.trim().toUpperCase() &&
                        searchResults().length > 0
                      ) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="e.g., NVDA, BTC-USD, BBCA.JK"
                    class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest"
                    required
                  />
                  <Show when={isLoadingResults()}>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                    </div>
                  </Show>

                  <Show when={showSuggestions()}>
                    <div class="absolute top-full left-0 right-0 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div class="max-h-48 overflow-y-auto custom-scrollbar-thin">
                        <For each={searchResults()}>
                          {(tickerItem) => (
                            <button
                              type="button"
                              onClick={() => {
                                setTicker(tickerItem.symbol);
                                setSelectedTicker(tickerItem.symbol);
                                setShowSuggestions(false);
                                if (
                                  tickerItem.symbol
                                    .toUpperCase()
                                    .endsWith(".JK")
                                ) {
                                  setCurrency("IDR");
                                  setPriceCurrency(1);
                                } else {
                                  setCurrency("USD");
                                  setPriceCurrency(getUsdRate());
                                }
                                fetchAndSetPrice(tickerItem.symbol);
                              }}
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

                <Show when={ticker().trim() !== "" && !isValidTicker()}>
                  <p class="text-[10px] text-red-500 font-outfit mt-1 animate-pulse flex items-center gap-1">
                    <span>⚠️</span> Please select a ticker from the autocomplete
                    suggestions.
                  </p>
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
                  <div class="relative flex items-stretch border border-forest/10 focus-within:border-forest/30 rounded-xl overflow-hidden bg-white">
                    <div class="relative flex items-center bg-spring/5 px-3 cursor-pointer shrink-0 border border-forest/10 rounded-l-xl">
                      <select
                        value={currency()}
                        onChange={(e) => {
                          const newCurr = e.currentTarget.value;
                          setCurrency(newCurr);
                          if (newCurr === "IDR") {
                            setPriceCurrency(1);
                          } else {
                            setPriceCurrency(getUsdRate());
                          }
                        }}
                        class="bg-transparent font-outfit text-xs font-bold text-forest/40 focus:outline-none cursor-pointer pr-4 appearance-none z-10"
                      >
                        <option value="USD" class="text-forest bg-white">
                          USD
                        </option>
                        <option value="IDR" class="text-forest bg-white">
                          IDR
                        </option>
                      </select>
                      <span class="material-icons absolute right-1.5 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-base z-0">
                        expand_more
                      </span>
                    </div>
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
                      placeholder={isLoadingPrice() ? "Fetching..." : "0.00"}
                      class="w-full px-3 py-3 border-0 focus:ring-0 focus:outline-none outline-none font-outfit text-forest disabled:bg-forest/5 bg-transparent"
                      required
                      disabled={isLoadingPrice()}
                    />
                    <Show when={isLoadingPrice()}>
                      <div class="absolute right-3 top-1/2 -translate-y-1/2">
                        <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                      </div>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Redesigned Total Amount Card */}
              <div>
                <label class="block text-[10px] uppercase tracking-widest text-earth font-bold mb-2">
                  Total Amount
                </label>
                <div class="relative w-full p-4 rounded-xl border border-forest/10 bg-spring/5 border-l-4 border-l-spring font-outfit text-forest transition-all flex flex-col gap-1.5 shadow-sm">
                  <div class="flex items-baseline justify-between">
                    <span class="text-[10px] text-earth/65 font-bold uppercase tracking-wider">
                      Total Value
                    </span>
                    <span class="text-xl font-bold font-outfit text-forest">
                      {amountDisplay()}
                    </span>
                  </div>
                  <Show when={amount() !== null}>
                    <div class="flex items-start justify-between pt-1.5 border-t border-forest/5 text-xs">
                      <span class="text-[10px] text-earth/55 uppercase tracking-wider font-bold">
                        Equivalent Value
                      </span>
                      <span class="font-semibold text-earth font-outfit">
                        {currency() === "USD" ? (
                          <>
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format((amount() ?? 0) * priceCurrency())}
                            <span class="text-[10px] text-earth/50 font-normal ml-1">
                              (@{" "}
                              {new Intl.NumberFormat("id-ID", {
                                minimumFractionDigits: 0,
                              }).format(priceCurrency())}
                              /USD)
                            </span>
                          </>
                        ) : (
                          <>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format((amount() ?? 0) / getUsdRate())}
                            <span class="text-[10px] text-earth/50 font-normal ml-1">
                              (@{" "}
                              {new Intl.NumberFormat("id-ID", {
                                minimumFractionDigits: 0,
                              }).format(getUsdRate())}
                              /USD)
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </Show>
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
                  class="w-full px-4 py-3 rounded-xl border border-forest/10 focus:border-forest/30 focus:ring-0 outline-none font-outfit text-forest resize-none h-14"
                />
              </div>
            </div>{" "}
            {/* End of Scrollable Form Content */}
            {/* Buttons - Sticky to Bottom */}
            <div class="flex gap-4 pt-4 border-t border-forest/5 bg-white mt-auto">
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
                disabled={isSubmitting() || !isValidTicker()}
                class={`flex-1 px-6 py-3 rounded-xl font-outfit font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSubmitting() || !isValidTicker()
                    ? "bg-forest/40 text-white/60 cursor-not-allowed shadow-none"
                    : "bg-forest text-white hover:bg-forest/90 hover:shadow-xl"
                }`}
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

      {/* Inline scrollbar styles for suggestions dropdown */}
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(26, 77, 46, 0.05);
          border-radius: 10px;
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
