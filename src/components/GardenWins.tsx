import { For, createMemo, Show } from "solid-js";
import { state, Transaction } from "../store";
import { getDateRange } from "../utils/date";
import { formatRupiah } from "../utils/format";

interface GardenWinsProps {
  transactions: Transaction[];
  loading: boolean;
  dailyBudget: () => number;
}

// Premium SVG Icons
const Icons = {
  Streak: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  Lowest: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-spring">
      <path d="M7 10l5 5 5-5"/>
    </svg>
  ),
  Highest: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500">
      <path d="M17 14l-5-5-5 5"/>
    </svg>
  ),
  Success: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-forest">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34c0-.33.16-.64.44-.83L8 12.67c.3-.21.7-.21 1 0l1.56 1.16c.28.19.44.5.44.83z"/>
      <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34c0-.33.16-.64.44-.83L16 12.67c.3-.21.7-.21 1 0l1.56 1.16c.28.19.44.5.44.83z"/>
      <path d="M12 2v20"/>
      <path d="M12 10h0"/>
    </svg>
  ),
  Insight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A4.5 4.5 0 0 0 13.5 3.5c-1.3 0-2.6.5-3.5 1.5-.8.8-1.3 1.5-1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
    </svg>
  )
};

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
    const netSpendForStreak: Record<string, number> = {}; 
    const netSpendForInsights: Record<string, number> = {}; 
    
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      
      if (!t.isRecurring) {
        const streakAmount = t.type === 'expense' ? t.amount : -t.amount;
        netSpendForStreak[dateKey] = (netSpendForStreak[dateKey] || 0) + streakAmount;
      }

      if (t.type === 'expense') {
        if (!state.ui.showRecurringDebt && t.isRecurring && t.category?.toLowerCase() === "debt") return;
        netSpendForInsights[dateKey] = (netSpendForInsights[dateKey] || 0) + t.amount;
      } else if (t.type === 'income' && !t.isRecurring) {
        netSpendForInsights[dateKey] = (netSpendForInsights[dateKey] || 0) - t.amount;
      }
    });

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

    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let totalNetSpend = 0;
    let lowestSpend = { amount: Infinity, date: "" };
    let highestSpend = { amount: -Infinity, date: "" };

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

    let streak = 0;
    let streakDate = new Date(endForMetrics);
    
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
        
        <Show when={!props.loading && stats()} fallback={
          <div class="animate-pulse space-y-4">
            <div class="h-16 bg-forest/5 rounded-xl" />
            <div class="h-8 bg-forest/5 rounded-full w-2/3" />
          </div>
        }>
          <div class="space-y-4">
            {/* Streak Section (Reverted) */}
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

            {/* Highlights Grid (Kept Redesign) */}
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="p-3 bg-spring/5 rounded-xl border border-spring/10 hover:bg-spring/10 transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <Icons.Lowest />
                  <span class="text-[10px] font-bold text-spring uppercase">Lowest</span>
                </div>
                <p class="text-[11px] font-bold text-forest truncate">
                  {stats()!.lowestSpend.amount === Infinity ? '-' : formatRupiah(stats()!.lowestSpend.amount)}
                </p>
                <p class="text-[10px] text-forest/40 font-medium">
                  {stats()!.lowestSpend.date ? new Date(stats()!.lowestSpend.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'No data'}
                </p>
              </div>
              
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100/50 transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <Icons.Highest />
                  <span class="text-[10px] font-bold text-amber-600 uppercase">Highest</span>
                </div>
                <p class="text-[11px] font-bold text-forest truncate">
                  {stats()!.highestSpend.amount === -Infinity ? '-' : formatRupiah(stats()!.highestSpend.amount)}
                </p>
                <p class="text-[10px] text-forest/40 font-medium">
                  {stats()!.highestSpend.date ? new Date(stats()!.highestSpend.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'No data'}
                </p>
              </div>
            </div>

            {/* Success Circle & Stats (Kept Redesign) */}
            <div class="flex items-center gap-4 p-2 bg-forest/5 rounded-xl">
              <div class="relative w-12 h-12 flex-shrink-0">
                <svg class="w-full h-full" viewBox="0 0 36 36">
                  <path class="text-forest/10" stroke-dasharray="100, 100" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path 
                    class="text-spring transition-all duration-1000 ease-out" 
                    stroke-dasharray={`${stats()!.underBudgetPct}, 100`} 
                    stroke-width="3" 
                    stroke-linecap="round" 
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                  <text x="18" y="20.35" class="text-[10px] font-bold text-forest fill-current" text-anchor="middle">{Math.round(stats()!.underBudgetPct)}%</text>
                </svg>
              </div>
              <div class="space-y-0.5">
                <p class="text-[10px] font-bold text-forest/40 uppercase tracking-wider">Success Rate</p>
                <p class="text-[12px] font-bold text-forest">{stats()!.underBudgetCount} / {stats()!.totalDays} Days</p>
                <div class="flex items-center gap-1">
                  <span class={`text-[10px] font-bold ${stats()!.underBudgetPctDiff >= 0 ? 'text-spring' : 'text-red-400'}`}>
                    {stats()!.underBudgetPctDiff >= 0 ? '+' : ''}{Math.round(stats()!.underBudgetPctDiff)}% vs Last Month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Insights Section (Reverted) */}
      <Show when={stats()}>
        <div class="p-4 bg-forest rounded-2xl text-white space-y-1 mt-4">
          <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</p>
          <p class="text-sm font-outfit">
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

