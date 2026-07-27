import { createSignal, createMemo, For, Show } from "solid-js";

export interface MarketCapItem {
  rank: number;
  ticker: string;
  name: string;
  logoUrl?: string;
  category: "US" | "IDX" | "Crypto" | "Commodity";
  price: number;
  currency: string;
  dayChangePct: number;
  marketCap: number; // in USD
  peRatio?: number | null;
  psRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  roe?: number | null;
  netMargin?: number | null;
  dividendYield?: number | null;
}

type SortField =
  | "rank"
  | "name"
  | "price"
  | "dayChangePct"
  | "marketCap"
  | "peRatio"
  | "psRatio"
  | "pbRatio"
  | "evEbitda"
  | "roe"
  | "dividendYield";

interface MarketCapTableProps {
  items: MarketCapItem[];
  currencyView: "USD" | "IDR";
  usdRate: number;
  onSelectTicker: (ticker: string) => void;
}

export const MarketCapTable = (props: MarketCapTableProps) => {
  const [sortField, setSortField] = createSignal<SortField>("marketCap");
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = createSignal("");

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortOrder(sortOrder() === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "rank" || field === "name" ? "asc" : "desc");
    }
  };

  const filteredItems = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return props.items;
    return props.items.filter(
      (item) =>
        item.ticker.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  });

  const sortedItems = createMemo(() => {
    const list = [...filteredItems()];
    const field = sortField();
    const order = sortOrder();

    list.sort((a, b) => {
      let valA: any = a[field as keyof MarketCapItem] ?? -Infinity;
      let valB: any = b[field as keyof MarketCapItem] ?? -Infinity;

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  });

  const formatMarketCap = (val: number) => {
    if (!val || val <= 0) return "—";
    const rate = props.currencyView === "IDR" ? props.usdRate : 1;
    const converted = val * rate;
    const symbol = props.currencyView === "IDR" ? "Rp " : "$";

    if (converted >= 1e12) {
      return `${symbol}${(converted / 1e12).toFixed(2)}T`;
    }
    if (converted >= 1e9) {
      return `${symbol}${(converted / 1e9).toFixed(2)}B`;
    }
    if (converted >= 1e6) {
      return `${symbol}${(converted / 1e6).toFixed(2)}M`;
    }
    return `${symbol}${converted.toLocaleString()}`;
  };

  const formatPriceVal = (price: number, currency: string) => {
    let display = price;
    if (currency === "USD" && props.currencyView === "IDR") {
      display = price * props.usdRate;
    } else if (currency === "IDR" && props.currencyView === "USD") {
      display = price / props.usdRate;
    }

    if (props.currencyView === "IDR") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(display);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(display);
  };

  const formatMultiple = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${val.toFixed(1)}x`;
  };

  const formatPercentVal = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${(val * 100).toFixed(1)}%`;
  };

  return (
    <div class="bg-white rounded-2xl border border-forest/10 shadow-sm flex flex-col overflow-hidden">
      {/* Header bar */}
      <div class="p-4 border-b border-forest/5 flex justify-between items-center bg-white/80">
        <div class="relative w-72">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-earth !text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder="Search by ticker or name..."
            class="w-full bg-sage/30 border border-transparent rounded-full py-1.5 pl-9 pr-4 font-outfit text-xs text-near-black placeholder:text-earth/60 focus:bg-white focus:border-forest/30 transition-all focus:outline-none"
          />
        </div>

        <div class="text-xs text-earth font-outfit font-semibold">
          Showing <span class="text-forest font-bold">{sortedItems().length}</span> assets
        </div>
      </div>

      {/* Table */}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse whitespace-nowrap">
          <thead class="bg-sage/20 border-b border-forest/5 text-[11px] text-earth">
            <tr>
              <th class="px-4 py-3 font-semibold uppercase tracking-wider w-12 text-center">
                #
              </th>
              <th class="px-6 py-3 font-semibold uppercase tracking-wider">
                <button
                  onClick={() => handleSort("name")}
                  class="flex items-center gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent"
                >
                  Asset
                </button>
              </th>
              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("price")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  Price
                </button>
              </th>
              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("dayChangePct")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  24h %
                </button>
              </th>
              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("marketCap")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  Market Cap
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("peRatio")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  P/E (TTM)
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("psRatio")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  P/S
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("pbRatio")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  P/B
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("evEbitda")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  EV/EBITDA
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("roe")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  ROE %
                </button>
              </th>
              <th class="px-5 py-3 font-semibold uppercase tracking-wider text-right">
                <button
                  onClick={() => handleSort("dividendYield")}
                  class="flex items-center justify-end gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent w-full"
                >
                  Div Yield
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-forest/5 text-xs bg-white">
            <For each={sortedItems()}>
              {(item, index) => {
                const isPos = item.dayChangePct >= 0;
                return (
                  <tr
                    onClick={() => props.onSelectTicker(item.ticker)}
                    class="hover:bg-sage/20 transition-colors cursor-pointer group"
                  >
                    <td class="px-4 py-3.5 text-center font-mono text-earth/60 font-bold">
                      {index() + 1}
                    </td>
                    <td class="px-6 py-3.5">
                      <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-lg bg-sage flex items-center justify-center text-forest overflow-hidden shrink-0 font-bold text-[10px]">
                          <Show
                            when={item.logoUrl}
                            fallback={item.ticker.slice(0, 3)}
                          >
                            <img
                              src={item.logoUrl}
                              alt={item.ticker}
                              class="w-full h-full object-cover"
                            />
                          </Show>
                        </div>
                        <div>
                          <div class="font-bold text-near-black group-hover:text-forest transition-colors">
                            {item.name}
                          </div>
                          <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-[10px] text-earth uppercase font-semibold">
                              {item.ticker}
                            </span>
                            <span class="px-1.5 py-0.25 rounded bg-sage/50 text-forest text-[8px] font-bold uppercase">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-3.5 text-right font-mono font-semibold text-near-black">
                      {formatPriceVal(item.price, item.currency)}
                    </td>
                    <td class="px-6 py-3.5 text-right font-mono font-bold">
                      <span
                        class={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] ${
                          isPos
                            ? "bg-forest/10 text-forest"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {item.dayChangePct.toFixed(2)}%
                      </span>
                    </td>
                    <td class="px-6 py-3.5 text-right font-mono font-bold text-near-black">
                      {formatMarketCap(item.marketCap)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatMultiple(item.peRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatMultiple(item.psRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatMultiple(item.pbRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatMultiple(item.evEbitda)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatPercentVal(item.roe)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatPercentVal(item.dividendYield)}
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
};
