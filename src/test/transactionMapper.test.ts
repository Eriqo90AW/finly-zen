import { describe, it, expect } from "vitest";
import { mapTransactionDetail } from "../data/expenseData";
import { sortTransactions } from "../store/transactionStore";
import type { Transaction } from "../types";

describe("Transaction Mapper", () => {
  it("maps complete view_transactions_detailed record into Transaction model", () => {
    const raw = {
      transaction_id: "tx-123",
      amount: 75000,
      category_name: "Food & Dining",
      category_icon: "restaurant",
      category_color: "#d47b5a",
      category_id: "cat-1",
      transaction_name: "Lunch at Warung",
      account_name: "BCA",
      account_color: "#1a4d2e",
      account_id: "acc-1",
      transaction_type: "expense",
      created_at: "2026-08-29T12:30:00.000Z",
      note: "Team lunch",
      is_recurring: false,
    };

    const mapped = mapTransactionDetail(raw);

    expect(mapped).toEqual({
      id: "tx-123",
      amount: 75000,
      category: "Food & Dining",
      categoryIcon: "restaurant",
      categoryColor: "#d47b5a",
      categoryId: "cat-1",
      name: "Lunch at Warung",
      accountName: "BCA",
      accountColor: "#1a4d2e",
      accountId: "acc-1",
      type: "expense",
      date: "2026-08-29T12:30:00.000Z",
      note: "Team lunch",
      isRecurring: false,
    });
  });

  it("handles fallback values for missing or null fields", () => {
    const raw = {
      transaction_id: "tx-456",
      amount: "50000",
      created_at: "2026-08-28T10:00:00.000Z",
    };

    const mapped = mapTransactionDetail(raw);

    expect(mapped.id).toBe("tx-456");
    expect(mapped.amount).toBe(50000);
    expect(mapped.name).toBe("Untitled");
    expect(mapped.category).toBe("General");
    expect(mapped.type).toBe("expense");
    expect(mapped.isRecurring).toBe(false);
  });

  it("infers income type correctly", () => {
    const raw = {
      id: "tx-789",
      amount: 15000000,
      name: "Monthly Salary",
      type: "income",
      created_at: "2026-08-01T08:00:00.000Z",
    };

    const mapped = mapTransactionDetail(raw);
    expect(mapped.type).toBe("income");
  });

  it("handles null or undefined input gracefully", () => {
    const mapped = mapTransactionDetail(null);
    expect(mapped.id).toBe("");
    expect(mapped.amount).toBe(0);
    expect(mapped.category).toBe("General");
  });
});

describe("Deterministic Transaction Sorting", () => {
  it("sorts primarily by date descending", () => {
    const t1: Transaction = {
      id: "1",
      amount: 100,
      name: "T1",
      category: "Food",
      type: "expense",
      date: "2026-08-29T10:00:00.000Z",
      note: "",
    };
    const t2: Transaction = {
      id: "2",
      amount: 200,
      name: "T2",
      category: "Food",
      type: "expense",
      date: "2026-08-29T12:00:00.000Z",
      note: "",
    };

    const sorted = [t1, t2].sort(sortTransactions);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("sorts by ID descending as tie-breaker for identical timestamps", () => {
    const t1: Transaction = {
      id: "abc",
      amount: 100,
      name: "T1",
      category: "Food",
      type: "expense",
      date: "2026-08-29T12:00:00.000Z",
      note: "",
    };
    const t2: Transaction = {
      id: "xyz",
      amount: 200,
      name: "T2",
      category: "Food",
      type: "expense",
      date: "2026-08-29T12:00:00.000Z",
      note: "",
    };

    const sorted = [t1, t2].sort(sortTransactions);
    expect(sorted[0].id).toBe("xyz");
    expect(sorted[1].id).toBe("abc");
  });
});
