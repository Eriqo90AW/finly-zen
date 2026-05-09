import { For, createMemo, createSignal, Show } from "solid-js";
import { state } from "../store";
import SearchIcon from "@suid/icons-material/SearchOutlined";
import FilterListIcon from "@suid/icons-material/FilterListOutlined";
import FileDownloadIcon from "@suid/icons-material/FileDownloadOutlined";
import { SolidApexCharts } from "solid-apexcharts";
import { ApexOptions } from "apexcharts";
import { formatRupiah } from "../utils/format";

const Transactions = () => {
  const [filter, setFilter] = createSignal("");
  const [isChartVisible, setIsChartVisible] = createSignal(true);

  const transactionsByDate = createMemo(() => {
    const groups: Record<string, typeof state.transactions> = {};
    (state.transactions || []).forEach((t) => {
      const date = new Date(t.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });
    return Object.entries(groups).reverse();
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
    <div class="space-y-6 animate-fade-in-up">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-cormorant text-forest">Transaction Ledger</h2>
        <div class="flex items-center gap-3">
          <button
            onClick={() => setIsChartVisible(!isChartVisible())}
            class="px-4 py-2 bg-white border border-forest/10 rounded-xl text-sm font-outfit text-forest hover:bg-sage/20 transition-all"
          >
            {isChartVisible() ? "Hide Analytics" : "Show Analytics"}
          </button>
          <button class="px-4 py-2 bg-forest text-white rounded-xl text-sm font-outfit font-semibold flex items-center gap-2 hover:bg-mid-green transition-all shadow-lg shadow-forest/10">
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
            {formatRupiah(1250000)} this period
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
            placeholder="Search transaction name, categories, or notes..."
            onInput={(e) => setFilter(e.currentTarget.value)}
            class="w-full h-12 bg-white border border-forest/10 rounded-xl pl-12 pr-4 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
          />
        </div>
        <button class="w-12 h-12 bg-white border border-forest/10 rounded-xl flex items-center justify-center text-forest hover:bg-sage/20 transition-all">
          <FilterListIcon />
        </button>
      </div>

      {/* Transaction List */}
      <div class="space-y-8 pb-20">
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
                  {(t) => (
                    <div class="premium-card p-4 flex items-center justify-between group cursor-pointer hover:border-spring">
                      <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-sage/30 flex items-center justify-center text-xl">
                          {t.category === "Food"
                            ? "🍱"
                            : t.category === "Transport"
                              ? "🚗"
                              : "🛍️"}
                        </div>
                        <div>
                          <p class="font-outfit font-semibold text-forest leading-none">
                            {t.name}
                          </p>
                          <p class="text-xs text-earth mt-1">
                            {t.note || t.category}
                          </p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="font-outfit font-bold text-forest">
                          {formatRupiah(t.amount)}
                        </p>
                        <p class="text-[10px] text-earth uppercase tracking-widest">
                          Confirmed
                        </p>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>

        {(!state.transactions || state.transactions.length === 0) && (
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
