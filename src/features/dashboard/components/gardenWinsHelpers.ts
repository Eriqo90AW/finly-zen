import {
  getDateRange,
  getLocalYmd,
  isDateInRange,
  localDateFromYmd,
} from "../../../utils/date";
import { isTransferTransaction } from "../../../utils/transferUtils";
import type { DatePeriod, Transaction } from "../../../types";

export interface SpendExtreme {
  amount: number;
  date: string;
}

export interface GardenWinsStats {
  streak: number;
  lowestSpend: SpendExtreme;
  highestSpend: SpendExtreme;
  underBudgetCount: number;
  overBudgetCount: number;
  totalDays: number;
  underBudgetPct: number;
  underBudgetPctDiff: number;
  netSpendDiffPct: number;
  totalNetSpend: number;
  totalExpensesDiffPct: number;
}

export const formatSpendDate = (ymd: string) =>
  localDateFromYmd(ymd).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

const getDatesInRange = (start: Date, end: Date) => {
  const dates: Date[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const computeGardenWinsStats = (
  transactions: Transaction[],
  currentMonth: string,
  datePeriod: DatePeriod,
  dailyBudget: number,
): GardenWinsStats => {
  const now = new Date();
  const currentPeriod = getDateRange(currentMonth, datePeriod);

  const prevMonthDate = new Date(currentMonth);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevPeriod = getDateRange(prevMonthDate.toISOString(), datePeriod);

  const netSpendForStreak: Record<string, number> = {};
  const netSpendForInsights: Record<string, number> = {};
  const totalExpensesForInsights: Record<string, number> = {};

  transactions.forEach((t) => {
    if (isTransferTransaction(t)) return;

    const dateKey = getLocalYmd(t.date);

    if (!t.isRecurring) {
      const streakAmount = t.type === "expense" ? t.amount : -t.amount;
      netSpendForStreak[dateKey] =
        (netSpendForStreak[dateKey] || 0) + streakAmount;
    }

    if (t.type === "expense") {
      totalExpensesForInsights[dateKey] =
        (totalExpensesForInsights[dateKey] || 0) + t.amount;
      netSpendForInsights[dateKey] =
        (netSpendForInsights[dateKey] || 0) + t.amount;
    } else if (t.type === "income" && !t.isRecurring) {
      netSpendForInsights[dateKey] =
        (netSpendForInsights[dateKey] || 0) - t.amount;
    }
  });

  const currentPeriodDates = getDatesInRange(
    currentPeriod.start,
    currentPeriod.end,
  );
  const prevPeriodDates = getDatesInRange(prevPeriod.start, prevPeriod.end);

  let underBudgetCount = 0;
  let overBudgetCount = 0;
  let totalNetSpend = 0;
  let lowestSpend: SpendExtreme = { amount: Infinity, date: "" };
  let highestSpend: SpendExtreme = { amount: -Infinity, date: "" };

  const endForMetrics = currentPeriod.end > now ? now : currentPeriod.end;

  currentPeriodDates.forEach((date) => {
    if (date > endForMetrics) return;

    const dateKey = getLocalYmd(date);
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
  const streakDate = new Date(endForMetrics);
  const periodStartKey = getLocalYmd(currentPeriod.start);

  while (true) {
    const dateKey = getLocalYmd(streakDate);
    if (dateKey < periodStartKey) break;

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
    const dateKey = getLocalYmd(date);
    const dailySpend = netSpendForStreak[dateKey] || 0;
    const netExpense = netSpendForInsights[dateKey] || 0;

    prevTotalNetSpend += netExpense;
    if (dailySpend <= dailyBudget) prevUnderBudgetCount++;
  });

  const elapsedDays = currentPeriodDates.filter(
    (d) => d <= endForMetrics,
  ).length;
  const currentUnderBudgetPct = (underBudgetCount / elapsedDays) * 100;
  const prevUnderBudgetPct =
    (prevUnderBudgetCount / prevPeriodDates.length) * 100;
  const underBudgetPctDiff = currentUnderBudgetPct - prevUnderBudgetPct;

  const netSpendDiffPct =
    prevTotalNetSpend !== 0
      ? ((totalNetSpend - prevTotalNetSpend) / Math.abs(prevTotalNetSpend)) *
        100
      : 0;

  let curMonthTotal = 0;
  let prevMonthTotal = 0;

  transactions.forEach((t) => {
    if (t.type !== "expense") return;
    if (isTransferTransaction(t)) return;

    if (isDateInRange(t.date, currentPeriod.start, currentPeriod.end)) {
      curMonthTotal += t.amount;
    } else if (isDateInRange(t.date, prevPeriod.start, prevPeriod.end)) {
      prevMonthTotal += t.amount;
    }
  });

  const totalExpensesDiffPct =
    prevMonthTotal !== 0
      ? ((curMonthTotal - prevMonthTotal) / Math.abs(prevMonthTotal)) * 100
      : 0;

  return {
    streak,
    lowestSpend,
    highestSpend,
    underBudgetCount,
    overBudgetCount,
    totalDays: elapsedDays,
    underBudgetPct: currentUnderBudgetPct,
    underBudgetPctDiff,
    netSpendDiffPct,
    totalNetSpend,
    totalExpensesDiffPct,
  };
};
