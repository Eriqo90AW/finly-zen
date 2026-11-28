import { AccountFilterDropdown } from "./AccountFilterDropdown";
import { CategoryFilterDropdown } from "./CategoryFilterDropdown";
import type {
  AccountOption,
  CategoryOption,
  TransactionTypeFilter,
} from "./recentTransactionsHelpers";

interface RecentTransactionsHeaderProps {
  typeFilter: TransactionTypeFilter;
  onSelectType: (next: TransactionTypeFilter) => void;
  showOnlyRecurring: boolean;
  onToggleRecurring: () => void;
  availableAccounts: AccountOption[];
  uniqueCategories: CategoryOption[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
}

export const RecentTransactionsHeader = (
  props: RecentTransactionsHeaderProps,
) => {
  return (
    <div class="p-3.5 sm:p-6 border-b border-forest/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
      <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto min-w-0">
        <h4 class="font-outfit font-bold text-forest text-sm sm:text-base whitespace-nowrap">
          Recent Transactions
        </h4>

        {/* Expense - Income Pill Shape Selector */}
        <div
          role="radiogroup"
          aria-label="Transaction Type Filter"
          class="flex items-center p-0.5 bg-page-bg rounded-full border border-forest/10 shrink-0"
        >
          <button
            type="button"
            role="radio"
            aria-checked={props.typeFilter === "all"}
            onClick={() => props.onSelectType("all")}
            class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
            classList={{
              "bg-forest text-white shadow-sm font-black":
                props.typeFilter === "all",
              "text-earth hover:text-forest": props.typeFilter !== "all",
            }}
          >
            All
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={props.typeFilter === "expense"}
            onClick={() =>
              props.onSelectType(
                props.typeFilter === "expense" ? "all" : "expense",
              )
            }
            class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
            classList={{
              "bg-rose-600 text-white shadow-sm font-black":
                props.typeFilter === "expense",
              "text-earth hover:text-rose-600": props.typeFilter !== "expense",
            }}
          >
            Expense
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={props.typeFilter === "income"}
            onClick={() =>
              props.onSelectType(
                props.typeFilter === "income" ? "all" : "income",
              )
            }
            class="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-outfit font-bold transition-all cursor-pointer select-none"
            classList={{
              "bg-emerald-600 text-white shadow-sm font-black":
                props.typeFilter === "income",
              "text-earth hover:text-emerald-700":
                props.typeFilter !== "income",
            }}
          >
            Income
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end flex-nowrap min-w-0">
        {/* Recurring Toggle */}
        <button
          type="button"
          class="flex items-center gap-1 sm:gap-2 group cursor-pointer select-none shrink-0 bg-transparent border-0 p-0"
          onClick={props.onToggleRecurring}
          title={
            props.showOnlyRecurring
              ? "Show all transactions"
              : "Filter recurring transactions"
          }
          aria-label="Filter recurring transactions"
          aria-pressed={props.showOnlyRecurring}
        >
          <span
            class="sm:hidden material-icons !text-[16px] transition-colors"
            classList={{
              "text-forest": props.showOnlyRecurring,
              "text-mid-green group-hover:text-forest":
                !props.showOnlyRecurring,
            }}
          >
            autorenew
          </span>
          <span
            class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest transition-colors"
            classList={{
              "text-forest": props.showOnlyRecurring,
              "text-mid-green group-hover:text-forest":
                !props.showOnlyRecurring,
            }}
          >
            Recurring
          </span>
          <div class="ios-switch shrink-0">
            <div
              class="ios-switch-thumb"
              data-state={props.showOnlyRecurring ? "checked" : "unchecked"}
            />
          </div>
        </button>

        <AccountFilterDropdown accounts={props.availableAccounts} />

        <CategoryFilterDropdown
          categories={props.uniqueCategories}
          selectedCategories={props.selectedCategories}
          onToggleCategory={props.onToggleCategory}
          onClear={props.onClearCategories}
        />
      </div>
    </div>
  );
};
