import type { SortDirection, SortKey, Transaction } from "../../../types";

export type TransactionTypeFilter = "all" | "expense" | "income";

export interface AccountOption {
  name: string;
  color?: string;
}

export interface CategoryOption {
  name: string;
  icon?: string;
  color?: string;
}

export interface TransactionDayGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}

export interface FilterSortOptions {
  typeFilter: TransactionTypeFilter;
  showOnlyRecurring: boolean;
  selectedCategories: Set<string>;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

export function extractAvailableAccounts(
  transactions: Transaction[],
): AccountOption[] {
  const accs = new Map<string, string | undefined>();
  for (const t of transactions) {
    if (t.accountName && !accs.has(t.accountName)) {
      accs.set(t.accountName, t.accountColor);
    }
  }

  return [
    { name: "All Accounts", color: undefined },
    ...Array.from(accs.entries()).map(([name, color]) => ({ name, color })),
  ];
}

export function extractUniqueCategories(
  transactions: Transaction[],
): CategoryOption[] {
  const map = new Map<string, CategoryOption>();
  for (const t of transactions) {
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
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterAndSortTransactions(
  transactions: Transaction[],
  options: FilterSortOptions,
): Transaction[] {
  let list = [...transactions];

  if (options.typeFilter !== "all") {
    list = list.filter(
      (t) => (t.type?.toLowerCase() || "expense") === options.typeFilter,
    );
  }

  if (options.showOnlyRecurring) {
    list = list.filter((t) => t.isRecurring);
  }

  if (options.selectedCategories.size > 0) {
    list = list.filter((t) => options.selectedCategories.has(t.category));
  }

  const dir = options.sortDirection === "asc" ? 1 : -1;

  list.sort((a, b) => {
    let cmp = 0;
    switch (options.sortKey) {
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
}

export function groupTransactionsByDay(
  transactions: Transaction[],
): TransactionDayGroup[] {
  const groups = new Map<string, TransactionDayGroup>();
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    const key = dateKey.format(date);
    let group = groups.get(key);
    if (!group) {
      group = { label: dateLabel.format(date), total: 0, transactions: [] };
      groups.set(key, group);
    }
    group.transactions.push(transaction);
    group.total +=
      transaction.type?.toLowerCase() === "income"
        ? transaction.amount
        : -transaction.amount;
  }

  return Array.from(groups.values());
}

export function getSortArrowIcon(
  activeKey: SortKey,
  key: SortKey,
  direction: SortDirection,
): string {
  if (activeKey !== key) return "unfold_more";
  return direction === "asc" ? "arrow_upward" : "arrow_downward";
}
