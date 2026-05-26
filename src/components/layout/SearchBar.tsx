import SearchIcon from "@suid/icons-material/SearchOutlined";
import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { searchTickers } from "../../data/marketData";
import { debounce } from "../../utils/debounce";
import type { TickerSearchResult } from "../../types";

const SearchBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [results, setResults] = createSignal<TickerSearchResult[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isOpen, setIsOpen] = createSignal(false);

  const isStockPage = () => location.pathname.startsWith("/stock");

  const performSearch = debounce(async (query: string) => {
    if (!query.trim() || !isStockPage()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const data = await searchTickers(query);
    setResults(data);
    setIsLoading(false);
    setIsOpen(data.length > 0);
  }, 300);

  createEffect(() => {
    const query = searchQuery();
    if (query) {
      performSearch(query);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  });

  const handleSearch = (e: KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery().trim()) {
      if (isStockPage()) {
        navigate(`/stock/${searchQuery().trim().toUpperCase()}`);
        setSearchQuery("");
        setIsOpen(false);
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (symbol: string) => {
    navigate(`/stock/${symbol.toUpperCase()}`);
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".search-container")) {
      setIsOpen(false);
    }
  };

  window.addEventListener("click", handleClickOutside);
  onCleanup(() => window.removeEventListener("click", handleClickOutside));

  return (
    <div class="relative w-80 search-container">
      <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-earth w-5 h-5" />
      <input 
        type="text" 
        value={searchQuery()}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        onKeyDown={handleSearch}
        onFocus={() => results().length > 0 && setIsOpen(true)}
        placeholder={isStockPage() ? "Search ticker..." : "Search transactions..."} 
        class="w-full h-11 bg-page-bg rounded-xl pl-11 pr-4 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
      />

      <Show when={isOpen() && isStockPage()}>
        <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div class="max-h-64 overflow-y-auto custom-scrollbar">
            <For each={results()}>
              {(ticker) => (
                <button
                  onClick={() => handleSelect(ticker.symbol)}
                  class="w-full flex items-center justify-between px-4 py-3 hover:bg-sage/60 transition-colors border-b border-forest/5 last:border-0 text-left cursor-pointer"
                >
                  <div class="flex flex-col">
                    <span class="font-outfit font-bold text-forest text-sm">{ticker.symbol}</span>
                    <span class="text-[10px] text-earth truncate max-w-[180px]">{ticker.name}</span>
                  </div>
                  <div class="flex flex-col items-end">
                    <span class="text-[9px] font-bold text-forest/40 uppercase tracking-tighter">{ticker.exchange}</span>
                    <span class="text-[8px] bg-forest/5 text-forest/60 px-1.5 py-0.5 rounded uppercase mt-0.5">{ticker.type}</span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={isLoading()}>
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
           <div class="w-4 h-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
        </div>
      </Show>
    </div>
  );
};

export default SearchBar;
