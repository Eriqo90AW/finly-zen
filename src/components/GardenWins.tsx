import { For, createMemo, Show } from "solid-js";
import { state, Transaction } from "../store";
import { getDateRange, isDateInRange } from "../utils/date";
import { formatRupiah } from "../utils/format";

interface GardenWinsProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: () => number;
}

export const GardenWins = (props: GardenWinsProps) => {
  const stats = createMemo(() => {
    if (props.loading) return null;

    const transactions = props.transactions || [];
    const dailyBudget = props.dailyBudget();
    const now = new Date();
    
    // 1. Current and Previous Periods
    const currentPeriod = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
    
    const d = new Date(state.ui.currentMonth);
    d.setMonth(d.getMonth() - 1);
    const prevPeriod = getDateRange(d.toISOString(), state.ui.datePeriod);

    // 2. Map Net Spend by Date (covering current and prev periods)
    const netSpendForStreak: Record<string, number> = {}; // Non-recurring only (matches DailySpendChart)
    const netSpendForInsights: Record<string, number> = {}; // Aligned with CategoryCard
    
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      
      // Logic for Streak (Matches DailySpendChart - No recurring)
      if (!t.isRecurring) {
        const streakAmount = t.type === 'expense' ? t.amount : -t.amount;
        netSpendForStreak[dateKey] = (netSpendForStreak[dateKey] || 0) + streakAmount;
      }

      // Logic for Insights (Matches CategoryCard - Includes recurring expenses)
      if (t.type === 'expense') {
        if (!state.ui.showRecurringDebt && t.isRecurring && t.category?.toLowerCase() === "debt") return;
        netSpendForInsights[dateKey] = (netSpendForInsights[dateKey] || 0) + t.amount;
      } else if (t.type === 'income' && !t.isRecurring) {
        netSpendForInsights[dateKey] = (netSpendForInsights[dateKey] || 0) - t.amount;
      }
    });

    // 3. Helper to get dates in range
    const getDatesInRange = (start: Date, end: Date) => {
      const dates = [];
      let curr = new Date(start);
      while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
      return dates;
    };

    const currentPeriodDates = getDatesInRange(currentPeriod.start, currentPeriod.end);
    const prevPeriodDates = getDatesInRange(prevPeriod.start, prevPeriod.end);

    // 4. Current Period Metrics
    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let totalNetSpend = 0;
    let lowestSpend = { amount: Infinity, date: "" };
    let highestSpend = { amount: -Infinity, date: "" };

    const todayStr = now.toISOString().split('T')[0];
    const endForMetrics = currentPeriod.end > now ? now : currentPeriod.end;

    currentPeriodDates.forEach(date => {
      if (date > endForMetrics) return;
      
      const dateKey = date.toISOString().split('T')[0];
      const dailySpend = netSpendForStreak[dateKey] || 0;
      const netExpense = netSpendForInsights[dateKey] || 0;
      
      totalNetSpend += netExpense;
      
      if (dailySpend <= dailyBudget) {
        underBudgetCount++;
      } else {
        overBudgetCount++;
      }

      if (dailySpend < lowestSpend.amount) {
        lowestSpend = { amount: dailySpend, date: dateKey };
      }
      if (dailySpend > highestSpend.amount) {
        highestSpend = { amount: dailySpend, date: dateKey };
      }
    });

    // 5. Streak Calculation (active streak ending at reference date)
    let streak = 0;
    let streakDate = new Date(endForMetrics);
    
    // We go back from endForMetrics
    while (true) {
      const dateKey = streakDate.toISOString().split('T')[0];
      const dailySpend = netSpendForStreak[dateKey] || 0;
      
      if (dailySpend <= dailyBudget) {
        streak++;
        streakDate.setDate(streakDate.getDate() - 1);
      } else {
        break;
      }
      
      if (streak > 365) break; 
    }

    // 6. Previous Period Metrics
    let prevUnderBudgetCount = 0;
    let prevTotalNetSpend = 0;

    prevPeriodDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dailySpend = netSpendForStreak[dateKey] || 0;
      const netExpense = netSpendForInsights[dateKey] || 0;
      
      prevTotalNetSpend += netExpense;
      if (dailySpend <= dailyBudget) prevUnderBudgetCount++;
    });

    const currentUnderBudgetPct = (underBudgetCount / currentPeriodDates.filter(d => d <= endForMetrics).length) * 100;
    const prevUnderBudgetPct = (prevUnderBudgetCount / prevPeriodDates.length) * 100;
    const underBudgetPctDiff = currentUnderBudgetPct - prevUnderBudgetPct;

    const netSpendDiffPct = prevTotalNetSpend !== 0 
      ? ((totalNetSpend - prevTotalNetSpend) / Math.abs(prevTotalNetSpend)) * 100 
      : 0;

    return {
      streak,
      lowestSpend,
      highestSpend,
      underBudgetCount,
      overBudgetCount,
      totalDays: currentPeriodDates.filter(d => d <= endForMetrics).length,
      underBudgetPct: currentUnderBudgetPct,
      underBudgetPctDiff,
      netSpendDiffPct,
      totalNetSpend
    };
  });

  return (
    <div class="premium-card p-6 flex flex-col justify-between h-full">
      <div>
        <h4 class="font-outfit font-bold text-forest mb-4">Garden Wins</h4>
        
        <Show when={!props.loading && stats()} fallback={<div class="animate-pulse space-y-4">
          <div class="h-16 bg-forest/5 rounded-xl" />
          <div class="h-8 bg-forest/5 rounded-full w-2/3" />
        </div>}>
          <div class="space-y-4">
            {/* Streak Section */}
            <div class="p-3 bg-sage/80 rounded-xl space-y-2">
              <p class="text-[10px] font-bold text-forest uppercase tracking-widest">Under Budget Streak</p>
              <div class="flex gap-2">
                <For each={Array(Math.min(7, stats()!.streak)).fill(0)}>
                  {() => <div class="w-3 h-3 rounded-full bg-forest" />}
                </For>
                <For each={Array(Math.max(0, 7 - stats()!.streak)).fill(0)}>
                  {() => <div class="w-3 h-3 rounded-full bg-forest/10" />}
                </For>
              </div>
              <p class="text-xs font-outfit text-forest font-semibold">
                {stats()!.streak} {stats()!.streak === 1 ? 'Day' : 'Days'} and growing!
              </p>
            </div>

            {/* Highlights Section */}
            <div class="flex flex-wrap gap-2">
              <div class="px-3 py-1.5 bg-mid-green/30 text-forest text-[10px] font-bold rounded-lg border border-forest/10 flex flex-col items-center">
                <span class="opacity-60 uppercase text-[8px] mb-0.5">Lowest Spend</span>
                <span>{stats()!.lowestSpend.amount === Infinity ? '-' : formatRupiah(stats()!.lowestSpend.amount)}</span>
                <span class="text-[8px] opacity-40 mt-0.5">
                  {stats()!.lowestSpend.date ? new Date(stats()!.lowestSpend.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </div>
              <div class="px-3 py-1.5 bg-mid-green/30 text-forest text-[10px] font-bold rounded-lg border border-forest/10 flex flex-col items-center">
                <span class="opacity-60 uppercase text-[8px] mb-0.5">Highest Spend</span>
                <span>{stats()!.highestSpend.amount === -Infinity ? '-' : formatRupiah(stats()!.highestSpend.amount)}</span>
                <span class="text-[8px] opacity-40 mt-0.5">
                  {stats()!.highestSpend.date ? new Date(stats()!.highestSpend.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                </span>
              </div>
            </div>

            {/* Detailed Stats */}
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="p-2 bg-forest/5 rounded-lg">
                <p class="text-[8px] uppercase tracking-tighter font-bold text-forest/40">Under Budget</p>
                <p class="text-xs font-bold text-forest">{stats()!.underBudgetCount} / {stats()!.totalDays} Days</p>
                <p class="text-[9px] font-medium text-forest/60">{Math.round(stats()!.underBudgetPct)}% Success Rate</p>
              </div>
              <div class="p-2 bg-forest/5 rounded-lg">
                <p class="text-[8px] uppercase tracking-tighter font-bold text-forest/40">Over Budget</p>
                <p class="text-xs font-bold text-red-500">{stats()!.overBudgetCount} Days</p>
                <p class="text-[9px] font-medium text-forest/60">Limit: {formatRupiah(props.dailyBudget())}</p>
              </div>
            </div>
          </div>
        </Show>
      </div>

      <Show when={stats()}>
        <div class="p-4 bg-forest rounded-2xl text-white space-y-1 mt-4">
          <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</p>
          <p class="text-xs font-outfit">
            {stats()!.netSpendDiffPct < 0 
              ? `Your net expenses are ${Math.abs(Math.round(stats()!.netSpendDiffPct))}% lower than last month.`
              : `Your net expenses are ${Math.round(stats()!.netSpendDiffPct)}% higher than last month.`}
          </p>
          <p class="text-[10px] opacity-80">
            {stats()!.underBudgetPctDiff > 0
              ? `Budget discipline improved by ${Math.abs(Math.round(stats()!.underBudgetPctDiff))}%!`
              : stats()!.underBudgetPctDiff < 0 
                ? `Budget discipline decreased by ${Math.abs(Math.round(stats()!.underBudgetPctDiff))}% compared to last month.`
                : 'Consistent budget discipline!'}
          </p>
        </div>
      </Show>
    </div>
  );
};
