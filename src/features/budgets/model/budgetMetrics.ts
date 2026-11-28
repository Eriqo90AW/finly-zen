import type { DatePeriod, Transaction } from "../../../types";
import { getDateRange, isDateInRange } from "../../../utils/date";

export interface BudgetCategorySummary {
  name: string;
  spent: number;
  limit: number | null;
}

export type BudgetStatus = "healthy" | "caution" | "exceeded" | "unbudgeted";
export type BudgetFilterTab = "all" | "at_risk" | "healthy" | "unbudgeted";

export interface BudgetOverviewMetrics {
  totalBudgeted: number;
  totalSpent: number;
  budgetedSpent: number;
  unbudgetedSpent: number;
  remaining: number;
  utilizationPct: number;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  safeDailySpend: number;
  counts: {
    all: number;
    atRisk: number;
    healthy: number;
    unbudgeted: number;
    exceeded: number;
    caution: number;
  };
}

export function getBudgetStatus(item: BudgetCategorySummary): BudgetStatus {
  if (item.limit === null || item.limit <= 0) return "unbudgeted";
  if (item.spent > item.limit) return "exceeded";
  if (item.spent >= item.limit * 0.8) return "caution";
  return "healthy";
}

export function computeBudgetOverview(
  categories: BudgetCategorySummary[],
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): BudgetOverviewMetrics {
  let totalBudgeted = 0;
  let totalSpent = 0;
  let budgetedSpent = 0;
  let unbudgetedSpent = 0;
  let exceeded = 0;
  let caution = 0;
  let healthy = 0;
  let unbudgeted = 0;

  for (const cat of categories) {
    totalSpent += cat.spent;
    const status = getBudgetStatus(cat);
    if (status === "unbudgeted") {
      unbudgeted += 1;
      unbudgetedSpent += cat.spent;
    } else {
      totalBudgeted += cat.limit ?? 0;
      budgetedSpent += cat.spent;
      if (status === "exceeded") exceeded += 1;
      else if (status === "caution") caution += 1;
      else healthy += 1;
    }
  }

  const remaining = totalBudgeted - budgetedSpent;
  const utilizationPct =
    totalBudgeted > 0 ? Math.round((budgetedSpent / totalBudgeted) * 100) : 0;

  const msPerDay = 86_400_000;
  const daysTotal = Math.max(
    1,
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay),
  );
  const clampedNow = Math.min(
    Math.max(now.getTime(), periodStart.getTime()),
    periodEnd.getTime(),
  );
  const daysElapsed = Math.max(
    1,
    Math.ceil((clampedNow - periodStart.getTime()) / msPerDay),
  );
  const daysRemaining =
    now > periodEnd ? 0 : Math.max(1, Math.ceil((periodEnd.getTime() - clampedNow) / msPerDay));
  const safeDailySpend =
    remaining > 0 && daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;

  return {
    totalBudgeted,
    totalSpent,
    budgetedSpent,
    unbudgetedSpent,
    remaining,
    utilizationPct,
    daysTotal,
    daysElapsed,
    daysRemaining,
    safeDailySpend,
    counts: {
      all: categories.length,
      atRisk: exceeded + caution,
      healthy,
      unbudgeted,
      exceeded,
      caution,
    },
  };
}

export function filterBudgetCategories(
  categories: BudgetCategorySummary[],
  tab: BudgetFilterTab,
): BudgetCategorySummary[] {
  if (tab === "all") return categories;
  return categories.filter((item) => {
    const status = getBudgetStatus(item);
    if (tab === "at_risk") return status === "exceeded" || status === "caution";
    return status === tab;
  });
}

export interface EmergencyBaselinePeriod {
  label: string;
  expense: number;
}

export function computeEmergencyBaseline(
  nonTransfers: Transaction[],
  datePeriod: DatePeriod,
  now: Date = new Date(),
): EmergencyBaselinePeriod[] {
  if (!nonTransfers.length) return [];
  const timestamps = nonTransfers
    .map((t) => new Date(t.date).getTime())
    .filter(Number.isFinite);
  if (!timestamps.length) return [];

  const earliest = Math.min(...timestamps);
  const month = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const result: EmergencyBaselinePeriod[] = [];

  while (month.getTime() >= earliest - 62 * 86_400_000 && result.length < 3) {
    const { start, end } = getDateRange(month.toISOString(), datePeriod);
    if (end < now) {
      const items = nonTransfers.filter((t) => isDateInRange(t.date, start, end));
      if (items.length) {
        result.push({
          label: end.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          expense: items
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0),
        });
      }
    }
    month.setMonth(month.getMonth() - 1);
  }
  return result;
}

export interface BucketProjection {
  label: string;
  status: "complete" | "tracking" | "unestimated";
}

export function computeBucketProjection(
  target: number | null,
  current: number,
  contribution: number,
  now: Date = new Date(),
): BucketProjection {
  if (target === null) return { label: "No estimate", status: "unestimated" };
  if (current >= target) return { label: "Goal reached", status: "complete" };
  if (contribution <= 0) return { label: "Set monthly plan", status: "unestimated" };

  const months = Math.ceil((target - current) / contribution);
  const date = new Date(now.getFullYear(), now.getMonth(), 1);
  date.setMonth(date.getMonth() + months);
  return {
    label: `${months} mo · ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
    status: "tracking",
  };
}
