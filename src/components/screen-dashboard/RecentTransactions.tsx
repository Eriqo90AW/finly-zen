import { For, Show, createSignal, createMemo, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import {
  RecentTransactionsProps,
  SortKey,
  SortDirection,
  Transaction,
} from "../../types";
import { state, setSelectedAccount } from "../../store";
import {
  formatIconName,
  formatRupiah,
  formatDateDetail,
} from "../../utils/format";
import { deleteTransaction } from "../../data/expenseData";

export const RecentTransactions = (props: RecentTransactionsProps) => {
  const [selectedCategories, setSelectedCategories] = createSignal<Set<string>>(
    new Set(),
  );
  const [filtersOpen, setFiltersOpen] = createSignal(false);
  const [showOnlyRecurring, setShowOnlyRecurring] = createSignal(false);
  const [sortKey, setSortKey] = createSignal<SortKey>("date");
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc");
  const [accountDropdownOpen, setAccountDropdownOpen] = createSignal(false);
  const [transactionToDelete, setTransactionToDelete] =
    createSignal<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);

  const handleDeleteConfirm = async () => {
    const t = transactionToDelete();
    if (!t) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (props.onDeleteTransaction) {
        await props.onDeleteTransaction(t.id);
      } else {
        await deleteTransaction(t.id);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("finly:data-changed", {
              detail: { source: "delete_transaction", id: t.id },
            }),
          );
        }
      }
      setTransactionToDelete(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete transaction",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const path = e.composedPath ? e.composedPath() : [];
    const isInsideAccount = path.some(
      (el) =>
        el instanceof HTMLElement &&
        el.classList.contains("account-dropdown-container"),
    );
    const isInsideFilter = path.some(
      (el) =>
        el instanceof HTMLElement &&
        el.classList.contains("filter-dropdown-container"),
    );

    if (!isInsideAccount) {
      setAccountDropdownOpen(false);
    }
    if (!isInsideFilter) {
      setFiltersOpen(false);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("click", handleClickOutside);
    onCleanup(() => window.removeEventListener("click", handleClickOutside));
  }

  const availableAccounts = createMemo(() => {
    const accs = new Map<string, string | undefined>();
    const source = props.allTransactions || props.transactions;
    source.forEach((t) => {
      if (t.accountName && !accs.has(t.accountName)) {
        accs.set(t.accountName, t.accountColor);
      }
    });

    return [
      { name: "All Accounts", color: undefined },
      ...Array.from(accs.entries()).map(([name, color]) => ({ name, color })),
    ];
  });

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
      if (
        t.category &&
        t.category.toLowerCase() !== "debt" &&
        !map.has(t.category)
      ) {
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
    <div class="col-span-12 premium-card overflow-hidden cursor-default flex flex-col min-h-[420px] lg:h-[500px]">
      <div class="p-4 sm:p-6 border-b border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <h4 class="font-outfit font-bold text-forest">Recent Transactions</h4>
        <div class="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Multi-Select Category Filters Dropdown */}
          <div class="relative filter-dropdown-container">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none group/filter hover:shadow-sm"
              style={{
                ...(selectedCategories().size > 0
                  ? {
                      "background-color": "rgba(82, 194, 120, 0.15)",
                      "border-color": "rgba(82, 194, 120, 0.35)",
                    }
                  : {
                      "background-color": "rgba(44, 74, 56, 0.05)",
                      "border-color": "rgba(44, 74, 56, 0.1)",
                    }),
              }}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen()}
            >
              <span
                class="material-icons !text-[13px]"
                style={{
                  color:
                    selectedCategories().size > 0
                      ? "var(--color-forest)"
                      : "var(--color-mid-green)",
                }}
              >
                filter_list
              </span>
              <span
                class="text-[10px] font-bold uppercase tracking-widest"
                classList={{
                  "text-forest font-black": selectedCategories().size > 0,
                  "text-forest/70": selectedCategories().size === 0,
                }}
              >
                Filters
              </span>
              <Show when={selectedCategories().size > 0}>
                <span
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                  style={{
                    "background-color": "var(--color-forest)",
                    color: "#ffffff",
                  }}
                >
                  {selectedCategories().size}
                </span>
              </Show>
              <span
                class="material-icons !text-[14px] transition-transform duration-200 text-forest"
                classList={{
                  "rotate-180": filtersOpen(),
                }}
              >
                expand_more
              </span>
            </button>

            {/* Multi-Select Dropdown Menu */}
            <Show when={filtersOpen()}>
              <div
                class="absolute left-0 mt-1.5 w-60 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-2 z-30 flex flex-col gap-1 animate-slide-down"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="flex items-center justify-between px-2 py-1 border-b border-forest/10 mb-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-forest">
                    Categories ({uniqueCategories().length})
                  </span>
                  <Show
                    when={selectedCategories().size > 0}
                    fallback={
                      <span class="text-[9px] text-earth/50 italic">
                        All shown
                      </span>
                    }
                  >
                    <button
                      type="button"
                      class="text-[10px] font-bold text-earth/60 hover:text-red-500 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategories(new Set<string>());
                      }}
                    >
                      Clear
                    </button>
                  </Show>
                </div>

                <div class="max-h-60 overflow-y-auto custom-scrollbar-thin flex flex-col gap-0.5 pr-0.5">
                  <For each={uniqueCategories()}>
                    {(cat) => {
                      const isSelected = () => selectedCategories().has(cat.name);
                      return (
                        <button
                          type="button"
                          class="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer text-left group"
                          classList={{
                            "bg-forest/10 text-forest font-bold": isSelected(),
                            "text-forest/80 hover:bg-forest/5": !isSelected(),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.name);
                          }}
                        >
                          <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                            <div
                              class="w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0"
                              classList={{
                                "bg-forest border-forest text-white": isSelected(),
                                "border-forest/30 bg-white group-hover:border-forest/60":
                                  !isSelected(),
                              }}
                            >
                              <span
                                class="material-icons !text-[11px] font-bold transition-opacity"
                                classList={{
                                  "opacity-100": isSelected(),
                                  "opacity-0": !isSelected(),
                                }}
                              >
                                check
                              </span>
                            </div>
                            <div class="flex items-center gap-1.5 min-w-0">
                              <Show
                                when={formatIconName(cat.icon)}
                                fallback={
                                  <span
                                    class="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      "background-color":
                                        cat.color || "var(--color-mid-green)",
                                    }}
                                  />
                                }
                              >
                                <span
                                  class="material-icons !text-[13px] shrink-0"
                                  style={{
                                    color: cat.color || "var(--color-forest)",
                                  }}
                                >
                                  {formatIconName(cat.icon)}
                                </span>
                              </Show>
                              <span class="truncate">{cat.name}</span>
                            </div>
                          </div>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>
          </div>

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

          {/* Account Dropdown */}
          <div class="relative account-dropdown-container">
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-200 cursor-pointer select-none group/acc hover:shadow-sm"
              style={{
                ...(state.ui.selectedAccountColor
                  ? {
                      "background-color": `${state.ui.selectedAccountColor}20`,
                      "border-color": `${state.ui.selectedAccountColor}45`,
                    }
                  : state.ui.selectedAccount
                    ? {
                        "background-color": "rgba(82, 194, 120, 0.15)",
                        "border-color": "rgba(82, 194, 120, 0.35)",
                      }
                    : {
                        "background-color": "rgba(44, 74, 56, 0.05)",
                        "border-color": "rgba(44, 74, 56, 0.1)",
                      }),
              }}
              onClick={() => setAccountDropdownOpen((v) => !v)}
              aria-expanded={accountDropdownOpen()}
            >
              <span
                class="material-icons !text-[13px]"
                style={{
                  color:
                    state.ui.selectedAccountColor ||
                    (state.ui.selectedAccount
                      ? "var(--color-forest)"
                      : "var(--color-mid-green)"),
                }}
              >
                account_balance_wallet
              </span>
              <span
                class="text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color: state.ui.selectedAccountColor || undefined,
                }}
                classList={{
                  "text-earth":
                    !state.ui.selectedAccountColor && !state.ui.selectedAccount,
                  "text-forest":
                    !state.ui.selectedAccountColor && !!state.ui.selectedAccount,
                }}
              >
                Account:
              </span>
              <span
                class="text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color: state.ui.selectedAccountColor || undefined,
                }}
                classList={{
                  "text-forest font-black":
                    !state.ui.selectedAccountColor && !!state.ui.selectedAccount,
                  "text-forest/70":
                    !state.ui.selectedAccountColor && !state.ui.selectedAccount,
                }}
              >
                {state.ui.selectedAccount || "All Accounts"}
              </span>
              <span
                class="material-icons !text-[14px] transition-transform duration-200"
                classList={{
                  "rotate-180": accountDropdownOpen(),
                }}
                style={{
                  color:
                    state.ui.selectedAccountColor ||
                    "var(--color-forest)",
                }}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown Menu */}
            <Show when={accountDropdownOpen()}>
              <div class="absolute right-0 mt-1.5 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-1 z-30 flex flex-col gap-0.5 animate-slide-down">
                <For each={availableAccounts()}>
                  {(acc) => {
                    const isSelected = () =>
                      acc.name === "All Accounts"
                        ? !state.ui.selectedAccount
                        : state.ui.selectedAccount === acc.name;
                    return (
                      <button
                        type="button"
                        class="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer text-left"
                        classList={{
                          "bg-forest/10 text-forest font-bold": isSelected(),
                          "text-forest/80 hover:bg-forest/5": !isSelected(),
                        }}
                        onClick={() => {
                          setSelectedAccount(
                            acc.name === "All Accounts" ? null : acc.name,
                            acc.color ?? null,
                          );
                          setAccountDropdownOpen(false);
                        }}
                      >
                        <div class="flex items-center gap-2">
                          <span
                            class="w-2.5 h-2.5 rounded-full border border-forest/20 shrink-0"
                            style={{
                              "background-color":
                                acc.color || "var(--color-mid-green)",
                            }}
                          />
                          <span class="truncate">{acc.name}</span>
                        </div>
                        <Show when={isSelected()}>
                          <span class="material-icons !text-[14px] text-forest">
                            check
                          </span>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
      <Show when={!props.loading && sortedTransactions().length > 0}>
        <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          <table class="w-full min-w-[640px] text-left font-outfit relative">
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
                <th class="px-4 py-4 w-12 text-center text-[10px] font-semibold uppercase tracking-wider text-earth">
                  Action
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
                    <td class="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransactionToDelete(t);
                        }}
                        class="w-7 h-7 rounded-lg text-earth/40 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete transaction"
                        aria-label={`Delete ${t.name}`}
                      >
                        <span class="material-icons !text-[16px]">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Show when={props.loading}>
        <div class="p-12 text-center text-earth/50 animate-pulse flex-1 flex flex-col items-center justify-center">
          <span class="material-icons text-4xl mb-2">sync</span>
          <p class="text-sm">Fetching your garden data...</p>
        </div>
      </Show>

      <Show when={!props.loading && sortedTransactions().length === 0}>
        <div class="p-12 text-center text-earth/50 flex-1 flex flex-col items-center justify-center">
          <span class="material-icons text-4xl mb-2">eco</span>
          <p class="text-sm">
            No transactions this month. Start tending your garden!
          </p>
        </div>
      </Show>

      {/* Delete Confirmation Modal */}
      <Show when={transactionToDelete()}>
        {(t) => (
          <Portal>
            <div
              class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-xs transition-opacity duration-300 p-4 sm:p-6 animate-fade-in"
              onClick={() => !isDeleting() && setTransactionToDelete(null)}
            >
              <div
                class="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="flex flex-col items-center text-center">
                  {/* Warning Icon */}
                  <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5">
                    <span class="material-icons text-3xl">delete_outline</span>
                  </div>

                  <h3 class="text-2xl font-cormorant text-forest font-bold mb-2">
                    Delete Transaction
                  </h3>

                  {/* Transaction Preview Card */}
                  <div class="w-full p-3.5 bg-page-bg/80 border border-forest/5 rounded-2xl mb-4 text-left space-y-1">
                    <div class="flex items-center justify-between">
                      <p class="font-semibold text-xs text-forest truncate max-w-[180px]">{t().name}</p>
                      <span
                        class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          "background-color": t().categoryColor ? `${t().categoryColor}20` : "rgba(26, 77, 46, 0.1)",
                          color: t().categoryColor || "#1A4D2E",
                        }}
                      >
                        {t().category}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-earth/60 text-[10px]">{formatDateDetail(t().date)}</span>
                      <span class={`font-bold font-outfit ${t().type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t().type === "income" ? "+" : "-"}{formatRupiah(t().amount)}
                      </span>
                    </div>
                  </div>

                  <p class="text-xs text-earth/80 mb-6 leading-relaxed">
                    Are you sure you want to permanently delete this transaction? This action cannot be undone.
                  </p>

                  <div class="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      disabled={isDeleting()}
                      onClick={() => setTransactionToDelete(null)}
                      class="flex-1 py-3 px-4 rounded-xl border border-forest/10 text-xs font-bold font-outfit text-earth hover:bg-forest/5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting()}
                      onClick={handleDeleteConfirm}
                      class="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-outfit shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Show when={isDeleting()} fallback="Delete">
                        <span class="material-icons text-sm animate-spin">refresh</span>
                        <span>Deleting...</span>
                      </Show>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </div>
  );
};
