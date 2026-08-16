import {
  createSignal,
  For,
  createResource,
  createEffect,
  createMemo,
} from "solid-js";
import { RecentTransactions } from "../components/screen-dashboard/RecentTransactions";
import { ActivityCalendar } from "../components/screen-dashboard/ActivityCalendar";
import { ExpenseCategoryCard } from "../components/screen-dashboard/ExpenseCategoryCard";
import { IncomeCategoryCard } from "../components/screen-dashboard/IncomeCategoryCard";
import { DailySpendChart } from "../components/screen-dashboard/DailySpendChart";
import { HeroCard } from "../components/screen-dashboard/HeroCard";
import { state, nextMonth, prevMonth } from "../store";
import { getTransactions } from "../data/expenseData";
import { getDateRange, isDateInRange } from "../utils/date";
import { GardenWins } from "../components/screen-dashboard/GardenWins";
import { TopExpensesAndTargetsCard } from "../components/screen-dashboard/TopExpensesCard";
import { BudgetPacingChart } from "../components/screen-dashboard/BudgetPacingChart";
import { DEFAULT_CONFIG } from "../config/defaults";
import { isTransferTransaction } from "../utils/transferUtils";

const Dashboard = () => {
  const [dailyBudget, setDailyBudget] = createSignal(DEFAULT_CONFIG.dailyBudget);

  // Supabase Resources
  const [transactions] = createResource(getTransactions);

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
    <div class="space-y-8 animate-fade-in-up">
      <div class="bento-grid">
        <HeroCard
          allTransactions={transactions() || []}
          monthlyTransactions={monthlyTransactions()}
          loading={transactions.loading}
        />

        <DailySpendChart
          transactions={allFilteredTransactions()}
          loading={transactions.loading}
          dailyBudget={dailyBudget}
          setDailyBudget={setDailyBudget}
        />

        <div class="col-span-12 flex gap-6 h-[500px]">
          <div class="flex-[3] min-w-0 h-full">
            <ExpenseCategoryCard
              transactions={accountFilteredTransactions()}
              loading={transactions.loading}
            />
          </div>
          <div class="flex-[5] min-w-0 h-full">
            <ActivityCalendar
              transactions={monthlyTransactions()}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
          <div class="flex-[2] min-w-0 h-full">
            <GardenWins
              transactions={transactions() || []}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
        </div>

        <div class="col-span-12 flex gap-6 h-[500px]">
          <div class="flex-[3] min-w-0 h-full">
            <IncomeCategoryCard
              transactions={accountFilteredTransactions()}
              loading={transactions.loading}
            />
          </div>
          <div class="flex-[5] min-w-0 h-full">
            <BudgetPacingChart
              transactions={monthlyTransactions()}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
          <div class="flex-[2] min-w-0 h-full">
            <TopExpensesAndTargetsCard
              transactions={accountFilteredTransactions()}
              loading={transactions.loading}
            />
          </div>
        </div>

        {/* Recent Transactions Table */}
        <RecentTransactions
          transactions={accountFilteredTransactions()}
          allTransactions={transactions() || []}
          loading={transactions.loading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
