import { describe, expect, it } from "vitest";
import { summarizeBudgets } from "../utils/budgetSummary";
import type { Transaction } from "../types";
const tx = (id: string, date: string, category: string, amount: number, accountId: string): Transaction => ({ id, date, category, amount, accountId, name: id, type: "expense", note: "" });
describe("budget summary", () => {
  it("uses the selected period and account and shows unknown categories as unbudgeted", () => {
    const result = summarizeBudgets([tx("1", "2026-10-23T12:00:00", "Food", 30, "a"), tx("2", "2026-10-24T12:00:00", "food", 40, "b"), tx("3", "2026-09-23T12:00:00", "Food", 200, "a"), tx("4", "2026-10-25T12:00:00", "Books", 10, "a")], [{category: "Food", limit: 100}], new Date(2026,9,21), new Date(2026,10,20,23,59), "a");
    expect(result).toEqual([{name: "Food", spent: 30, limit: 100}, {name: "Books", spent: 10, limit: null}]);
  });
  it("includes all accounts when none is selected and excludes recurring debt transfers", () => {
    const transfer = { ...tx("3", "2026-10-25T12:00:00", "Debt", 100, "a"), isRecurring: true };
    const result = summarizeBudgets([tx("1", "2026-10-23T12:00:00", "Food", 30, "a"), tx("2", "2026-10-24T12:00:00", "food", 40, "b"), transfer], [{category: "Food", limit: 0}], new Date(2026,9,1), new Date(2026,10,1), "");
    expect(result).toEqual([{name: "Food", spent: 70, limit: null}]);
  });
});
