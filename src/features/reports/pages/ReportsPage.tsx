import { createMemo, createSignal, onMount, Show } from "solid-js";
import {
  Badge,
  SimpleSelect,
  Tabs,
  TabsList,
  TabsTrigger,
  type SelectOption,
} from "../../../components/ui";
import { getAccounts } from "../../../data/expenseData";
import { state } from "../../../store";
import {
  isTransactionsLoading,
  transactions,
  transactionsError,
} from "../../../store/transactionStore";
import type { Account } from "../../../types";
import { AccountFlowCard } from "../components/AccountFlowCard";
import { CashflowTrendCard } from "../components/CashflowTrendCard";
import { CategoryBreakdownCard } from "../components/CategoryBreakdownCard";
import { CategoryMomComparisonCard } from "../components/CategoryMomComparisonCard";
import { ReportsKpiStrip } from "../components/ReportsKpiStrip";
import { TopMerchantsCard } from "../components/TopMerchantsCard";
import {
  buildAccountFlow,
  buildCategoryBreakdown,
  buildMonthlySeries,
  buildRecurringSplit,
  buildReportsKpis,
  buildTopMerchants,
  type ReportRangeMonths,
} from "../model/reportsAnalytics";

export function ReportsPage() {
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = createSignal("");
  const [rangeMonths, setRangeMonths] = createSignal<ReportRangeMonths>(6);

  onMount(async () => {
    setAccounts(await getAccounts());
  });

  const accountOptions = createMemo<SelectOption[]>(() => [
    { value: "", label: "All Accounts" },
    ...accounts().map((a) => ({
      value: a.id,
      label: a.name,
      color: a.color || "#1a4d2e",
    })),
  ]);

  const series = createMemo(() =>
    buildMonthlySeries(
      transactions(),
      state.ui.currentMonth,
      state.ui.datePeriod,
      rangeMonths(),
      selectedAccount(),
    ),
  );

  const currentPeriod = createMemo(() => series()[series().length - 1]);
  const previousPeriod = createMemo(() =>
    series().length >= 2 ? series()[series().length - 2] : currentPeriod(),
  );

  const kpis = createMemo(() => buildReportsKpis(series()));

  const categories = createMemo(() => {
    const curr = currentPeriod();
    const prev = previousPeriod();
    if (!curr || !prev) return [];
    return buildCategoryBreakdown(
      transactions(),
      curr.start,
      curr.end,
      prev.start,
      prev.end,
      selectedAccount(),
    );
  });

  const merchants = createMemo(() => {
    const curr = currentPeriod();
    if (!curr) return [];
    return buildTopMerchants(
      transactions(),
      curr.start,
      curr.end,
      selectedAccount(),
      6,
    );
  });

  const recurringSplit = createMemo(() => {
    const curr = currentPeriod();
    if (!curr) {
      return { recurring: 0, discretionary: 0, recurringPct: 0, discretionaryPct: 0 };
    }
    return buildRecurringSplit(
      transactions(),
      curr.start,
      curr.end,
      selectedAccount(),
    );
  });

  const accountFlows = createMemo(() => {
    const curr = currentPeriod();
    if (!curr) return [];
    const scopedAccounts = selectedAccount()
      ? accounts().filter((a) => a.id === selectedAccount())
      : accounts();
    return buildAccountFlow(scopedAccounts, transactions(), curr.start, curr.end);
  });

  const periodRangeLabel = createMemo(() => {
    const curr = currentPeriod();
    if (!curr) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(curr.start)} – ${fmt(curr.end)}`;
  });

  return (
    <div class="space-y-6 sm:space-y-8 pb-20 animate-fade-in-up">
      {/* Header + Controls */}
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2.5">
            <h2 class="font-cormorant text-2xl sm:text-3xl font-bold text-forest">
              Financial Reports
            </h2>
            <Show when={periodRangeLabel()}>
              <Badge variant="outline">{periodRangeLabel()}</Badge>
            </Show>
          </div>
          <p class="font-outfit text-xs sm:text-sm text-earth">
            Live cashflow trends, spending structure, merchant rankings, and account movement.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Tabs
            value={String(rangeMonths())}
            onChange={(val) => setRangeMonths(Number(val) as ReportRangeMonths)}
            class="w-auto"
          >
            <TabsList>
              <TabsTrigger value="3">3M</TabsTrigger>
              <TabsTrigger value="6">6M</TabsTrigger>
              <TabsTrigger value="12">12M</TabsTrigger>
            </TabsList>
          </Tabs>

          <div class="w-48">
            <SimpleSelect
              options={accountOptions()}
              value={selectedAccount()}
              onChange={setSelectedAccount}
              ariaLabel="Filter reports by account"
              placeholder="All Accounts"
            />
          </div>
        </div>
      </div>

      <Show when={transactionsError()}>
        <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {transactionsError()}
        </p>
      </Show>

      {/* KPI Strip */}
      <ReportsKpiStrip kpis={kpis()} loading={isTransactionsLoading()} />

      {/* Full-width Cashflow Trend */}
      <CashflowTrendCard series={series()} loading={isTransactionsLoading()} />

      {/* Category Breakdown + MoM Comparison */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="lg:col-span-6">
          <CategoryBreakdownCard
            categories={categories()}
            recurringSplit={recurringSplit()}
            loading={isTransactionsLoading()}
          />
        </div>
        <div class="lg:col-span-6">
          <CategoryMomComparisonCard
            categories={categories()}
            currentLabel={currentPeriod()?.label ?? "Current"}
            previousLabel={previousPeriod()?.label ?? "Previous"}
            loading={isTransactionsLoading()}
          />
        </div>
      </div>

      {/* Top Merchants + Account Cashflow */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="lg:col-span-6">
          <TopMerchantsCard merchants={merchants()} loading={isTransactionsLoading()} />
        </div>
        <div class="lg:col-span-6">
          <AccountFlowCard flows={accountFlows()} loading={isTransactionsLoading()} />
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
