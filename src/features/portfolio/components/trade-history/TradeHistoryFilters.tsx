import { For, Show } from "solid-js";

interface TradeHistoryFiltersProps {
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (type: string) => void;
}

const FILTER_TYPES = ["ALL", "BUY", "SELL", "DIVIDEND"] as const;

export const TradeHistoryFilters = (props: TradeHistoryFiltersProps) => {
  const startRecord = () =>
    props.totalRecords > 0 ? (props.currentPage - 1) * props.pageSize + 1 : 0;
  const endRecord = () =>
    Math.min(props.currentPage * props.pageSize, props.totalRecords);

  return (
    <div class="px-4 sm:px-6 py-4 sm:py-5 border-b border-forest/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 bg-white">
      <div class="flex flex-col gap-0.5 w-full lg:w-auto">
        <h4 class="font-outfit font-bold text-forest text-base sm:text-lg">
          Transaction History
        </h4>
        <p class="text-earth/50 text-[11px] sm:text-xs font-outfit">
          Showing {startRecord()} - {endRecord()} of {props.totalRecords} records
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">
        {/* Search Input */}
        <div class="relative flex items-center bg-sage/10 border border-forest/10 rounded-xl px-3 py-1.5 focus-within:border-forest/30 transition-all duration-200 flex-1 sm:w-56">
          <span class="material-icons text-earth/40 text-sm mr-2 select-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search Ticker..."
            value={props.searchQuery}
            onInput={(e) => props.onSearchChange(e.currentTarget.value)}
            class="bg-transparent border-0 font-outfit text-xs text-forest placeholder-earth/40 outline-none w-full p-0"
          />
          <Show when={props.searchQuery}>
            <button
              type="button"
              onClick={() => props.onSearchChange("")}
              class="material-icons text-earth/40 hover:text-forest text-sm bg-transparent border-0 cursor-pointer p-0"
            >
              close
            </button>
          </Show>
        </div>

        {/* Type Selector Pills */}
        <div class="flex bg-sage/15 p-1 rounded-xl border border-forest/5 shadow-inner overflow-x-auto">
          <For each={FILTER_TYPES}>
            {(type) => {
              const isActive = () => props.typeFilter === type;
              return (
                <button
                  type="button"
                  onClick={() => props.onTypeFilterChange(type)}
                  class={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-outfit font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                    isActive()
                      ? "bg-forest text-white shadow-sm"
                      : "text-earth/65 hover:text-forest hover:bg-forest/5"
                  }`}
                >
                  {type}
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
