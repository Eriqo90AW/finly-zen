import { createSignal, createMemo, For, Show } from "solid-js";
import { getAllDividends, getDividendsForDate, getDividendsForMonth } from "../../data/dividendData";
import type { DividendEntry } from "../../types/dividend";

interface DividendListCardProps {
  selectedDate: string | null;
  onClearDate?: () => void;
  monthView?: { year: number; month: number } | null;
  onClearMonthView?: () => void;
}

type FilterTab = "all" | "paid" | "upcoming" | "projected";

const statusColors: Record<string, string> = {
  paid: "bg-fin-green",
  projected: "bg-gray-400",
  upcoming: "bg-blue-500",
};

const statusText: Record<string, string> = {
  paid: "Paid",
  projected: "Projected",
  upcoming: "Upcoming",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DividendListCard = (props: DividendListCardProps) => {
  const [activeTab, setActiveTab] = createSignal<FilterTab>("upcoming");

  const [ignoredKeys, setIgnoredKeys] = createSignal<Set<string>>(
    (() => {
      const saved = localStorage.getItem("ignored_dividends");
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    })()
  );
  const [showFilters, setShowFilters] = createSignal(false);
  const [tickerFilter, setTickerFilter] = createSignal("");
  const [minAmountFilter, setMinAmountFilter] = createSignal<number | null>(null);
  const [showAllProjected, setShowAllProjected] = createSignal(false);

  const getEntryKey = (d: DividendEntry) => `${d.ticker}|${d.cum_date}|${d.amount}|${d.payment_date}`;

  const ignoreEntry = (dividend: DividendEntry) => {
    const key = getEntryKey(dividend);
    const nextIgnored = new Set<string>(ignoredKeys());
    nextIgnored.add(key);
    setIgnoredKeys(nextIgnored);
    localStorage.setItem("ignored_dividends", JSON.stringify(Array.from(nextIgnored)));
  };

  const resetIgnored = () => {
    setIgnoredKeys(new Set<string>());
    localStorage.removeItem("ignored_dividends");
  };

  const filteredDividends = createMemo(() => {
    let list: DividendEntry[] = [];
    if (props.monthView) {
      list = getDividendsForMonth(props.monthView.year, props.monthView.month);
    } else if (props.selectedDate) {
      list = getDividendsForDate(props.selectedDate);
    } else {
      list = getAllDividends();
    }

    if (activeTab() !== "all") {
      list = list.filter((d) => d.status === activeTab());
    }

    const result = list.filter((d) => {
      if (activeTab() === "projected") {
        const localToday = new Date();
        const tzOffset = localToday.getTimezoneOffset() * 60000;
        const todayStr = new Date(localToday.getTime() - tzOffset).toISOString().split("T")[0];

        if (!showAllProjected() && d.cum_date <= todayStr) return false;

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

    if (activeTab() === "upcoming") {
      return [...result].reverse();
    }
    return result;
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
            <div class="p-3 rounded-xl bg-sage/20 border border-forest/5 hover:bg-sage/40 transition-colors relative group">
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider">
                    {dividend.ticker}
                  </span>
                  <span
                    class={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white ${statusColors[dividend.status]}`}
                  >
                    {statusText[dividend.status]}
                  </span>
                </div>
                <div class="flex items-center gap-2 group">
                  <span class="text-[10px] text-earth font-medium capitalize">
                    {dividend.frequency}
                  </span>
                  <Show when={activeTab() === "projected"}>
                    <button
                      onClick={() => ignoreEntry(dividend)}
                      class="hidden text-earth/30 hover:text-fin-red hover:bg-fin-red/10 rounded p-0.5 cursor-pointer transition-all group-hover:flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Ignore entry"
                    >
                      <span class="material-icons !text-[13px]">close</span>
                    </button>
                  </Show>
                </div>
              </div>

              <p class="text-xs font-outfit font-semibold text-forest mb-1 truncate" title={dividend.company_name}>
                {dividend.company_name}
              </p>

              <div class="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <div>
                  <span class="text-[9px] text-earth uppercase tracking-wider block leading-tight">Amount</span>
                  <p class="text-xs font-bold text-forest leading-none">
                    {dividend.currency} {dividend.amount.toLocaleString()}
                  </p>
                </div>
                <div class="w-px h-6 bg-forest/10" />
                <div>
                  <span class="text-[9px] text-earth uppercase tracking-wider block leading-tight">Cum-Date</span>
                  <p class="text-xs font-bold text-forest leading-none">
                    {new Date(dividend.cum_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div class="w-px h-6 bg-forest/10" />
                <div>
                  <span class="text-[9px] text-earth uppercase tracking-wider block leading-tight">Ex-Date</span>
                  <p class="text-xs font-bold text-forest leading-none">
                    {new Date(dividend.ex_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div class="w-px h-6 bg-forest/10" />
                <div>
                  <span class="text-[9px] text-earth uppercase tracking-wider block leading-tight">Payment</span>
                  <p class="text-xs font-bold text-forest leading-none">
                    {new Date(dividend.payment_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
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
