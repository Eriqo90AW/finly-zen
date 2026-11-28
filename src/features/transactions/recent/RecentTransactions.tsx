import { Show, createSignal, createMemo, onCleanup } from "solid-js";
import type {
  RecentTransactionsProps,
  SortKey,
  SortDirection,
  Transaction,
} from "../../../types";
import { deleteTransaction } from "../../../data/expenseData";
import {
  extractAvailableAccounts,
  extractUniqueCategories,
  filterAndSortTransactions,
  groupTransactionsByDay,
  type TransactionTypeFilter,
} from "./recentTransactionsHelpers";
import { RecentTransactionsHeader } from "./RecentTransactionsHeader";
import { RecentTransactionsTable } from "./RecentTransactionsTable";
import { DeleteTransactionModal } from "./DeleteTransactionModal";

export const RecentTransactions = (props: RecentTransactionsProps) => {
  const [selectedCategories, setSelectedCategories] = createSignal<Set<string>>(
    new Set(),
  );
  const [typeFilter, setTypeFilter] =
    createSignal<TransactionTypeFilter>("all");
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

  const availableAccounts = createMemo(() =>
    extractAvailableAccounts(props.allTransactions || props.transactions),
  );

  const uniqueCategories = createMemo(() =>
    extractUniqueCategories(props.transactions),
  );

  const handleSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "amount" || key === "date" ? "desc" : "asc");
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const sortedTransactions = createMemo(() =>
    filterAndSortTransactions(props.transactions, {
      typeFilter: typeFilter(),
      showOnlyRecurring: showOnlyRecurring(),
      selectedCategories: selectedCategories(),
      sortKey: sortKey(),
      sortDirection: sortDirection(),
    }),
  );

  const groupedTransactions = createMemo(() =>
    groupTransactionsByDay(sortedTransactions()),
  );

  return (
    <div class="col-span-12 premium-card cursor-default flex flex-col min-h-0 sm:min-h-[452px] lg:h-[532px]">
      <RecentTransactionsHeader
        typeFilter={typeFilter()}
        onSelectType={setTypeFilter}
        showOnlyRecurring={showOnlyRecurring()}
        onToggleRecurring={() => setShowOnlyRecurring((v) => !v)}
        availableAccounts={availableAccounts()}
        accountDropdownOpen={accountDropdownOpen()}
        onToggleAccountDropdown={() => setAccountDropdownOpen((v) => !v)}
        onCloseAccountDropdown={() => setAccountDropdownOpen(false)}
        uniqueCategories={uniqueCategories()}
        selectedCategories={selectedCategories()}
        filtersOpen={filtersOpen()}
        onToggleFiltersOpen={() => setFiltersOpen((v) => !v)}
        onToggleCategory={toggleCategory}
        onClearCategories={() => setSelectedCategories(new Set<string>())}
      />

      <Show when={!props.loading && sortedTransactions().length > 0}>
        <RecentTransactionsTable
          groups={groupedTransactions()}
          sortKey={sortKey()}
          sortDirection={sortDirection()}
          onSort={handleSort}
          onRequestDelete={(t) => {
            setDeleteError(null);
            setTransactionToDelete(t);
          }}
        />
      </Show>

      <Show when={props.loading}>
        <div class="p-12 text-center text-earth/50 animate-pulse flex-1 flex flex-col items-center justify-center h-[412px] min-h-[412px] max-h-[412px] sm:h-auto sm:min-h-0 sm:max-h-none">
          <span class="material-icons text-4xl mb-2">sync</span>
          <p class="text-sm">Fetching your garden data...</p>
        </div>
      </Show>

      <Show when={!props.loading && sortedTransactions().length === 0}>
        <div class="p-12 text-center text-earth/50 flex-1 flex flex-col items-center justify-center h-[412px] min-h-[412px] max-h-[412px] sm:h-auto sm:min-h-0 sm:max-h-none">
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

      <DeleteTransactionModal
        transaction={transactionToDelete()}
        isDeleting={isDeleting()}
        error={deleteError()}
        onCancel={() => {
          setDeleteError(null);
          setTransactionToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
