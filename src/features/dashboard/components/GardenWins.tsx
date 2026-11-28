import { For, createMemo, Show } from "solid-js";
import TrendingDownIcon from "@suid/icons-material/TrendingDown";
import TrendingUpIcon from "@suid/icons-material/TrendingUp";
import WhatshotIcon from "@suid/icons-material/Whatshot";
import EnergySavingsLeafIcon from "@suid/icons-material/EnergySavingsLeaf";
import EmojiEventsIcon from "@suid/icons-material/EmojiEventsOutlined";
import LightbulbIcon from "@suid/icons-material/LightbulbOutlined";
import { state } from "../../../store";
import { formatRupiah } from "../../../utils/format";
import {
  computeGardenWinsStats,
  formatSpendDate,
} from "./gardenWinsHelpers";
import type { GardenWinsProps } from "../../../types";

export const GardenWins = (props: GardenWinsProps) => {
  const stats = createMemo(() => {
    if (props.loading) return null;
    return computeGardenWinsStats(
      props.transactions || [],
      state.ui.currentMonth,
      state.ui.datePeriod,
      props.dailyBudget(),
    );
  });

  return (
    <div class="premium-card p-4 sm:p-6 flex flex-col justify-between h-full cursor-default">
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
          {(s) => (
            <div class="space-y-4">
              {/* Streak Section */}
              <div class="p-3 bg-sage/80 rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <Show
                    when={s().streak > 0}
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
                    {s().streak > 0 ? "Under Budget Streak" : "Start Your Streak"}
                  </p>
                </div>
                <div class="flex gap-2">
                  <For each={Array(Math.min(7, s().streak)).fill(0)}>
                    {() => <div class="w-3 h-3 rounded-full bg-forest" />}
                  </For>
                  <For each={Array(Math.max(0, 7 - s().streak)).fill(0)}>
                    {() => <div class="w-3 h-3 rounded-full bg-forest/10" />}
                  </For>
                </div>
                <p class="text-xs font-outfit text-forest font-semibold">
                  {s().streak > 0
                    ? `${s().streak} ${s().streak === 1 ? "Day" : "Days"} and growing!`
                    : "Maintain your budget to start a streak!"}
                </p>
              </div>

              {/* Highlights Grid */}
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div class="p-3 bg-spring/5 rounded-xl border border-spring/10 hover:bg-spring/10 transition-colors">
                  <div class="flex items-center gap-1.5 mb-1">
                    <TrendingDownIcon sx={{ fontSize: 16 }} class="text-spring" />
                    <span class="text-[10px] font-bold text-spring uppercase">
                      Lowest
                    </span>
                  </div>
                  <p class="text-[11px] font-bold text-forest truncate">
                    {s().lowestSpend.amount === Infinity
                      ? "-"
                      : formatRupiah(s().lowestSpend.amount)}
                  </p>
                  <p class="text-[10px] text-forest/40 font-medium">
                    {s().lowestSpend.date
                      ? formatSpendDate(s().lowestSpend.date)
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
                    {s().highestSpend.amount === -Infinity
                      ? "-"
                      : formatRupiah(s().highestSpend.amount)}
                  </p>
                  <p class="text-[10px] text-forest/40 font-medium">
                    {s().highestSpend.date
                      ? formatSpendDate(s().highestSpend.date)
                      : "No data"}
                  </p>
                </div>
              </div>

              {/* Success Circle & Stats */}
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
                      stroke-dasharray={`${s().underBudgetPct}, 100`}
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
                      {Math.round(s().underBudgetPct)}%
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
                    {s().underBudgetCount} / {s().totalDays} Days
                  </p>
                  <div class="flex items-center gap-1">
                    <span
                      class={`text-[10px] font-bold ${s().underBudgetPctDiff >= 0 ? "text-spring" : "text-red-400"}`}
                    >
                      {s().underBudgetPctDiff >= 0 ? "+" : ""}
                      {Math.round(s().underBudgetPctDiff)}% vs Last Month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>

      {/* Insights Section */}
      <Show when={stats()}>
        {(s) => (
          <div class="p-4 bg-forest rounded-2xl text-white space-y-1 mt-4">
            <div class="flex items-center gap-2 mb-1">
              <LightbulbIcon sx={{ fontSize: 14 }} class="text-white/60" />
              <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">
                Insight
              </p>
            </div>
            <p class="text-[12px] font-outfit">
              {s().totalExpensesDiffPct < 0
                ? `Your total expenses are ${Math.abs(Math.round(s().totalExpensesDiffPct))}% lower than last month.`
                : `Your total expenses are ${Math.round(s().totalExpensesDiffPct)}% higher than last month.`}
            </p>
            <p class="text-[10px] opacity-80">
              {s().underBudgetPctDiff > 0
                ? `Budget discipline improved by ${Math.abs(Math.round(s().underBudgetPctDiff))}%!`
                : s().underBudgetPctDiff < 0
                  ? `Budget discipline decreased by ${Math.abs(Math.round(s().underBudgetPctDiff))}% compared to last month.`
                  : "Consistent budget discipline!"}
            </p>
          </div>
        )}
      </Show>
    </div>
  );
};
