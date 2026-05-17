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
import { BudgetPacingChart } from "../components/screen-dashboard/BudgetPacingChart";

const Dashboard = () => {
  const [dailyBudget, setDailyBudget] = createSignal(300000);

  // Supabase Resources
  const [transactions] = createResource(getTransactions);

  // Filtered transactions for the selected period
  const monthlyTransactions = createMemo(() => {
    const data = transactions() || [];
    const { start, end } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );

    return data.filter((t) => {
      const inDate = isDateInRange(t.date, start, end);
      if (!inDate) return false;
      if (
        !state.ui.showRecurringDebt &&
        t.isRecurring &&
        t.category?.toLowerCase() === "debt"
      )
        return false;
      return true;
    });
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
          transactions={monthlyTransactions()}
          loading={transactions.loading}
          dailyBudget={dailyBudget}
          setDailyBudget={setDailyBudget}
        />

        <div class="col-span-12 flex gap-6 h-[500px]">
          <div class="w-[30%] h-full">
            <ExpenseCategoryCard
              transactions={monthlyTransactions()}
              loading={transactions.loading}
            />
          </div>
          <div class="w-[50%] h-full">
            <ActivityCalendar
              transactions={monthlyTransactions()}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
          <div class="w-[20%] h-full">
            <GardenWins
              transactions={transactions() || []}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
        </div>

        <div class="col-span-12 flex gap-6 h-[500px]">
          <div class="w-[30%] h-full">
            <IncomeCategoryCard
              transactions={monthlyTransactions()}
              loading={transactions.loading}
            />
          </div>
          <div class="w-[50%] h-full">
            <BudgetPacingChart
              transactions={monthlyTransactions()}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
          <div class="w-[20%] h-full">
            <GardenWins
              transactions={transactions() || []}
              loading={transactions.loading}
              dailyBudget={dailyBudget}
            />
          </div>
        </div>

        {/* Recent Transactions Table */}
        <RecentTransactions
          transactions={monthlyTransactions()}
          loading={transactions.loading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
