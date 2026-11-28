import { createMemo, createSignal, onMount, Show } from "solid-js";
import { Badge, SimpleSelect, type SelectOption } from "../../../components/ui";
import { getAccounts } from "../../../data/expenseData";
import {
  budgetSyncError,
  budgetSyncLoading,
  budgetSyncReady,
  setCategoryBudget,
  state,
} from "../../../store";
import {
  isTransactionsLoading,
  transactions,
  transactionsError,
} from "../../../store/transactionStore";
import type { Account } from "../../../types";
import { summarizeBudgets } from "../../../utils/budgetSummary";
import { getDateRange } from "../../../utils/date";
import { BudgetComparisonChart } from "../components/BudgetComparisonChart";
import { BudgetKpiStrip } from "../components/BudgetKpiStrip";
import { CategoryBudgetGrid } from "../components/CategoryBudgetGrid";
import { EditCategoryBudgetDialog } from "../components/EditCategoryBudgetDialog";
import { MoneyFramework } from "../components/MoneyFramework";
import { computeBudgetOverview } from "../model/budgetMetrics";

export const BudgetsPage = () => {
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = createSignal("");
  const [editing, setEditing] = createSignal<string | null>(null);
  const [amount, setAmount] = createSignal("");

  onMount(async () => {
    setAccounts(await getAccounts());
  });

  const period = createMemo(() =>
    getDateRange(state.ui.currentMonth, state.ui.datePeriod),
  );

  const periodRangeLabel = createMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(period().start)} – ${fmt(period().end)}`;
  });

  const categories = createMemo(() =>
    summarizeBudgets(
      transactions(),
      state.budgets,
      period().start,
      period().end,
      selectedAccount(),
    ),
  );

  const overview = createMemo(() =>
    computeBudgetOverview(categories(), period().start, period().end),
  );

  const accountOptions = createMemo<SelectOption[]>(() => [
    { value: "", label: "All Accounts" },
    ...accounts().map((a) => ({
      value: a.id,
      label: a.name,
      color: a.color || "#1a4d2e",
    })),
  ]);

  const isLoadingData = () =>
    isTransactionsLoading() || budgetSyncLoading() || !budgetSyncReady();

  const openEdit = (name: string, limit: number | null) => {
    setEditing(name);
    setAmount(limit == null ? "" : String(limit));
  };

  const handleSaveLimit = (e: Event) => {
    e.preventDefault();
    const name = editing();
    const raw = amount().trim();
    const value = raw === "" ? 0 : Number(raw);
    if (!name || !Number.isFinite(value) || value < 0) return;
    setCategoryBudget(name, value);
    setEditing(null);
  };

  return (
    <div class="space-y-6 sm:space-y-8 pb-20 animate-fade-in-up">
      {/* Page Header */}
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2.5">
            <h2 class="font-cormorant text-2xl sm:text-3xl font-bold text-forest">
              Budgets &amp; Money Plan
            </h2>
            <Badge variant="outline">{periodRangeLabel()}</Badge>
          </div>
          <p class="font-outfit text-xs sm:text-sm text-earth">
            Track category limits, daily allowance pacing, and long-term allocation buckets.
          </p>
        </div>

        <div class="w-full sm:w-56">
          <SimpleSelect
            options={accountOptions()}
            value={selectedAccount()}
            onChange={setSelectedAccount}
            ariaLabel="Filter budgets by account"
            placeholder="All Accounts"
          />
        </div>
      </div>

      {/* Sync / Load Error Banners */}
      <Show when={budgetSyncError()}>
        <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          Budget sync: {budgetSyncError()}
        </p>
      </Show>
      <Show when={transactionsError()}>
        <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {transactionsError()}
        </p>
      </Show>

      {/* KPI Overview Strip */}
      <BudgetKpiStrip overview={overview()} loading={isLoadingData()} />

      {/* Budget vs Actual Chart */}
      <BudgetComparisonChart
        categories={categories()}
        periodRangeLabel={periodRangeLabel()}
        loading={isLoadingData()}
        unavailable={Boolean(budgetSyncError())}
      />

      {/* Category Budgets Grid with Status Filter Tabs */}
      <Show when={budgetSyncReady() && !isTransactionsLoading()}>
        <CategoryBudgetGrid
          categories={categories()}
          overview={overview()}
          onEdit={openEdit}
        />
      </Show>

      {/* Money Framework Section */}
      <MoneyFramework accountId={selectedAccount()} />

      {/* Category Limit Edit Dialog */}
      <EditCategoryBudgetDialog
        category={editing()}
        amount={amount()}
        onAmountChange={setAmount}
        onClose={() => setEditing(null)}
        onSave={handleSaveLimit}
      />
    </div>
  );
};

export default BudgetsPage;
