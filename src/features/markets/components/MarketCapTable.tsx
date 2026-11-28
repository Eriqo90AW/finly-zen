import { createMemo, createSignal, For } from "solid-js";
import { AssetLogo } from "../../../components/common/AssetLogo";
import {
  formatMarketCapPrice,
  formatMarketCapValue,
  formatRatioMultiple,
  formatRatioPercent,
  type MarketCapItem,
  SORT_COLUMNS,
  type SortField,
  sortMarketCapItems,
} from "./marketCapTableHelpers";

export type { MarketCapItem };

export interface MarketCapTableProps {
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
      (item) => item.ticker.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
    );
  });

  const sortedItems = createMemo(() =>
    sortMarketCapItems(filteredItems(), sortField(), sortOrder()),
  );

  return (
    <div class="bg-white rounded-2xl border border-forest/10 shadow-sm flex flex-col overflow-hidden">
      {/* Header bar */}
      <div class="p-3 sm:p-4 border-b border-forest/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white/80">
        <div class="relative w-full sm:w-72">
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
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full min-w-[760px] text-left border-collapse whitespace-nowrap">
          <thead class="bg-sage/20 border-b border-forest/5 text-[11px] text-earth">
            <tr>
              <th class="px-4 py-3 font-semibold uppercase tracking-wider w-12 text-center">#</th>
              <For each={SORT_COLUMNS}>
                {(col) => (
                  <th
                    class={`${col.paddingClass} py-3 font-semibold uppercase tracking-wider ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.field)}
                      class={`flex items-center gap-1 hover:text-forest cursor-pointer uppercase border-0 p-0 font-semibold bg-transparent ${
                        col.align === "right" ? "justify-end w-full" : ""
                      }`}
                    >
                      {col.label}
                    </button>
                  </th>
                )}
              </For>
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
                        <AssetLogo
                          ticker={item.ticker}
                          logoUrl={item.logoUrl}
                          name={item.name}
                          category={item.category}
                          size="sm"
                          class="w-7 h-7 rounded-lg bg-sage shadow-xs border border-forest/10"
                        />
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
                      {formatMarketCapPrice(
                        item.price,
                        item.currency,
                        props.currencyView,
                        props.usdRate,
                      )}
                    </td>
                    <td class="px-6 py-3.5 text-right font-mono font-bold">
                      <span
                        class={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] ${
                          isPos ? "bg-forest/10 text-forest" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {item.dayChangePct.toFixed(2)}%
                      </span>
                    </td>
                    <td class="px-6 py-3.5 text-right font-mono font-bold text-near-black">
                      {formatMarketCapValue(item.marketCap, props.currencyView, props.usdRate)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioMultiple(item.peRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioMultiple(item.psRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioMultiple(item.pbRatio)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioMultiple(item.evEbitda)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioPercent(item.roe)}
                    </td>
                    <td class="px-5 py-3.5 text-right font-mono text-earth">
                      {formatRatioPercent(item.dividendYield)}
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
