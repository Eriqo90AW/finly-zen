import { createSignal, For, createResource, createEffect, createMemo } from "solid-js";
import { RecentTransactions } from "../components/RecentTransactions";
import { ActivityCalendar } from "../components/ActivityCalendar";
import { formatRupiah } from "../utils/format";
import { CategoryCard } from "../components/CategoryCard";
import { DailySpendChart } from "../components/DailySpendChart";
import { HeroCard } from "../components/HeroCard";
import { state, nextMonth, prevMonth } from "../store";
import { getTransactions } from "../lib/db";
import { getDateRange, isDateInRange } from "../utils/date";



const Dashboard = () => {
  const [dailyBudget, setDailyBudget] = createSignal(250000);

  // Supabase Resources
  const [transactions] = createResource(getTransactions);

  // Filtered transactions for the selected period
  const monthlyTransactions = createMemo(() => {
    const data = transactions() || [];
    const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
    
    return data.filter(t => {
      const inDate = isDateInRange(t.date, start, end);
      if (!inDate) return false;
      if (!state.ui.showRecurringDebt && t.isRecurring && t.category?.toLowerCase() === 'debt') return false;
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

        <CategoryCard transactions={monthlyTransactions()} loading={transactions.loading} />

        <ActivityCalendar 
          transactions={monthlyTransactions()}
          loading={transactions.loading}
          dailyBudget={dailyBudget}
        />


        {/* Streak & Wins */}
        <div class="col-span-3 row-span-3 premium-card p-6 flex flex-col justify-between">
          <div>
            <h4 class="font-outfit font-bold text-forest mb-4">Garden Wins</h4>
            <div class="space-y-4">
              <div class="p-3 bg-sage/20 rounded-xl space-y-2">
                <p class="text-[10px] font-bold text-forest uppercase tracking-widest">Under Budget Streak</p>
                <div class="flex gap-2">
                  <For each={Array(5).fill(0)}>
                    {() => <div class="w-3 h-3 rounded-full bg-forest" />}
                  </For>
                  <div class="w-3 h-3 rounded-full bg-forest/10" />
                </div>
                <p class="text-xs font-outfit text-forest font-semibold">12 Days and growing!</p>
              </div>
              <div class="flex flex-wrap gap-2">
                 <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">Lowest Food Spend</span>
                 <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">No Impulse Buys</span>
              </div>
            </div>
          </div>
          
          <div class="p-4 bg-forest rounded-2xl text-white space-y-1">
             <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</p>
             <p class="text-xs font-outfit">Your savings are 12% higher than last month.</p>
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
