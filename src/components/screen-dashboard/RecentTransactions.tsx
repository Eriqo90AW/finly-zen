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
  openEditTransaction,
  isTransactionPending,
} from "../../store/transactionStore";
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
  const [typeFilter, setTypeFilter] = createSignal<"all" | "expense" | "income">("all");
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

    if (typeFilter() !== "all") {
      list = list.filter(
        (t) => (t.type?.toLowerCase() || "expense") === typeFilter(),
      );
    }

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
    `px-3 sm:px-6 py-3 sm:py-4 font-semibold cursor-pointer select-none transition-colors hover:text-forest group${key === "amount" ? " text-right" : ""}`;

  return (
    <div class="col-span-12 premium-card cursor-default flex flex-col min-h-0 sm:min-h-[420px] lg:h-[500px]">
      <div class="p-3.5 sm:p-6 border-b border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
        <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto min-w-0">
          <h4 class="font-outfit font-bold text-forest text-sm sm:text-base whitespace-nowrap">Recent Transactions</h4>

          {/* Expense - Income Pill Shape Selector */}
          <div
            role="radiogroup"
            aria-label="Transaction Type Filter"
            class="flex items-center p-0.5 bg-page-bg rounded-full border border-forest/10 shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter() === "all"}
              onClick={() => setTypeFilter("all")}
              class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
              classList={{
                "bg-forest text-white shadow-sm font-black":
                  typeFilter() === "all",
                "text-earth hover:text-forest": typeFilter() !== "all",
              }}
            >
              All
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter() === "expense"}
              onClick={() =>
                setTypeFilter((prev) => (prev === "expense" ? "all" : "expense"))
              }
              class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
              classList={{
                "bg-rose-600 text-white shadow-sm font-black":
                  typeFilter() === "expense",
                "text-earth hover:text-rose-600": typeFilter() !== "expense",
              }}
            >
              Expense
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter() === "income"}
              onClick={() =>
                setTypeFilter((prev) => (prev === "income" ? "all" : "income"))
              }
              class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
              classList={{
                "bg-emerald-600 text-white shadow-sm font-black":
                  typeFilter() === "income",
                "text-earth hover:text-emerald-700": typeFilter() !== "income",
              }}
            >
              Income
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end flex-nowrap min-w-0">
          {/* Recurring Toggle */}
          <div
            class="flex items-center gap-1 sm:gap-2 group cursor-pointer select-none shrink-0"
            onClick={() => setShowOnlyRecurring((v) => !v)}
            title={showOnlyRecurring() ? "Show all transactions" : "Filter recurring transactions"}
            aria-label="Filter recurring transactions"
          >
            <span
              class="sm:hidden material-icons !text-[16px] transition-colors"
              classList={{
                "text-forest": showOnlyRecurring(),
                "text-mid-green group-hover:text-forest": !showOnlyRecurring(),
              }}
            >
              autorenew
            </span>
            <span
              class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest transition-colors"
              classList={{
                "text-forest": showOnlyRecurring(),
                "text-mid-green group-hover:text-forest": !showOnlyRecurring(),
              }}
            >
              Recurring
            </span>
            <div class="ios-switch shrink-0" aria-checked={showOnlyRecurring()}>
              <div
                class="ios-switch-thumb"
                data-state={showOnlyRecurring() ? "checked" : "unchecked"}
              />
            </div>
          </div>

          {/* Account Dropdown */}
          <div class="relative account-dropdown-container shrink-0 min-w-0">
            <button
              type="button"
              class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-200 cursor-pointer select-none group/acc hover:shadow-sm shrink-0 min-w-0"
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
              <div class="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <span
                  class="material-icons !text-[13px] shrink-0"
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
                  class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest shrink-0"
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
                  class="text-[10px] font-bold uppercase tracking-wider sm:tracking-widest truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[150px] md:max-w-none text-left"
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
                  {state.ui.selectedAccount ? (
                    state.ui.selectedAccount
                  ) : (
                    <>
                      <span class="sm:hidden">Accounts</span>
                      <span class="hidden sm:inline">All Accounts</span>
                    </>
                  )}
                </span>
              </div>
              <span
                class="material-icons !text-[14px] shrink-0 transition-transform duration-200"
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
              <div class="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-1.5 w-48 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-1 z-40 flex flex-col gap-0.5 animate-slide-down">
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
                        <div class="flex items-center gap-2 min-w-0">
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
                          <span class="material-icons !text-[14px] text-forest shrink-0">
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

          {/* Multi-Select Category Filters Dropdown */}
          <div class="relative filter-dropdown-container shrink-0">
            <button
              type="button"
              class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none group/filter hover:shadow-sm shrink-0"
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
                class="material-icons !text-[13px] shrink-0"
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
                class="text-[10px] font-bold uppercase tracking-wider sm:tracking-widest"
                classList={{
                  "text-forest font-black": selectedCategories().size > 0,
                  "text-forest/70": selectedCategories().size === 0,
                }}
              >
                Filters
              </span>
              <Show when={selectedCategories().size > 0}>
                <span
                  class="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-[8px] sm:text-[9px] font-bold shrink-0"
                  style={{
                    "background-color": "var(--color-forest)",
                    color: "#ffffff",
                  }}
                >
                  {selectedCategories().size}
                </span>
              </Show>
              <span
                class="material-icons !text-[14px] shrink-0 transition-transform duration-200 text-forest"
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
                class="absolute right-0 mt-1.5 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-2 z-40 flex flex-col gap-1 animate-slide-down"
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
        </div>
      </div>
      <Show when={!props.loading && sortedTransactions().length > 0}>
        <div class="overflow-x-hidden sm:overflow-x-auto overflow-y-auto flex-1 h-[380px] min-h-[380px] max-h-[380px] sm:h-auto sm:min-h-0 sm:max-h-none custom-scrollbar rounded-b-2xl">
          <table class="w-full min-w-0 sm:min-w-[640px] text-left font-outfit relative">
            <thead class="bg-sage text-earth text-[9px] sm:text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-forest/10 shadow-xs">
              <tr>
                <th
                  class={`${headerClass("name")} pl-3.5 sm:pl-6 pr-1.5 sm:pr-4`}
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
                  class={`${headerClass("category")} hidden sm:table-cell`}
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
                  class={`${headerClass("account")} hidden sm:table-cell`}
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
                  class={`${headerClass("date")} hidden sm:table-cell`}
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
                  class={`${headerClass("amount")} px-1.5 sm:px-6 whitespace-nowrap w-px sm:w-auto`}
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
                <th class="pr-3.5 sm:pr-6 pl-1 sm:pl-4 py-3 sm:py-4 w-20 sm:w-24 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-earth">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="text-xs sm:text-sm divide-y divide-forest/5">
              <For each={sortedTransactions()}>
                {(t) => {
                  const isPending = () => isTransactionPending(t.id);
                  return (
                    <tr
                      role="row"
                      tabIndex={isPending() ? -1 : 0}
                      onClick={() => !isPending() && openEditTransaction(t.id)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !isPending()) {
                          e.preventDefault();
                          openEditTransaction(t.id);
                        }
                      }}
                      class="group hover:bg-page-bg transition-all cursor-pointer select-none"
                      classList={{
                        "opacity-70 bg-forest/[0.02]": isPending(),
                      }}
                    >
                      <td class="pl-3.5 sm:pl-6 pr-1.5 sm:pr-4 py-2.5 sm:py-4 border-l-3 border-transparent group-hover:border-spring min-w-0">
                        <div class="flex flex-col gap-1 min-w-0">
                          <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                            <p class="font-semibold text-xs sm:text-sm text-forest leading-snug truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
                              {t.name}
                            </p>
                            <Show when={t.isRecurring}>
                              <span
                                class="material-icons !text-[13px] sm:!text-[14px] text-spring shrink-0"
                                title="Recurring Transaction"
                              >
                                autorenew
                              </span>
                            </Show>
                            <Show when={isPending()}>
                              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                                <span class="w-2 h-2 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                                Saving…
                              </span>
                            </Show>
                          </div>

                          {/* Mobile details: Category, Account, Date */}
                          <div class="sm:hidden flex items-center gap-1.5 flex-wrap text-[10px] text-earth/70">
                            <span
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                              style={{
                                "background-color": t.categoryColor
                                  ? `${t.categoryColor}15`
                                  : "rgba(232, 245, 236, 0.5)",
                                color: t.categoryColor || "var(--color-forest)",
                              }}
                            >
                              <Show when={formatIconName(t.categoryIcon)}>
                                <span class="material-icons !text-[11px] shrink-0">
                                  {formatIconName(t.categoryIcon)}
                                </span>
                              </Show>
                              <span class="truncate max-w-[80px]">{t.category}</span>
                            </span>

                            <Show when={t.accountName}>
                              <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                                style={{
                                  "background-color": t.accountColor
                                    ? `${t.accountColor}15`
                                    : "rgba(82, 194, 120, 0.1)",
                                  color: t.accountColor || "var(--color-mid-green)",
                                }}
                              >
                                {t.accountName}
                              </span>
                            </Show>

                            <span class="text-[10px] text-earth/60 shrink-0">
                              {formatDateDetail(t.date)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td class="hidden sm:table-cell px-6 py-4">
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
                      <td class="hidden sm:table-cell px-6 py-4">
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
                      <td class="hidden sm:table-cell px-6 py-4 text-earth">
                        {formatDateDetail(t.date)}
                      </td>
                      <td
                        class="px-1.5 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-xs sm:text-sm whitespace-nowrap w-px sm:w-auto"
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
                      <td class="pr-3.5 sm:pr-6 pl-1 sm:pl-4 py-2.5 sm:py-4 w-20 sm:w-24 text-center">
                        <div
                          class="flex items-center justify-center gap-1 sm:gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isPending()}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTransaction(t.id);
                            }}
                            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-earth/60 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Edit transaction"
                            aria-label={`Edit ${t.name}`}
                          >
                            <span class="material-icons !text-[15px] sm:!text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isPending()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransactionToDelete(t);
                            }}
                            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-earth/60 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete transaction"
                            aria-label={`Delete ${t.name}`}
                          >
                            <span class="material-icons !text-[15px] sm:!text-[16px]">delete_outline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Show when={props.loading}>
        <div class="p-12 text-center text-earth/50 animate-pulse flex-1 flex flex-col items-center justify-center h-[380px] min-h-[380px] max-h-[380px] sm:h-auto sm:min-h-0 sm:max-h-none">
          <span class="material-icons text-4xl mb-2">sync</span>
          <p class="text-sm">Fetching your garden data...</p>
        </div>
      </Show>

      <Show when={!props.loading && sortedTransactions().length === 0}>
        <div class="p-12 text-center text-earth/50 flex-1 flex flex-col items-center justify-center h-[380px] min-h-[380px] max-h-[380px] sm:h-auto sm:min-h-0 sm:max-h-none">
          <span class="material-icons text-4xl mb-2">eco</span>
          <p class="text-sm">
            {typeFilter() === "expense"
              ? "No expense transactions recorded for this view."
              : typeFilter() === "income"
                ? "No income transactions recorded for this view."
                : "No transactions this month. Start tending your garden!"}
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
