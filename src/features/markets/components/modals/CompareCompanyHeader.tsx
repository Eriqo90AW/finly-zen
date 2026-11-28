import { For, Show } from "solid-js";
import SearchIcon from "@suid/icons-material/SearchOutlined";
import type { StockData, TickerSearchResult } from "../../../../types";

export interface CompareCompanyHeaderProps {
  index: number;
  company: StockData | undefined;
  companiesCount: number;
  isFetchingColumn: boolean;
  searchActive: boolean;
  searchQuery: string;
  searchResults: TickerSearchResult[];
  isSearching: boolean;
  onActivateSearch: () => void;
  onCancelSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectTicker: (ticker: string) => void;
  onRemoveCompany: (index: number) => void;
}

export const CompareCompanyHeader = (props: CompareCompanyHeaderProps) => {
  return (
    <th class="sticky top-0 z-20 bg-sage backdrop-blur-md py-2 px-3 w-[150px] border-r border-b border-forest/10 last:border-r-0">
      <Show
        when={props.company}
        fallback={
          <Show
            when={props.index === props.companiesCount}
            fallback={
              <div class="h-12 flex flex-col items-center justify-center border border-dashed border-forest/10 rounded-xl bg-sage/[0.02] opacity-20">
                <span class="text-[8px] font-black text-earth uppercase tracking-[0.12em]">
                  Locked Slot
                </span>
              </div>
            }
          >
            {/* Add Company Active Slot */}
            <div class="relative min-h-12 flex flex-col justify-center">
              <Show
                when={props.isFetchingColumn}
                fallback={
                  <Show
                    when={props.searchActive}
                    fallback={
                      <button
                        type="button"
                        onClick={() => props.onActivateSearch()}
                        class="w-full h-9 flex items-center justify-center gap-1 border border-dashed border-forest/25 hover:border-forest/40 rounded-xl bg-sage/5 hover:bg-sage/10 text-forest font-bold text-[10px] tracking-wider transition-all cursor-pointer"
                      >
                        <span class="material-icons text-xs">add</span>
                        <span>ADD TICKER</span>
                      </button>
                    }
                  >
                    <div class="relative search-slot-container">
                      <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-earth !w-4 !h-4" />
                      <input
                        type="text"
                        value={props.searchQuery}
                        onInput={(e) => props.onSearchQueryChange(e.currentTarget.value)}
                        placeholder="Search Ticker..."
                        autofocus
                        class="w-full h-8 bg-page-bg rounded-lg pl-7 pr-6 font-outfit text-[9px] focus:outline-none focus:ring-1 focus:ring-forest/20 transition-all text-forest font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            props.onCancelSearch();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => props.onCancelSearch()}
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-earth/50 hover:text-forest flex items-center justify-center cursor-pointer"
                      >
                        <span class="material-icons !text-base">close</span>
                      </button>

                      {/* Search Dropdown */}
                      <Show when={props.searchResults.length > 0}>
                        <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50">
                          <div class="max-h-40 overflow-y-auto custom-scrollbar">
                            <For each={props.searchResults}>
                              {(ticker) => (
                                <button
                                  type="button"
                                  onClick={() => props.onSelectTicker(ticker.symbol)}
                                  class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-sage/40 transition-colors border-b border-forest/5 last:border-0 text-left cursor-pointer"
                                >
                                  <div class="flex flex-col">
                                    <span class="font-outfit font-bold text-forest text-xs">
                                      {ticker.symbol}
                                    </span>
                                    <span class="text-[9px] text-earth truncate max-w-[70px]">
                                      {ticker.name}
                                    </span>
                                  </div>
                                  <span class="text-[8px] bg-forest/5 text-forest/60 px-1 py-0.5 rounded uppercase font-black">
                                    {ticker.exchange}
                                  </span>
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>

                      <Show when={props.isSearching}>
                        <div class="absolute right-6 top-1/2 -translate-y-1/2">
                          <div class="w-3 h-3 border border-forest/20 border-t-forest rounded-full animate-spin" />
                        </div>
                      </Show>
                    </div>
                  </Show>
                }
              >
                <div class="flex flex-col items-center justify-center gap-1 h-9 bg-sage/5 border border-forest/5 rounded-xl">
                  <div class="w-3.5 h-3.5 border border-forest/20 border-t-forest rounded-full animate-spin" />
                  <span class="text-[8px] text-earth font-black uppercase tracking-wider">
                    Fetching...
                  </span>
                </div>
              </Show>
            </div>
          </Show>
        }
      >
        {(comp) => (
          <div class="flex flex-col gap-1 relative">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1">
                <span class="bg-forest text-white text-[9px] px-1.5 py-0.2 rounded-md font-black tracking-widest shadow-sm">
                  {comp().ticker}
                </span>
                <Show when={props.index === 0}>
                  <span class="text-[8px] bg-forest/5 text-forest/60 px-1 py-0.2 rounded-md font-black uppercase tracking-widest border border-forest/10">
                    Base
                  </span>
                </Show>
              </div>

              <Show when={props.index > 0}>
                <button
                  type="button"
                  onClick={() => props.onRemoveCompany(props.index)}
                  class="text-earth/50 hover:text-fin-red hover:bg-rose-50 border border-transparent hover:border-rose-500/10 transition-colors flex items-center justify-center cursor-pointer"
                  title="Remove Ticker"
                >
                  <span class="material-icons !text-[12px]">close</span>
                </button>
              </Show>
            </div>

            <h5 class="text-[11px] font-bold font-outfit text-forest truncate leading-none mt-0.5">
              {comp().company_name}
            </h5>

            <div class="flex gap-1">
              <span class="bg-white/80 backdrop-blur-sm text-forest/60 text-[8px] px-1 py-0.2 rounded font-bold border border-forest/10 uppercase tracking-widest leading-none">
                {comp().exchange}
              </span>
              <Show when={comp().sector}>
                <span class="bg-fin-blue/5 text-fin-blue text-[8px] px-1.5 py-0.2 rounded font-bold border border-fin-blue/10 uppercase tracking-wide truncate max-w-[75px] leading-none">
                  {comp().sector}
                </span>
              </Show>
            </div>
          </div>
        )}
      </Show>
    </th>
  );
};
