import { createSignal, createMemo, For, Show, onCleanup } from "solid-js";
import { getAllDividends, getDividendsForDate, getDividendsForMonth, getTTMYieldByTicker, ignoredKeys, ignoreEntry, resetIgnored } from "../../data/dividendData";
import type { DividendEntry } from "../../types/dividend";
import { DividendItemCard } from "./DividendItemCard";

interface DividendListCardProps {
  selectedDate: string | null;
  onClearDate?: () => void;
  monthView?: { year: number; month: number } | null;
  onClearMonthView?: () => void;
  dateViewType: "payment_date" | "ex_date" | "cum_date";
  onDateViewTypeChange: (type: "payment_date" | "ex_date" | "cum_date") => void;
}

type FilterTab = "all" | "paid" | "upcoming" | "projected";
type SortOption = "default" | "yield" | "ttm_yield";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DividendListCard = (props: DividendListCardProps) => {
  const [activeTab, setActiveTab] = createSignal<FilterTab>("all");

  const [showFilters, setShowFilters] = createSignal(false);
  const [tickerFilter, setTickerFilter] = createSignal("");
  const [minAmountFilter, setMinAmountFilter] = createSignal<number | null>(null);
  const [showAllProjected, setShowAllProjected] = createSignal(false);
  const [sortBy, setSortBy] = createSignal<SortOption>("default");
  const [showSortDropdown, setShowSortDropdown] = createSignal(false);
  const [showDateDropdown, setShowDateDropdown] = createSignal(false);

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".sort-dropdown-container")) {
      setShowSortDropdown(false);
    }
    if (!target.closest(".date-dropdown-container")) {
      setShowDateDropdown(false);
    }
  };

  window.addEventListener("click", handleClickOutside);
  onCleanup(() => window.removeEventListener("click", handleClickOutside));

  const ttmYields = createMemo(() => getTTMYieldByTicker());

  const getEntryKey = (d: DividendEntry) => `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;


  const filteredDividends = createMemo(() => {
    let list: DividendEntry[] = [];
    if (props.monthView) {
      list = getDividendsForMonth(props.monthView.year, props.monthView.month, props.dateViewType);
    } else if (props.selectedDate) {
      list = getDividendsForDate(props.selectedDate, props.dateViewType);
    } else {
      list = getAllDividends();
    }

    if (activeTab() !== "all") {
      list = list.filter((d) => d.status === activeTab());
    }

    const result = list.filter((d) => {
      if (activeTab() === "projected") {
        if (!showAllProjected()) {
          const today = new Date();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const todayMD = `${mm}-${dd}`;
          const dateVal = d[props.dateViewType] || "";
          const valMD = dateVal.slice(5);
          if (valMD && valMD <= todayMD) return false;
        }
        const key = getEntryKey(d);
        if (ignoredKeys().has(key)) return false;
      }

      if (tickerFilter()) {
        const query = tickerFilter().toLowerCase().trim();
        if (!d.ticker.toLowerCase().includes(query)) return false;
      }

      if (minAmountFilter() !== null) {
        if (d.amount < (minAmountFilter() ?? 0)) return false;
      }

      return true;
    });

    if (sortBy() === "yield") {
      return [...result].sort((a, b) => {
        const yieldA = a.last_price != null && a.last_price > 0 ? a.amount / a.last_price : -1;
        const yieldB = b.last_price != null && b.last_price > 0 ? b.amount / b.last_price : -1;
        return yieldB - yieldA;
      });
    }
    if (sortBy() === "ttm_yield") {
      const ttmMap = ttmYields();
      return [...result].sort((a, b) => {
        const ttmA = ttmMap.get(a.ticker) ?? -1;
        const ttmB = ttmMap.get(b.ticker) ?? -1;
        return ttmB - ttmA;
      });
    }

    if (activeTab() === "upcoming") {
      return [...result].sort((a, b) => {
        const dateA = a[props.dateViewType] || "";
        const dateB = b[props.dateViewType] || "";
        return dateA.localeCompare(dateB);
      });
    }
    if (activeTab() === "projected") {
      return [...result].sort((a, b) => {
        const dateA = a[props.dateViewType] || "";
        const dateB = b[props.dateViewType] || "";
        return dateA.slice(5).localeCompare(dateB.slice(5));
      });
    }
    return [...result].sort((a, b) => {
      const dateA = a[props.dateViewType] || "";
      const dateB = b[props.dateViewType] || "";
      return dateB.localeCompare(dateA);
    });
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "upcoming", label: "Upcoming" },
    { key: "projected", label: "Projected" },
  ];

  return (
    <div class="premium-card p-6 bg-white h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-outfit font-bold text-forest uppercase tracking-wider">
          {props.monthView
            ? `${MONTHS[props.monthView.month]} ${props.monthView.year} Overview`
            : props.selectedDate
            ? new Date(props.selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "All Dividends"}
        </h3>
        <div class="flex items-center gap-1.5">
          <div class="relative sort-dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSortDropdown(!showSortDropdown());
              }}
              class={`text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center gap-1 px-1.5 py-1 ${sortBy() !== "default" ? "bg-sage/40 text-forest" : ""}`}
              title="Sort options"
            >
              <span class="material-icons !text-[16px]">sort</span>
              <span class="text-[9px] font-bold uppercase tracking-wider">
                {sortBy() === "default" ? "Newest" : sortBy() === "yield" ? "Yield" : "TTM"}
              </span>
              <span class="material-icons !text-[10px] transition-transform duration-200" classList={{ 'rotate-180': showSortDropdown() }}>
                keyboard_arrow_down
              </span>
            </button>
            
            <Show when={showSortDropdown()}>
              <div class="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-premium border border-forest/10 p-1 z-50 animate-slide-down">
                <button
                  onClick={() => {
                    setSortBy("default");
                    setShowSortDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${sortBy() === "default" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <span>Newest Date</span>
                  <Show when={sortBy() === "default"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
                <button
                  onClick={() => {
                    setSortBy("yield");
                    setShowSortDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${sortBy() === "yield" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <span>Yield</span>
                  <Show when={sortBy() === "yield"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
                <button
                  onClick={() => {
                    setSortBy("ttm_yield");
                    setShowSortDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${sortBy() === "ttm_yield" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <span>TTM Yield</span>
                  <Show when={sortBy() === "ttm_yield"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
              </div>
            </Show>
          </div>
          
          {/* Date View Dropdown */}
          <div class="relative date-dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDateDropdown(!showDateDropdown());
              }}
              class={`text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center gap-1 px-1.5 py-1 ${props.dateViewType !== "payment_date" ? "bg-sage/40 text-forest" : ""}`}
              title="Choose date view type"
            >
              <span class="material-icons !text-[16px]">
                {props.dateViewType === "cum_date" ? "login" : props.dateViewType === "ex_date" ? "logout" : "payments"}
              </span>
              <span class="text-[9px] font-bold uppercase tracking-wider">
                {props.dateViewType === "cum_date" ? "Income" : props.dateViewType === "ex_date" ? "Exit" : "Payment"}
              </span>
              <span class="material-icons !text-[10px] transition-transform duration-200" classList={{ 'rotate-180': showDateDropdown() }}>
                keyboard_arrow_down
              </span>
            </button>
            
            <Show when={showDateDropdown()}>
              <div class="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-premium border border-forest/10 p-1 z-50 animate-slide-down">
                <button
                  onClick={() => {
                    props.onDateViewTypeChange("payment_date");
                    setShowDateDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${props.dateViewType === "payment_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <div class="flex items-center gap-1.5">
                    <span class="material-icons !text-[14px]">payments</span>
                    <span>Payment Day</span>
                  </div>
                  <Show when={props.dateViewType === "payment_date"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
                <button
                  onClick={() => {
                    props.onDateViewTypeChange("ex_date");
                    setShowDateDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${props.dateViewType === "ex_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <div class="flex items-center gap-1.5">
                    <span class="material-icons !text-[14px]">logout</span>
                    <span>Exit Day</span>
                  </div>
                  <Show when={props.dateViewType === "ex_date"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
                <button
                  onClick={() => {
                    props.onDateViewTypeChange("cum_date");
                    setShowDateDropdown(false);
                  }}
                  class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                    ${props.dateViewType === "cum_date" ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                  `}
                >
                  <div class="flex items-center gap-1.5">
                    <span class="material-icons !text-[14px]">login</span>
                    <span>Income Day</span>
                  </div>
                  <Show when={props.dateViewType === "cum_date"}>
                    <span class="material-icons !text-[12px]">check</span>
                  </Show>
                </button>
              </div>
            </Show>
          </div>

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
        <For each={tabs}>
          {(tab) => (
            <button
              onClick={() => {
                setActiveTab(tab.key);
              }}
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
