import {
  createSignal,
  For,
  createMemo,
} from "solid-js";
import { RecentTransactions } from "../components/screen-dashboard/RecentTransactions";
import { ActivityCalendar } from "../components/screen-dashboard/ActivityCalendar";
import { ExpenseCategoryCard } from "../components/screen-dashboard/ExpenseCategoryCard";
import { IncomeCategoryCard } from "../components/screen-dashboard/IncomeCategoryCard";
import { DailySpendChart } from "../components/screen-dashboard/DailySpendChart";
import { HeroCard } from "../components/screen-dashboard/HeroCard";
import { state } from "../store";
import {
  transactions,
  isTransactionsLoading,
} from "../store/transactionStore";
import { getDateRange, isDateInRange } from "../utils/date";
import { GardenWins } from "../components/screen-dashboard/GardenWins";
import { TopExpensesAndTargetsCard } from "../components/screen-dashboard/TopExpensesCard";
import { BudgetPacingChart } from "../components/screen-dashboard/BudgetPacingChart";
import { DEFAULT_CONFIG } from "../config/defaults";
import { isTransferTransaction } from "../utils/transferUtils";

const Dashboard = () => {
  const [dailyBudget, setDailyBudget] = createSignal(DEFAULT_CONFIG.dailyBudget);

  // Filtered transactions for the selected period (excludes internal transfers)
  const monthlyTransactions = createMemo(() => {
    const data = transactions() || [];
    const { start, end } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );

    return data.filter((t) => {
      const inDate = isDateInRange(t.date, start, end);
      if (!inDate) return false;
      if (isTransferTransaction(t)) return false;
      return true;
    });
  });

  // All transactions filtered for non-transfers (used for multi-period charts like DailySpendChart)
  const allFilteredTransactions = createMemo(() => {
    const data = transactions() || [];
    return data.filter((t) => {
      if (isTransferTransaction(t)) return false;
      return true;
    });
  });

  // Further filter by selected account for RecentTransactions
  const accountFilteredTransactions = createMemo(() => {
    const selected = state.ui.selectedAccount;
    if (!selected) return monthlyTransactions();
    return monthlyTransactions().filter((t) => t.accountName === selected);
  });

  return (
    <div class="space-y-6 sm:space-y-8 animate-fade-in-up overflow-x-clip w-full max-w-full">
      <div class="bento-grid w-full">
        <div class="col-span-1 sm:col-span-2 lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div class="col-span-1 lg:col-span-8 min-w-0 flex flex-col">
            <HeroCard
              allTransactions={transactions() || []}
              monthlyTransactions={monthlyTransactions()}
              loading={isTransactionsLoading()}
            />
          </div>
          <div class="col-span-1 lg:col-span-4 min-w-0 flex flex-col">
            <DailySpendChart
              transactions={allFilteredTransactions()}
              loading={isTransactionsLoading()}
              dailyBudget={dailyBudget}
              setDailyBudget={setDailyBudget}
            />
          </div>
        </div>

        <div class="col-span-1 sm:col-span-2 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6">
          <div class="col-span-1 sm:col-span-1 lg:col-span-3 min-w-0 min-h-[300px] lg:h-[500px]">
            <ExpenseCategoryCard
              transactions={accountFilteredTransactions()}
              loading={isTransactionsLoading()}
            />
          </div>
          <div class="col-span-1 sm:col-span-1 lg:col-span-3 min-w-0 min-h-[300px] lg:h-[500px]">
            <IncomeCategoryCard
              transactions={accountFilteredTransactions()}
              loading={isTransactionsLoading()}
            />
          </div>
          <div class="col-span-1 sm:col-span-2 lg:col-span-6 min-w-0 min-h-[300px] lg:h-[500px]">
            <ActivityCalendar
              transactions={monthlyTransactions()}
              loading={isTransactionsLoading()}
              dailyBudget={dailyBudget}
            />
          </div>
        </div>

        <div class="col-span-1 sm:col-span-2 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6">
          <div class="col-span-1 sm:col-span-2 lg:col-span-6 min-w-0 min-h-[300px] lg:h-[500px]">
            <BudgetPacingChart
              transactions={monthlyTransactions()}
              loading={isTransactionsLoading()}
              dailyBudget={dailyBudget}
              setDailyBudget={setDailyBudget}
            />
          </div>
          <div class="col-span-1 sm:col-span-1 lg:col-span-3 min-w-0 lg:h-[500px]">
            <TopExpensesAndTargetsCard
              transactions={accountFilteredTransactions()}
              loading={isTransactionsLoading()}
            />
          </div>
          <div class="col-span-1 sm:col-span-1 lg:col-span-3 min-w-0 min-h-[260px] lg:h-[500px]">
            <GardenWins
              transactions={transactions() || []}
              loading={isTransactionsLoading()}
              dailyBudget={dailyBudget}
            />
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div class="col-span-1 sm:col-span-2 lg:col-span-12">
          <RecentTransactions
            transactions={accountFilteredTransactions()}
            allTransactions={transactions() || []}
            loading={isTransactionsLoading()}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
