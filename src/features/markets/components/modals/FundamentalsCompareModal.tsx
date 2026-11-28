import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import CloseRoundedIcon from "@suid/icons-material/CloseRounded";
import { fetchStockData, searchTickers } from "../../../../data/marketData";
import type { StockData, TickerSearchResult } from "../../../../types";
import { debounce } from "../../../../utils/debounce";
import { CompareCompanyHeader } from "./CompareCompanyHeader";
import { CompareMetricCell } from "./CompareMetricCell";
import {
  COMPARE_CATEGORIES,
  getWinnerIndex,
  METRIC_DEFINITIONS,
} from "./fundamentalsCompareData";

export interface FundamentalsCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCompany: StockData;
}

const COMPARE_SLOTS = [0, 1, 2, 3];

export const FundamentalsCompareModal = (props: FundamentalsCompareModalProps) => {
  const [compareCompanies, setCompareCompanies] = createSignal<StockData[]>([props.baseCompany]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<TickerSearchResult[]>([]);
  const [searchActive, setSearchActive] = createSignal(false);
  const [isSearching, setIsSearching] = createSignal(false);
  const [isFetchingColumn, setIsFetchingColumn] = createSignal(false);

  // Sync / Reset on open
  createEffect(() => {
    if (props.isOpen) {
      setCompareCompanies([props.baseCompany]);
      setSearchQuery("");
      setSearchResults([]);
      setSearchActive(false);
    }
  });

  const performSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchTickers(query);
      setSearchResults(data);
    } catch (err) {
      console.error("Error searching tickers in compare modal:", err);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  createEffect(() => {
    const query = searchQuery();
    if (query) {
      performSearch(query);
    } else {
      setSearchResults([]);
    }
  });

  const handleSelectTicker = async (ticker: string) => {
    setIsFetchingColumn(true);
    setSearchActive(false);
    setSearchQuery("");
    setSearchResults([]);
    try {
      if (compareCompanies().some((c) => c.ticker.toUpperCase() === ticker.toUpperCase())) {
        return;
      }
      const data = await fetchStockData(ticker);
      setCompareCompanies((prev) => [...prev, data]);
    } catch (err) {
      console.error("Error adding ticker to comparison:", err);
    } finally {
      setIsFetchingColumn(false);
    }
  };

  const handleRemoveCompany = (idx: number) => {
    setCompareCompanies((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCancelSearch = () => {
    setSearchActive(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".search-slot-container")) {
      setSearchResults([]);
    }
  };

  window.addEventListener("click", handleClickOutside);
  onCleanup(() => window.removeEventListener("click", handleClickOutside));

  return (
    <Portal>
      <Show when={props.isOpen}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-sm transition-opacity duration-300 p-6"
          onClick={() => props.onClose()}
        >
          <div
            class="bg-white rounded-3xl py-8 px-10 w-[95vw] max-w-fit max-h-[85vh] shadow-2xl relative flex flex-col border border-forest/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="flex items-center justify-between mb-3 border-b border-forest/5 pb-2">
              <div>
                <h4 class="font-outfit font-bold text-forest text-xl flex items-center gap-2 leading-none">
                  <span class="material-icons text-forest text-xl">compare_arrows</span>
                  <span>Fundamentals Comparison</span>
                </h4>
                <p class="text-[11px] text-earth/60 mt-0.5">
                  Compare up to 4 companies side-by-side with real-time metrics and dynamic strength
                  analysis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => props.onClose()}
                class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
                title="Close"
              >
                <CloseRoundedIcon style={{ "font-size": "24px" }} />
              </button>
            </div>

            {/* Table Scrollable Container */}
            <div class="min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl border border-forest/10 bg-white custom-scrollbar">
              <table class="w-[740px] mx-auto border-collapse text-left table-fixed">
                <thead>
                  <tr class="border-b border-forest/20">
                    <th class="sticky top-0 left-0 z-30 bg-sage backdrop-blur-md py-2 px-3 w-[140px] border-r border-b border-forest/10">
                      <span class="text-[9px] font-black uppercase tracking-[0.12em] text-forest/70">
                        Metric Description
                      </span>
                    </th>

                    <For each={COMPARE_SLOTS}>
                      {(i) => (
                        <CompareCompanyHeader
                          index={i}
                          company={compareCompanies()[i]}
                          companiesCount={compareCompanies().length}
                          isFetchingColumn={isFetchingColumn()}
                          searchActive={searchActive()}
                          searchQuery={searchQuery()}
                          searchResults={searchResults()}
                          isSearching={isSearching()}
                          onActivateSearch={() => setSearchActive(true)}
                          onCancelSearch={handleCancelSearch}
                          onSearchQueryChange={setSearchQuery}
                          onSelectTicker={handleSelectTicker}
                          onRemoveCompany={handleRemoveCompany}
                        />
                      )}
                    </For>
                  </tr>
                </thead>

                <tbody class="divide-y divide-forest/5">
                  <For each={COMPARE_CATEGORIES}>
                    {(category) => (
                      <>
                        <tr class="bg-sage/60 font-bold text-forest">
                          <td
                            colspan="5"
                            class="sticky left-0 z-10 bg-sage/[0.08] backdrop-blur-sm py-1.5 px-3 border-b border-forest/10 text-left"
                          >
                            <div class="flex items-center gap-1 opacity-90">
                              <span class="material-icons text-xs text-forest">
                                {category.icon}
                              </span>
                              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-earth">
                                {category.title}
                              </span>
                            </div>
                          </td>
                        </tr>

                        <For each={METRIC_DEFINITIONS.filter((m) => m.category === category.title)}>
                          {(metricDef) => {
                            const winnerIdx = createMemo(() =>
                              getWinnerIndex(metricDef, compareCompanies()),
                            );

                            return (
                              <tr class="hover:bg-sage/5 transition-colors">
                                <td class="sticky left-0 z-10 bg-sage/30 py-1.5 px-3 font-outfit text-xs font-semibold text-earth border-r border-t border-forest/20">
                                  <div class="flex items-center gap-1">
                                    <div
                                      class="w-1.5 h-1.5 rounded-full"
                                      style={{ "background-color": metricDef.color }}
                                    />
                                    <span>{metricDef.label}</span>
                                  </div>
                                </td>

                                <For each={COMPARE_SLOTS}>
                                  {(i) => (
                                    <td class="py-1 px-1.5 border-r border-forest/10 last:border-r-0 text-center">
                                      <Show when={compareCompanies()[i]}>
                                        {(company) => (
                                          <CompareMetricCell
                                            company={company()}
                                            metricDef={metricDef}
                                            isWinner={winnerIdx() === i}
                                          />
                                        )}
                                      </Show>
                                    </td>
                                  )}
                                </For>
                              </tr>
                            );
                          }}
                        </For>
                      </>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};
