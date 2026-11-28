import { describe, expect, it } from "vitest";
import {
  computeBucketProjection,
  computeBudgetOverview,
  filterBudgetCategories,
  getBudgetStatus,
  type BudgetCategorySummary,
} from "./budgetMetrics";

const sample: BudgetCategorySummary[] = [
  { name: "Food", spent: 1_200_000, limit: 1_000_000 }, // exceeded
  { name: "Transport", spent: 850_000, limit: 1_000_000 }, // caution (85%)
  { name: "Utilities", spent: 300_000, limit: 1_000_000 }, // healthy (30%)
  { name: "Books", spent: 150_000, limit: null }, // unbudgeted
];

describe("budgetMetrics", () => {
  it("classifies category health accurately", () => {
    expect(getBudgetStatus(sample[0])).toBe("exceeded");
    expect(getBudgetStatus(sample[1])).toBe("caution");
    expect(getBudgetStatus(sample[2])).toBe("healthy");
    expect(getBudgetStatus(sample[3])).toBe("unbudgeted");
  });

  it("computes overview KPIs, remaining budget, and safe daily spend", () => {
    const start = new Date(2026, 3, 1, 0, 0, 0);
    const end = new Date(2026, 3, 30, 23, 59, 59);
    const now = new Date(2026, 3, 21, 0, 0, 0);

    const overview = computeBudgetOverview(sample, start, end, now);
    expect(overview.totalBudgeted).toBe(3_000_000);
    expect(overview.budgetedSpent).toBe(2_350_000);
    expect(overview.unbudgetedSpent).toBe(150_000);
    expect(overview.totalSpent).toBe(2_500_000);
    expect(overview.remaining).toBe(650_000);
    expect(overview.utilizationPct).toBe(78);
    expect(overview.daysRemaining).toBe(10);
    expect(overview.safeDailySpend).toBe(65_000);
    expect(overview.counts).toEqual({
      all: 4,
      atRisk: 2,
      healthy: 1,
      unbudgeted: 1,
      exceeded: 1,
      caution: 1,
    });
  });

  it("filters categories by status tab", () => {
    expect(filterBudgetCategories(sample, "at_risk").map((c) => c.name)).toEqual([
      "Food",
      "Transport",
    ]);
    expect(filterBudgetCategories(sample, "healthy").map((c) => c.name)).toEqual([
      "Utilities",
    ]);
    expect(filterBudgetCategories(sample, "unbudgeted").map((c) => c.name)).toEqual([
      "Books",
    ]);
  });

  it("projects bucket completion dates", () => {
    const now = new Date(2026, 3, 15); // Apr 2026
    expect(computeBucketProjection(10_000_000, 10_000_000, 1_000_000, now)).toEqual({
      label: "Goal reached",
      status: "complete",
    });
    expect(computeBucketProjection(10_000_000, 4_000_000, 2_000_000, now)).toEqual({
      label: "3 mo · Jul 2026",
      status: "tracking",
    });
    expect(computeBucketProjection(null, 0, 1_000_000, now).status).toBe("unestimated");
  });
});
