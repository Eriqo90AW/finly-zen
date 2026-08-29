import { describe, it, expect, vi, beforeEach } from "vitest";
import { addTransactions } from "./expenseData";
import { supabase } from "../lib/supabase";
import type { AddTransactionParams } from "../types";

vi.mock("../lib/userContext", () => ({
  resolveUserId: vi.fn().mockResolvedValue("user-123"),
  getUserIdSync: vi.fn().mockReturnValue("user-123"),
}));

vi.mock("../lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe("addTransactions Batch Persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles empty items array gracefully", async () => {
    const results = await addTransactions([]);
    expect(results).toEqual([]);
  });

  it("processes all items, preserves input order, and limits concurrency to 4", async () => {
    let activeWorkers = 0;
    let maxObservedConcurrency = 0;

    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "transactions") {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            activeWorkers++;
            maxObservedConcurrency = Math.max(maxObservedConcurrency, activeWorkers);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(async () => {
                  await new Promise((r) => setTimeout(r, 25));
                  activeWorkers--;
                  return { data: { id: `tx-id-${payload.name}` }, error: null };
                }),
              }),
            };
          }),
        };
      }

      if (table === "view_transactions_detailed") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  transaction_id: val,
                  transaction_name: val.replace("tx-id-", ""),
                  amount: 10000,
                  category_name: "Food & Dining",
                  account_name: "BCA",
                  transaction_type: "expense",
                  created_at: new Date().toISOString(),
                  is_recurring: false,
                },
                error: null,
              }),
            })),
          }),
        };
      }

      return { select: vi.fn() };
    });

    const items: AddTransactionParams[] = Array.from({ length: 8 }, (_, i) => ({
      name: `Item ${i + 1}`,
      amount: (i + 1) * 10000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      isRecurring: false,
    }));

    const eventListener = vi.fn();
    window.addEventListener("finly:data-changed", eventListener);

    const results = await addTransactions(items, 4);

    window.removeEventListener("finly:data-changed", eventListener);

    expect(results).toHaveLength(8);
    expect(maxObservedConcurrency).toBeLessThanOrEqual(4);

    // Verify ordering
    for (let i = 0; i < 8; i++) {
      expect(results[i].index).toBe(i);
      expect(results[i].success).toBe(true);
      expect(results[i].data?.transaction_name).toBe(`Item ${i + 1}`);
    }

    // Verify single event dispatched for batch
    expect(eventListener).toHaveBeenCalledTimes(1);
  });

  it("settles failures without rolling back or aborting successful items", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
      if (table === "transactions") {
        return {
          insert: vi.fn().mockImplementation((payload: any) => {
            if (payload.name === "Failing Item") {
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Database constraint error" },
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: `tx-${payload.name}` },
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      if (table === "view_transactions_detailed") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(async () => ({
                data: {
                  transaction_id: "tx-success",
                  transaction_name: "Success",
                  amount: 10000,
                  category_name: "Food & Dining",
                  account_name: "BCA",
                  transaction_type: "expense",
                  created_at: new Date().toISOString(),
                  is_recurring: false,
                },
                error: null,
              })),
            }),
          }),
        };
      }

      return { select: vi.fn() };
    });

    const items: AddTransactionParams[] = [
      { name: "Success 1", amount: 10000, type: "expense", accountId: "acc-1", categoryId: "cat-1", isRecurring: false },
      { name: "Failing Item", amount: 20000, type: "expense", accountId: "acc-1", categoryId: "cat-1", isRecurring: false },
      { name: "Success 2", amount: 30000, type: "income", accountId: "acc-1", categoryId: "cat-1", isRecurring: false },
    ];

    const results = await addTransactions(items, 4);

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);

    expect(results[1].success).toBe(false);
    expect(results[1].error).toContain("Database constraint error");

    expect(results[2].success).toBe(true);
  });
});

