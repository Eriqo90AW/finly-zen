import { For, Show, createSignal, createMemo } from "solid-js";
import {
  Transaction,
  RecentTransactionsProps,
  SortKey,
  SortDirection,
} from "../../types";
import {
  formatIconName,
  formatRupiah,
  formatDateDetail,
} from "../../utils/format";

export const RecentTransactions = (props: RecentTransactionsProps) => {
  const [selectedCategories, setSelectedCategories] = createSignal<Set<string>>(
    new Set(),
  );
  const [filtersOpen, setFiltersOpen] = createSignal(false);
  const [showOnlyRecurring, setShowOnlyRecurring] = createSignal(false);
  const [sortKey, setSortKey] = createSignal<SortKey>("date");
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "amount" || key === "date" ? "desc" : "asc");
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey() !== key) return "unfold_more";
    return sortDirection() === "asc" ? "arrow_upward" : "arrow_downward";
  };

  const uniqueCategories = createMemo(() => {
    const map = new Map<
      string,
      { name: string; icon?: string; color?: string }
    >();
    for (const t of props.transactions) {
      if (t.category && !map.has(t.category)) {
        map.set(t.category, {
          name: t.category,
          icon: t.categoryIcon,
          color: t.categoryColor,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const sortedTransactions = () => {
    let list = [...props.transactions];

    if (showOnlyRecurring()) {
      list = list.filter((t) => t.isRecurring);
    }

    const sel = selectedCategories();
    if (sel.size > 0) {
      list = list.filter((t) => sel.has(t.category));
    }

    const key = sortKey();
    const dir = sortDirection() === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "account":
          cmp = (a.accountName || "").localeCompare(b.accountName || "");
          break;
        case "date":
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "amount": {
          const amountA =
            a.type?.toLowerCase() === "income" ? a.amount : -a.amount;
          const amountB =
            b.type?.toLowerCase() === "income" ? b.amount : -b.amount;
          cmp = amountA - amountB;
          break;
        }
      }
      return cmp * dir;
    });

    return list;
  };

  const headerClass = (key: SortKey) =>
    `px-6 py-4 font-semibold cursor-pointer select-none transition-colors hover:text-forest group${key === "amount" ? " text-right" : ""}`;

  return (
    <div class="col-span-12 premium-card overflow-hidden cursor-default">
      <div class="p-6 border-b border-forest/10 flex items-center justify-between">
        <h4 class="font-outfit font-bold text-forest">Recent Transactions</h4>
        <div class="flex items-center gap-4">
          <div
            class="flex items-center gap-2 group cursor-pointer"
            onClick={() => setShowOnlyRecurring((v) => !v)}
          >
            <span
              class="text-[10px] font-bold uppercase tracking-widest transition-colors"
              classList={{
                "text-forest": showOnlyRecurring(),
                "text-mid-green group-hover:text-forest": !showOnlyRecurring(),
              }}
            >
              Recurring
            </span>
            <div class="ios-switch" aria-checked={showOnlyRecurring()}>
              <div
                class="ios-switch-thumb"
                data-state={showOnlyRecurring() ? "checked" : "unchecked"}
              />
            </div>
          </div>

          <button
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:cursor-pointer"
            classList={{
              "text-spring": filtersOpen() || selectedCategories().size > 0,
              "text-mid-green hover:text-spring":
                !filtersOpen() && selectedCategories().size === 0,
            }}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span class="material-icons !text-[14px]">filter_list</span>
            Filters
            <Show when={selectedCategories().size > 0}>
              <span
                class="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={{
                  "background-color": "var(--color-spring)",
                  color: "var(--color-forest)",
                }}
              >
                {selectedCategories().size}
              </span>
            </Show>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <Show when={filtersOpen()}>
        <div class="px-6 py-3 border-b border-forest/10 flex flex-wrap gap-2 animate-slide-down">
          <button
            class="px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all border"
            classList={{
              "bg-forest text-sage border-forest":
                selectedCategories().size === 0,
              "bg-transparent text-earth border-forest/15 hover:border-forest/30":
                selectedCategories().size > 0,
            }}
            onClick={() => setSelectedCategories(new Set())}
          >
            All
          </button>
          <For each={uniqueCategories()}>
            {(cat) => {
              const isActive = () => selectedCategories().has(cat.name);
              return (
                <button
                  class="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest transition-all border cursor-pointer"
                  classList={{
                    "border-transparent shadow-sm": isActive(),
                    "bg-transparent border-forest/15 hover:border-forest/30":
                      !isActive(),
                  }}
                  style={{
                    ...(isActive()
                      ? {
                          "background-color": cat.color
                            ? `${cat.color}25`
                            : "rgba(232, 245, 236, 0.5)",
                          color: cat.color || "var(--color-forest)",
                          "border-color": cat.color
                            ? `${cat.color}50`
                            : "var(--color-spring)",
                        }
                      : {
                          color: cat.color || "var(--color-earth)",
                        }),
                  }}
                  onClick={() => toggleCategory(cat.name)}
                >
                  <Show when={formatIconName(cat.icon)}>
                    <span class="material-icons !text-[12px]">
                      {formatIconName(cat.icon)}
                    </span>
                  </Show>
                  {cat.name}
                </button>
              );
            }}
          </For>
        </div>
      </Show>
      <div class="overflow-auto max-h-[500px]">
        <table class="w-full text-left font-outfit relative">
          <thead class="bg-sage/70 text-earth text-[10px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-sm shadow-sm">
            <tr>
              <th
                class={headerClass("name")}
                onClick={() => handleSort("name")}
              >
                <span class="inline-flex items-center gap-1">
                  Name
                  <span
                    class="material-icons !text-[12px] transition-all"
                    classList={{
                      "opacity-100 text-spring": sortKey() === "name",
                      "opacity-0 group-hover:opacity-50": sortKey() !== "name",
                    }}
                  >
                    {sortArrow("name")}
                  </span>
                </span>
              </th>
              <th
                class={headerClass("category")}
                onClick={() => handleSort("category")}
              >
                <span class="inline-flex items-center gap-1">
                  Category
                  <span
                    class="material-icons !text-[12px] transition-all"
                    classList={{
                      "opacity-100 text-spring": sortKey() === "category",
                      "opacity-0 group-hover:opacity-50":
                        sortKey() !== "category",
                    }}
                  >
                    {sortArrow("category")}
                  </span>
                </span>
              </th>
              <th
                class={headerClass("account")}
                onClick={() => handleSort("account")}
              >
                <span class="inline-flex items-center gap-1">
                  Account
                  <span
                    class="material-icons !text-[12px] transition-all"
                    classList={{
                      "opacity-100 text-spring": sortKey() === "account",
                      "opacity-0 group-hover:opacity-50":
                        sortKey() !== "account",
                    }}
                  >
                    {sortArrow("account")}
                  </span>
                </span>
              </th>
              <th
                class={headerClass("date")}
                onClick={() => handleSort("date")}
              >
                <span class="inline-flex items-center gap-1">
                  Date
                  <span
                    class="material-icons !text-[12px] transition-all"
                    classList={{
                      "opacity-100 text-spring": sortKey() === "date",
                      "opacity-0 group-hover:opacity-50": sortKey() !== "date",
                    }}
                  >
                    {sortArrow("date")}
                  </span>
                </span>
              </th>
              <th
                class={headerClass("amount")}
                onClick={() => handleSort("amount")}
              >
                <span class="inline-flex items-center gap-1 justify-end">
                  Amount
                  <span
                    class="material-icons !text-[12px] transition-all"
                    classList={{
                      "opacity-100 text-spring": sortKey() === "amount",
                      "opacity-0 group-hover:opacity-50":
                        sortKey() !== "amount",
                    }}
                  >
                    {sortArrow("amount")}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-forest/5">
            <For each={sortedTransactions()}>
              {(t) => (
                <tr class="group hover:bg-page-bg transition-all">
                  <td class="px-6 py-4 border-l-3 border-transparent group-hover:border-spring">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center gap-1.5">
                        <p class="font-semibold text-forest leading-none">
                          {t.name}
                        </p>
                        <Show when={t.isRecurring}>
                          <span
                            class="material-icons text-[14px] text-spring"
                            title="Recurring Transaction"
                          >
                            autorenew
                          </span>
                        </Show>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <span
                        class="pl-2 pr-3 py-1 text-[12px] rounded-md font-medium flex items-center gap-1.5 whitespace-nowrap"
                        style={{
                          "background-color": t.categoryColor
                            ? `${t.categoryColor}15`
                            : "rgba(232, 245, 236, 0.3)",
                          color: t.categoryColor || "var(--color-forest)",
                        }}
                      >
                        <Show when={formatIconName(t.categoryIcon)}>
                          <span class="material-icons !text-[16px] w-4 h-4 flex items-center justify-center">
                            {formatIconName(t.categoryIcon)}
                          </span>
                        </Show>
                        {t.category}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{
                        "background-color": t.accountColor
                          ? `${t.accountColor}15`
                          : "rgba(82, 194, 120, 0.1)",
                        color: t.accountColor || "var(--color-mid-green)",
                      }}
                    >
                      {t.accountName}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-earth">
                    {formatDateDetail(t.date)}
                  </td>
                  <td
                    class="px-6 py-4 text-right font-bold"
                    classList={{
                      "text-red-600": t.type?.toLowerCase() === "expense",
                      "text-green-600": t.type?.toLowerCase() === "income",
                      "text-forest": !["expense", "income"].includes(
                        t.type?.toLowerCase() || "",
                      ),
                    }}
                  >
                    {t.type?.toLowerCase() === "income"
                      ? "+"
                      : t.type?.toLowerCase() === "expense"
                        ? "-"
                        : ""}
                    {formatRupiah(t.amount)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={props.loading}>
        <div class="p-12 text-center text-earth/50 animate-pulse">
          <span class="material-icons text-4xl mb-2">sync</span>
          <p class="text-sm">Fetching your garden data...</p>
        </div>
      </Show>

      <Show when={!props.loading && sortedTransactions().length === 0}>
        <div class="p-12 text-center text-earth/50">
          <span class="material-icons text-4xl mb-2">eco</span>
          <p class="text-sm">
            No transactions this month. Start tending your garden!
          </p>
        </div>
      </Show>
    </div>
  );
};
