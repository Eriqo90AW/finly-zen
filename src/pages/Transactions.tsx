import { For, createMemo, createSignal, Show } from "solid-js";
import {
  transactions,
  openEditTransaction,
  isTransactionPending,
} from "../store/transactionStore";
import SearchIcon from "@suid/icons-material/SearchOutlined";
import FilterListIcon from "@suid/icons-material/FilterListOutlined";
import FileDownloadIcon from "@suid/icons-material/FileDownloadOutlined";
import EditIcon from "@suid/icons-material/EditOutlined";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatRupiah, formatIconName } from "../utils/format";
import { isTransferTransaction } from "../utils/transferUtils";

const Transactions = () => {
  const [filter, setFilter] = createSignal("");
  const [isChartVisible, setIsChartVisible] = createSignal(true);

  const filteredTransactions = createMemo(() => {
    const list = (transactions() || []).filter((t) => !isTransferTransaction(t));
    const query = filter().toLowerCase().trim();
    if (!query) return list;

    return list.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.note?.toLowerCase().includes(query) ||
        t.accountName?.toLowerCase().includes(query),
    );
  });

  const transactionsByDate = createMemo(() => {
    const groups: Record<string, typeof transactions extends () => (infer U)[] ? U[] : never> = {};
    filteredTransactions().forEach((t) => {
      const date = new Date(t.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });
    return Object.entries(groups);
  });

  const totalSpentPeriod = createMemo(() => {
    return filteredTransactions()
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const areaChartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    colors: ["#52C278"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    tooltip: { enabled: false },
  };

  return (
    <div class="space-y-6 animate-fade-in-up pb-20">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 class="text-2xl sm:text-3xl font-cormorant text-forest">Transaction Ledger</h2>
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsChartVisible(!isChartVisible())}
            class="px-3 sm:px-4 py-2 bg-white border border-forest/10 rounded-xl text-xs sm:text-sm font-outfit text-forest hover:bg-sage/20 transition-all cursor-pointer min-h-[36px]"
          >
            {isChartVisible() ? "Hide Analytics" : "Show Analytics"}
          </button>
          <button
            type="button"
            class="px-3 sm:px-4 py-2 bg-forest text-white rounded-xl text-xs sm:text-sm font-outfit font-semibold flex items-center gap-2 hover:bg-mid-green transition-all shadow-lg shadow-forest/10 cursor-pointer min-h-[36px]"
          >
            <FileDownloadIcon class="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Chart */}
      <div
        class={`premium-card p-6 bg-white transition-all duration-500 overflow-hidden ${
          isChartVisible()
            ? "h-[160px] opacity-100"
            : "h-0 opacity-0 p-0 border-none"
        }`}
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
            Spend Velocity
          </p>
          <p class="text-xs font-outfit font-bold text-forest">
            {formatRupiah(totalSpentPeriod())} in recorded expenses
          </p>
        </div>
        <div class="h-[100px]">
          <Show when={isChartVisible()}>
            <SolidApexCharts
              options={areaChartOptions}
              series={[{ name: "Spent", data: [31, 40, 28, 51, 42, 109, 100] }]}
              type="area"
              height="100%"
            />
          </Show>
        </div>
      </div>

      {/* Filter Bar */}
      <div class="flex items-center gap-4">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-4 top-1/2 -translate-y-1/2 text-earth w-5 h-5" />
          <input
            type="text"
            placeholder="Search transaction name, categories, accounts, or notes..."
            value={filter()}
            onInput={(e) => setFilter(e.currentTarget.value)}
            class="w-full h-12 bg-white border border-forest/10 rounded-xl pl-12 pr-4 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
          />
        </div>
        <button
          type="button"
          class="w-12 h-12 bg-white border border-forest/10 rounded-xl flex items-center justify-center text-forest hover:bg-sage/20 transition-all cursor-pointer"
        >
          <FilterListIcon />
        </button>
      </div>

      {/* Transaction List */}
      <div class="space-y-8">
        <For each={transactionsByDate()}>
          {([date, items]) => (
            <div class="space-y-4">
              <div class="sticky top-0 bg-page-bg/80 backdrop-blur-md py-2 z-10 flex items-center justify-between border-b border-forest/5">
                <h4 class="text-sm font-outfit font-bold text-forest">
                  {date}
                </h4>
                <p class="text-xs font-outfit text-earth font-medium">
                  Total:{" "}
                  <span class="text-forest">
                    {formatRupiah(items.reduce((sum, i) => sum + i.amount, 0))}
                  </span>
                </p>
              </div>
              <div class="space-y-2">
                <For each={items}>
                  {(t) => {
                    const isPending = () => isTransactionPending(t.id);
                    return (
                      <div
                        role="button"
                        tabIndex={isPending() ? -1 : 0}
                        onClick={() => !isPending() && openEditTransaction(t.id)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && !isPending()) {
                            e.preventDefault();
                            openEditTransaction(t.id);
                          }
                        }}
                        class="premium-card p-4 flex items-center justify-between group cursor-pointer hover:border-spring transition-all select-none"
                        classList={{
                          "opacity-75 bg-forest/[0.02]": isPending(),
                        }}
                      >
                        <div class="flex items-center gap-4 min-w-0 pr-4">
                          <div
                            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{
                              "background-color": t.categoryColor
                                ? `${t.categoryColor}20`
                                : "rgba(232, 245, 236, 0.5)",
                              color: t.categoryColor || "var(--color-forest)",
                            }}
                          >
                            <Show
                              when={formatIconName(t.categoryIcon)}
                              fallback={
                                <span class="material-icons !text-[20px]">
                                  receipt_long
                                </span>
                              }
                            >
                              <span class="material-icons !text-[20px]">
                                {formatIconName(t.categoryIcon)}
                              </span>
                            </Show>
                          </div>
                          <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                              <p class="font-outfit font-semibold text-forest leading-none truncate">
                                {t.name}
                              </p>
                              <Show when={t.isRecurring}>
                                <span
                                  class="material-icons text-[14px] text-spring"
                                  title="Recurring"
                                >
                                  autorenew
                                </span>
                              </Show>
                            </div>
                            <p class="text-xs text-earth mt-1 truncate">
                              {t.note || t.category}
                              <Show when={t.accountName}>
                                <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-forest/5 text-forest/70">
                                  {t.accountName}
                                </span>
                              </Show>
                            </p>
                          </div>
                        </div>

                        <div class="flex items-center gap-4 shrink-0">
                          <div class="text-right">
                            <p
                              class="font-outfit font-bold"
                              classList={{
                                "text-emerald-600": t.type === "income",
                                "text-rose-600": t.type === "expense",
                                "text-forest": !t.type,
                              }}
                            >
                              {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}
                              {formatRupiah(t.amount)}
                            </p>
                            <Show
                              when={isPending()}
                              fallback={
                                <p class="text-[10px] text-earth uppercase tracking-widest">
                                  Confirmed
                                </p>
                              }
                            >
                              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                                <span class="w-2 h-2 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                                Saving…
                              </span>
                            </Show>
                          </div>

                          {/* Pencil Action Button */}
                          <button
                            type="button"
                            disabled={isPending()}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTransaction(t.id);
                            }}
                            class="w-8 h-8 rounded-xl text-earth/50 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 min-h-[32px]"
                            title="Edit transaction"
                            aria-label={`Edit ${t.name}`}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </button>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>

        {(!transactions() || transactions().length === 0) && (
          <div class="p-20 text-center space-y-4">
            <div class="w-20 h-20 bg-sage/20 rounded-full flex items-center justify-center mx-auto">
              <span class="material-icons text-4xl text-forest/20">
                history
              </span>
            </div>
            <div class="space-y-1">
              <h3 class="text-xl font-cormorant text-forest">
                No transactions found
              </h3>
              <p class="text-sm text-earth">
                Start tracking your spending to see it here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
