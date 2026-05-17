import { For, createMemo, Show } from "solid-js";
import { state } from "../../store";
import { GardenWinsProps } from "../../types";
import { getDateRange } from "../../utils/date";
import { formatRupiah } from "../../utils/format";
import TrendingDownIcon from "@suid/icons-material/TrendingDown";
import TrendingUpIcon from "@suid/icons-material/TrendingUp";
import WhatshotIcon from "@suid/icons-material/Whatshot";
import EnergySavingsLeafIcon from "@suid/icons-material/EnergySavingsLeaf";
import EmojiEventsIcon from "@suid/icons-material/EmojiEventsOutlined";
import LightbulbIcon from "@suid/icons-material/LightbulbOutlined";

export const GardenWins = (props: GardenWinsProps) => {
  const stats = createMemo(() => {
    if (props.loading) return null;

    const transactions = props.transactions || [];
    const dailyBudget = props.dailyBudget();
    const now = new Date();

    // 1. Current and Previous Periods
    const currentPeriod = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );

    const d = new Date(state.ui.currentMonth);
    d.setMonth(d.getMonth() - 1);
    const prevPeriod = getDateRange(d.toISOString(), state.ui.datePeriod);

    // 2. Map Net Spend by Date (covering current and prev periods)
    const netSpendForStreak: Record<string, number> = {};
    const netSpendForInsights: Record<string, number> = {};

    transactions.forEach((t) => {
      const dateKey = new Date(t.date).toISOString().split("T")[0];

      if (!t.isRecurring) {
        const streakAmount = t.type === "expense" ? t.amount : -t.amount;
        netSpendForStreak[dateKey] =
          (netSpendForStreak[dateKey] || 0) + streakAmount;
      }

      if (t.type === "expense") {
        if (
          !state.ui.showRecurringDebt &&
          t.isRecurring &&
          t.category?.toLowerCase() === "debt"
        )
          return;
        netSpendForInsights[dateKey] =
          (netSpendForInsights[dateKey] || 0) + t.amount;
      } else if (t.type === "income" && !t.isRecurring) {
        netSpendForInsights[dateKey] =
          (netSpendForInsights[dateKey] || 0) - t.amount;
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

    const currentPeriodDates = getDatesInRange(
      currentPeriod.start,
      currentPeriod.end,
    );
    const prevPeriodDates = getDatesInRange(prevPeriod.start, prevPeriod.end);

    let underBudgetCount = 0;
    let overBudgetCount = 0;
    let totalNetSpend = 0;
    let lowestSpend = { amount: Infinity, date: "" };
    let highestSpend = { amount: -Infinity, date: "" };

    const endForMetrics = currentPeriod.end > now ? now : currentPeriod.end;

    currentPeriodDates.forEach((date) => {
      if (date > endForMetrics) return;

      const dateKey = date.toISOString().split("T")[0];
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
      const dateKey = streakDate.toISOString().split("T")[0];
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

    prevPeriodDates.forEach((date) => {
      const dateKey = date.toISOString().split("T")[0];
      const dailySpend = netSpendForStreak[dateKey] || 0;
      const netExpense = netSpendForInsights[dateKey] || 0;

      prevTotalNetSpend += netExpense;
      if (dailySpend <= dailyBudget) prevUnderBudgetCount++;
    });

    const currentUnderBudgetPct =
      (underBudgetCount /
        currentPeriodDates.filter((d) => d <= endForMetrics).length) *
      100;
    const prevUnderBudgetPct =
      (prevUnderBudgetCount / prevPeriodDates.length) * 100;
    const underBudgetPctDiff = currentUnderBudgetPct - prevUnderBudgetPct;

    const netSpendDiffPct =
      prevTotalNetSpend !== 0
        ? ((totalNetSpend - prevTotalNetSpend) / Math.abs(prevTotalNetSpend)) *
          100
        : 0;

    return {
      streak,
      lowestSpend,
      highestSpend,
      underBudgetCount,
      overBudgetCount,
      totalDays: currentPeriodDates.filter((d) => d <= endForMetrics).length,
      underBudgetPct: currentUnderBudgetPct,
      underBudgetPctDiff,
      netSpendDiffPct,
      totalNetSpend,
    };
  });

  return (
    <div class="premium-card p-6 flex flex-col justify-between h-full">
      <div>
        <h4 class="font-outfit font-bold text-forest mb-4">Garden Wins</h4>

        <Show
          when={!props.loading && stats()}
          fallback={
            <div class="animate-pulse space-y-4">
              <div class="h-16 bg-forest/5 rounded-xl" />
              <div class="h-8 bg-forest/5 rounded-full w-2/3" />
            </div>
          }
        >
          <div class="space-y-4">
            {/* Streak Section (Reverted) */}
            <div class="p-3 bg-sage/80 rounded-xl space-y-2">
              <div class="flex items-center gap-2">
                <Show
                  when={stats()!.streak > 0}
                  fallback={
                    <EnergySavingsLeafIcon
                      sx={{ fontSize: 14 }}
                      class="text-forest/40"
                    />
                  }
                >
                  <WhatshotIcon sx={{ fontSize: 14 }} class="text-orange-500" />
                </Show>
                <p class="text-[10px] font-bold text-forest uppercase tracking-widest">
                  {stats()!.streak > 0
                    ? "Under Budget Streak"
                    : "Start Your Streak"}
                </p>
              </div>
              <div class="flex gap-2">
                <For each={Array(Math.min(7, stats()!.streak)).fill(0)}>
                  {() => <div class="w-3 h-3 rounded-full bg-forest" />}
                </For>
                <For each={Array(Math.max(0, 7 - stats()!.streak)).fill(0)}>
                  {() => <div class="w-3 h-3 rounded-full bg-forest/10" />}
                </For>
              </div>
              <p class="text-xs font-outfit text-forest font-semibold">
                {stats()!.streak > 0
                  ? `${stats()!.streak} ${stats()!.streak === 1 ? "Day" : "Days"} and growing!`
                  : "Maintain your budget to start a streak!"}
              </p>
            </div>

            {/* Highlights Grid (Kept Redesign) */}
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="p-3 bg-spring/5 rounded-xl border border-spring/10 hover:bg-spring/10 transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <TrendingDownIcon sx={{ fontSize: 16 }} class="text-spring" />
                  <span class="text-[10px] font-bold text-spring uppercase">
                    Lowest
                  </span>
                </div>
                <p class="text-[11px] font-bold text-forest truncate">
                  {stats()!.lowestSpend.amount === Infinity
                    ? "-"
                    : formatRupiah(stats()!.lowestSpend.amount)}
                </p>
                <p class="text-[10px] text-forest/40 font-medium">
                  {stats()!.lowestSpend.date
                    ? new Date(stats()!.lowestSpend.date).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short" },
                      )
                    : "No data"}
                </p>
              </div>

              <div class="p-3 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100/50 transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <TrendingUpIcon
                    sx={{ fontSize: 16 }}
                    class="text-amber-500"
                  />
                  <span class="text-[10px] font-bold text-amber-600 uppercase">
                    Highest
                  </span>
                </div>
                <p class="text-[11px] font-bold text-forest truncate">
                  {stats()!.highestSpend.amount === -Infinity
                    ? "-"
                    : formatRupiah(stats()!.highestSpend.amount)}
                </p>
                <p class="text-[10px] text-forest/40 font-medium">
                  {stats()!.highestSpend.date
                    ? new Date(stats()!.highestSpend.date).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short" },
                      )
                    : "No data"}
                </p>
              </div>
            </div>

            {/* Success Circle & Stats (Kept Redesign) */}
            <div class="flex items-center gap-4 p-2 bg-forest/5 rounded-xl">
              <div class="relative w-12 h-12 flex-shrink-0">
                <svg class="w-full h-full" viewBox="0 0 36 36">
                  <path
                    class="text-forest/10"
                    stroke-dasharray="100, 100"
                    stroke-width="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="text-spring transition-all duration-1000 ease-out"
                    stroke-dasharray={`${stats()!.underBudgetPct}, 100`}
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text
                    x="18"
                    y="20.35"
                    class="text-[10px] font-bold text-forest fill-current"
                    text-anchor="middle"
                  >
                    {Math.round(stats()!.underBudgetPct)}%
                  </text>
                </svg>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-1.5">
                  <EmojiEventsIcon
                    sx={{ fontSize: 14 }}
                    class="text-forest/40"
                  />
                  <p class="text-[10px] font-bold text-forest/40 uppercase tracking-wider">
                    Success Rate
                  </p>
                </div>
                <p class="text-[12px] font-bold text-forest">
                  {stats()!.underBudgetCount} / {stats()!.totalDays} Days
                </p>
                <div class="flex items-center gap-1">
                  <span
                    class={`text-[10px] font-bold ${stats()!.underBudgetPctDiff >= 0 ? "text-spring" : "text-red-400"}`}
                  >
                    {stats()!.underBudgetPctDiff >= 0 ? "+" : ""}
                    {Math.round(stats()!.underBudgetPctDiff)}% vs Last Month
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
          <div class="flex items-center gap-2 mb-1">
            <LightbulbIcon sx={{ fontSize: 14 }} class="text-white/60" />
            <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Insight
            </p>
          </div>
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
                : "Consistent budget discipline!"}
          </p>
        </div>
      </Show>
    </div>
  );
};
