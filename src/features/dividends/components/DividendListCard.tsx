import { createSignal, createMemo, For, Show, onCleanup } from "solid-js";
import {
  getAllDividends,
  getDividendsForDate,
  getDividendsForMonth,
  getTTMYieldByTicker,
  ignoredKeys,
  ignoreEntry,
  resetIgnored,
} from "../../../data/dividendData";
import { DividendItemCard } from "./DividendItemCard";
import { DividendSortDropdown } from "./DividendSortDropdown";
import {
  FILTER_TABS,
  MONTHS,
  filterAndSortDividends,
  type DividendDateViewType,
  type FilterTab,
  type SortOption,
} from "./dividendListHelpers";

interface DividendListCardProps {
  selectedDate: string | null;
  onClearDate?: () => void;
  monthView?: { year: number; month: number } | null;
  onClearMonthView?: () => void;
  dateViewType: DividendDateViewType;
  onDateViewTypeChange: (type: DividendDateViewType) => void;
}

const DividendListCard = (props: DividendListCardProps) => {
  const [activeTab, setActiveTab] = createSignal<FilterTab>("all");
  const [showFilters, setShowFilters] = createSignal(false);
  const [tickerFilter, setTickerFilter] = createSignal("");
  const [minAmountFilter, setMinAmountFilter] = createSignal<number | null>(null);
  const [showAllProjected, setShowAllProjected] = createSignal(false);
  const [sortBy, setSortBy] = createSignal<SortOption>("default");
  const [showSortDropdown, setShowSortDropdown] = createSignal(false);

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".sort-dropdown-container")) {
      setShowSortDropdown(false);
    }
  };

  window.addEventListener("click", handleClickOutside);
  onCleanup(() => window.removeEventListener("click", handleClickOutside));

  const ttmYields = createMemo(() => getTTMYieldByTicker());

  const filteredDividends = createMemo(() => {
    const source = props.monthView
      ? getDividendsForMonth(props.monthView.year, props.monthView.month, props.dateViewType)
      : props.selectedDate
        ? getDividendsForDate(props.selectedDate, props.dateViewType)
        : getAllDividends();

    return filterAndSortDividends(source, {
      activeTab: activeTab(),
      dateViewType: props.dateViewType,
      showAllProjected: showAllProjected(),
      ignoredKeys: ignoredKeys(),
      tickerFilter: tickerFilter(),
      minAmountFilter: minAmountFilter(),
      sortBy: sortBy(),
      ttmYields: ttmYields(),
    });
  });

  return (
    <div class="premium-card p-6 bg-white h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-outfit font-bold text-forest uppercase tracking-wider">
          {props.monthView
            ? `${MONTHS[props.monthView.month]} ${props.monthView.year} Overview`
            : props.selectedDate
              ? new Date(`${props.selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "All Dividends"}
        </h3>
        <div class="flex items-center gap-1.5">
          <DividendSortDropdown
            sortBy={sortBy()}
            isOpen={showSortDropdown()}
            onToggle={() => setShowSortDropdown(!showSortDropdown())}
            onSelect={(option) => {
              setSortBy(option);
              setShowSortDropdown(false);
            }}
          />

          <button
            onClick={() => setShowFilters(!showFilters())}
            class={`text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center justify-center ${showFilters() ? "bg-sage/40 text-forest" : ""}`}
            title="Toggle Filters"
          >
            <span class="material-icons !text-[16px]">filter_alt</span>
          </button>
          <Show when={activeTab() === "projected" && ignoredKeys().size > 0}>
            <button
              onClick={resetIgnored}
              class="text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center justify-center"
              title="Reset Ignored Entries"
            >
              <span class="material-icons !text-[16px]">restore</span>
            </button>
          </Show>
          <Show when={props.selectedDate || props.monthView}>
            <button
              onClick={() => {
                if (props.monthView && props.onClearMonthView) {
                  props.onClearMonthView();
                }
                if (props.selectedDate && props.onClearDate) {
                  props.onClearDate();
                }
              }}
              class="text-[10px] text-earth hover:text-forest font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-colors"
            >
              <span class="material-icons !text-[12px]">close</span>
              Clear Filter
            </button>
          </Show>
        </div>
      </div>

      <div class="flex gap-1 mb-4 p-1 bg-sage/20 rounded-xl">
        <For each={FILTER_TABS}>
          {(tab) => (
            <button
              onClick={() => setActiveTab(tab.key)}
              class={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer
                ${activeTab() === tab.key
                  ? "bg-forest text-white shadow-sm"
                  : "text-earth hover:text-forest hover:bg-sage/30"
                }
              `}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      <Show when={showFilters()}>
        <div class="grid grid-cols-2 gap-2 mb-3 p-2 bg-sage/20 rounded-lg border border-forest/5 animate-slide-down">
          <div>
            <label class="text-[9px] font-bold text-earth uppercase block mb-1">Ticker / Stock</label>
            <input
              type="text"
              placeholder="Search ticker..."
              value={tickerFilter()}
              onInput={(e) => setTickerFilter(e.currentTarget.value)}
              class="w-full text-[11px] px-2 py-1 rounded bg-white border border-forest/10 focus:outline-none focus:border-forest/30"
            />
          </div>
          <div>
            <label class="text-[9px] font-bold text-earth uppercase block mb-1">Min Amount</label>
            <input
              type="number"
              placeholder="Min amount..."
              value={minAmountFilter() ?? ""}
              onInput={(e) => {
                const val = e.currentTarget.value;
                setMinAmountFilter(val === "" ? null : Number(val));
              }}
              class="w-full text-[11px] px-2 py-1 rounded bg-white border border-forest/10 focus:outline-none focus:border-forest/30"
            />
          </div>
        </div>
      </Show>

      <div class="flex-1 overflow-y-auto space-y-2 min-h-0">
        <For
          each={filteredDividends()}
          fallback={
            <div class="flex flex-col items-center justify-center h-32 text-earth text-center">
              <span class="material-icons !text-3xl mb-2 text-earth/40">event_busy</span>
              <p class="text-xs font-semibold">No dividends found</p>
            </div>
          }
        >
          {(dividend) => (
            <DividendItemCard
              dividend={dividend}
              ttmYield={ttmYields().get(dividend.ticker) ?? null}
              showIgnore={activeTab() === "projected"}
              onIgnore={() => ignoreEntry(dividend)}
              dateViewType={props.dateViewType}
            />
          )}
        </For>
      </div>

      <div class="mt-4 pt-4 border-t border-forest/5 flex items-center justify-between text-[10px] text-earth">
        <Show when={activeTab() === "projected" && ignoredKeys().size > 0}>
          <span class="font-bold text-fin-red">{ignoredKeys().size} ignored</span>
        </Show>
        <div class="flex items-center gap-4 ml-auto">
          <Show when={activeTab() === "projected"}>
            <button
              onClick={() => setShowAllProjected(!showAllProjected())}
              class="text-[9.5px] font-bold text-forest hover:text-forest/80 cursor-pointer transition-colors uppercase tracking-wider"
            >
              {showAllProjected() ? "Show Future Only" : "Show All"}
            </button>
          </Show>
          <div class="flex items-center gap-2">
            <span class="font-medium">Total entries</span>
            <span class="font-bold text-forest">{filteredDividends().length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DividendListCard;
