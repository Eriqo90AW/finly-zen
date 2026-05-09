import { createSignal, For, createResource, createEffect, createMemo } from "solid-js";
import { RecentTransactions } from "../components/RecentTransactions";
import { ActivityCalendar } from "../components/ActivityCalendar";
import { formatRupiah } from "../utils/format";
import { CategoryCard } from "../components/CategoryCard";
import { DailySpendChart } from "../components/DailySpendChart";
import { state, nextMonth, prevMonth, toggleRecurringDebt } from "../store";
import { getTransactions } from "../lib/db";
import { getDateRange, isDateInRange } from "../utils/date";



const Dashboard = () => {
  const [displayTotal, setDisplayTotal] = createSignal(0);
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

  const totalIncome = () => monthlyTransactions().filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = () => monthlyTransactions().filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netTotal = () => totalIncome() - totalExpenses();

  // Count up animation
  createEffect(() => {
    if (transactions.loading) return;
    
    const target = netTotal();
    const duration = 1500;
    const start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayTotal(target * easeOut);

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  });




  return (
    <div class="space-y-8 animate-fade-in-up">
      <div class="bento-grid">
        {/* Hero Card */}
        <div class="col-span-8 row-span-2 premium-card p-10 bg-cream relative overflow-hidden group">
          {/* Watermark */}
          <div class="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-1000">
             <span class="material-icons text-[240px]">eco</span>
          </div>

          <div class="absolute top-10 right-10 z-20">
            <button 
              onClick={toggleRecurringDebt}
              class={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                state.ui.showRecurringDebt ? 'text-forest font-black' : 'text-forest/30 hover:text-forest/60'
              }`}
            >
              Show Recurring Debt
            </button>
          </div>
          
          <div class="relative z-10 space-y-8">
            <div class="space-y-1">
              <p class="text-xs font-bold text-forest/40 uppercase tracking-widest">Net Balance this Month</p>
              <h3 class="text-7xl hero-numeral text-forest">
                {formatRupiah(displayTotal())}
              </h3>
            </div>
            
            <div class="h-px bg-forest/10 w-full" />
            
            <div class="grid grid-cols-3 gap-8">
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Income</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                  {formatRupiah(totalIncome())}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Expenses</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                  {formatRupiah(totalExpenses())}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-earth uppercase tracking-widest">Daily Average</p>
                <p class="text-xl font-outfit font-semibold text-forest">
                    {(() => {
                      const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
                      const now = new Date();
                      
                      let divisor;
                      if (now >= start && now <= end) {
                        // Current period: use days passed since start
                        const diffTime = Math.abs(now.getTime() - start.getTime());
                        divisor = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      } else {
                        // Past or future period: use total days in period
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        divisor = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      }
                      
                      return formatRupiah(totalExpenses() / (divisor || 1));
                    })()}
                </p>
              </div>
            </div>
          </div>
        </div>

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
