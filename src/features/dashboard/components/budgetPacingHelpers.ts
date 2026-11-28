import { getDateRange } from "../../../utils/date";
import type { DatePeriod, Transaction } from "../../../types";

export interface BudgetPacingPoint {
  date: string;
  fullDate: string;
  target: number;
  actual: number | null;
  isFuture: boolean;
}

export interface BudgetPacingSummary {
  lastActualIndex: number;
  lastActual: number;
  todayTargetVal: number;
}

export const buildBudgetPacingData = (
  transactions: Transaction[],
  currentMonth: string,
  datePeriod: DatePeriod,
  dailyBudgetVal: number,
): BudgetPacingPoint[] => {
  const { start, end } = getDateRange(currentMonth, datePeriod);

  const days: Date[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let cumulativeActual = 0;

  return days.map((d, index) => {
    const isFuture = d > today;
    const y = d.getFullYear();
    const m = d.getMonth();
    const date = d.getDate();

    if (!isFuture) {
      const dayTransactions = transactions.filter((t) => {
        const td = new Date(t.date);
        return (
          td.getFullYear() === y &&
          td.getMonth() === m &&
          td.getDate() === date
        );
      });

      const dailyExpense = dayTransactions.reduce((acc, t) => {
        if (t.type === "expense" && t.category?.toLowerCase() !== "transfer") {
          return acc + t.amount;
        }
        return acc;
      }, 0);

      cumulativeActual += dailyExpense;
    }

    return {
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      fullDate: d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      target: (index + 1) * dailyBudgetVal,
      actual: isFuture ? null : cumulativeActual,
      isFuture,
    };
  });
};

export const computeBudgetPacingSummary = (
  data: BudgetPacingPoint[],
): BudgetPacingSummary => {
  let lastActualIndex = -1;
  let lastActual = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].actual !== null) {
      lastActual = data[i].actual as number;
      lastActualIndex = i;
      break;
    }
  }
  const todayTargetVal =
    lastActualIndex !== -1
      ? data[lastActualIndex].target
      : data.length > 0
        ? data[0].target
        : 0;
  return { lastActualIndex, lastActual, todayTargetVal };
};

export const buildBudgetPacingSeries = (
  data: BudgetPacingPoint[],
  summary: BudgetPacingSummary,
) => [
  {
    name: "Target",
    type: "area",
    data: data.map((d) => d.target),
  },
  {
    name: "Actual",
    type: "area",
    data: data.map((d) => d.actual),
  },
  {
    name: "Target Projection",
    type: "line",
    data: data.map((_, i) =>
      i >= Math.max(0, summary.lastActualIndex) ? summary.todayTargetVal : null,
    ),
  },
  {
    name: "Actual Projection",
    type: "line",
    data: data.map((_, i) =>
      i >= Math.max(0, summary.lastActualIndex) ? summary.lastActual : null,
    ),
  },
];
