import { describe, it, expect, beforeEach, vi } from "vitest";
import * as expenseData from "../data/expenseData";
import {
  transactions,
  isTransactionsLoading,
  isTransactionPending,
  drawerState,
  mutationToasts,
  openCreateTransaction,
  openEditTransaction,
  closeDrawer,
  createTransactionOptimistically,
  updateTransactionOptimistically,
  initializeTransactions,
  refreshTransactions,
  resetTransactionStore,
  type TransactionDisplayMeta,
} from "../store/transactionStore";
import type { AddTransactionParams, UpdateTransactionParams, Transaction } from "../types";

describe("Transaction Store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetTransactionStore();
  });

  const sampleMeta: TransactionDisplayMeta = {
    categoryName: "Food & Dining",
    categoryIcon: "restaurant",
    categoryColor: "#d47b5a",
    accountName: "Main",
    accountColor: "#1a4d2e",
  };

  it("loads transactions on initializeTransactions", async () => {
    const mockTxs: Transaction[] = [
      {
        id: "tx-1",
        amount: 50000,
        name: "Groceries",
        category: "Food",
        type: "expense",
        date: "2026-08-29T10:00:00.000Z",
        note: "",
      },
    ];
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce(mockTxs);

    expect(isTransactionsLoading()).toBe(false);
    const initPromise = initializeTransactions();
    expect(isTransactionsLoading()).toBe(true);

    await initPromise;
    expect(isTransactionsLoading()).toBe(false);
    expect(transactions()).toHaveLength(1);
    expect(transactions()[0].name).toBe("Groceries");
  });

  it("handles optimistic add with deferred server resolution", async () => {
    let resolveServerPromise!: (val: any) => void;
    const serverPromise = new Promise((resolve) => {
      resolveServerPromise = resolve;
    });
    vi.spyOn(expenseData, "addTransaction").mockReturnValueOnce(serverPromise as any);

    const payload: AddTransactionParams = {
      name: "Coffee Shop",
      amount: 35000,
      categoryId: "cat-1",
      accountId: "acc-1",
      type: "expense",
      isRecurring: false,
      createdAt: new Date("2026-08-29T11:00:00.000Z"),
    };

    // Trigger optimistic add
    const mutationPromise = createTransactionOptimistically(payload, sampleMeta);

    // Immediate state: item is visible and marked pending
    expect(transactions()).toHaveLength(1);
    const tempTx = transactions()[0];
    expect(tempTx.name).toBe("Coffee Shop");
    expect(tempTx.amount).toBe(35000);
    expect(isTransactionPending(tempTx.id)).toBe(true);

    // Resolve server response
    resolveServerPromise({
      transaction_id: "server-id-999",
      transaction_name: "Coffee Shop",
      amount: 35000,
      category_name: "Food & Dining",
      account_name: "Main",
      transaction_type: "expense",
      created_at: "2026-08-29T11:00:00.000Z",
      is_recurring: false,
    });

    await mutationPromise;

    // After resolution: temporary ID is replaced with authoritative server ID
    expect(transactions()).toHaveLength(1);
    expect(transactions()[0].id).toBe("server-id-999");
    expect(isTransactionPending("server-id-999")).toBe(false);
    expect(isTransactionPending(tempTx.id)).toBe(false);
  });

  it("handles optimistic add failure, rolls back, and provides a retry callback", async () => {
    let rejectServerPromise!: (err: Error) => void;
    const serverPromise = new Promise((_, reject) => {
      rejectServerPromise = reject;
    });
    vi.spyOn(expenseData, "addTransaction").mockReturnValueOnce(serverPromise as any);

    const payload: AddTransactionParams = {
      name: "Failed Lunch",
      amount: 40000,
      categoryId: "cat-1",
      accountId: "acc-1",
      type: "expense",
      isRecurring: false,
    };

    const mutationPromise = createTransactionOptimistically(payload, sampleMeta);

    // Visible immediately
    expect(transactions()).toHaveLength(1);

    // Reject network request
    rejectServerPromise(new Error("Network disconnect"));
    await mutationPromise;

    // Rolled back
    expect(transactions()).toHaveLength(0);

    // Error toast created with retry handler
    const toasts = mutationToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain("Failed to add \"Failed Lunch\"");

    // Test retry
    vi.spyOn(expenseData, "addTransaction").mockResolvedValueOnce({
      transaction_id: "retry-id-1",
      transaction_name: "Failed Lunch",
      amount: 40000,
      category_name: "Food & Dining",
      account_name: "Main",
      transaction_type: "expense",
      created_at: "2026-08-29T11:00:00.000Z",
      is_recurring: false,
    } as any);

    await toasts[0].retry();
    expect(transactions()).toHaveLength(1);
    expect(transactions()[0].id).toBe("retry-id-1");
  });

  it("handles optimistic edit with deferred server resolution", async () => {
    // Initial confirmed state
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce([
      {
        id: "tx-existing",
        amount: 50000,
        name: "Old Name",
        category: "Food & Dining",
        categoryId: "cat-1",
        accountId: "acc-1",
        type: "expense",
        date: "2026-08-29T08:00:00.000Z",
        note: "Initial note",
      },
    ]);
    await initializeTransactions();

    let resolveUpdate!: (val: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    vi.spyOn(expenseData, "updateTransaction").mockReturnValueOnce(updatePromise as any);

    const updatePayload: UpdateTransactionParams = {
      id: "tx-existing",
      name: "Updated Name",
      amount: 85000,
      categoryId: "cat-1",
      accountId: "acc-1",
      type: "expense",
      isRecurring: true,
      note: "Updated note",
      date: new Date("2026-08-29T08:00:00.000Z"),
    };

    const mutationPromise = updateTransactionOptimistically(updatePayload, sampleMeta);

    // Overlay immediately applied
    expect(transactions()[0].name).toBe("Updated Name");
    expect(transactions()[0].amount).toBe(85000);
    expect(transactions()[0].isRecurring).toBe(true);
    expect(isTransactionPending("tx-existing")).toBe(true);

    // Cannot open edit drawer again while pending
    expect(openEditTransaction("tx-existing")).toBe(false);

    // Resolve update
    resolveUpdate({
      id: "tx-existing",
      name: "Updated Name",
      amount: 85000,
      category: "Food & Dining",
      categoryId: "cat-1",
      accountId: "acc-1",
      type: "expense",
      isRecurring: true,
      note: "Updated note",
      date: "2026-08-29T08:00:00.000Z",
    });

    await mutationPromise;

    expect(isTransactionPending("tx-existing")).toBe(false);
    expect(transactions()[0].name).toBe("Updated Name");
  });

  it("handles optimistic edit failure and rolls back to confirmed snapshot", async () => {
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce([
      {
        id: "tx-1",
        amount: 100000,
        name: "Original Snapshot",
        category: "Food & Dining",
        categoryId: "cat-1",
        accountId: "acc-1",
        type: "expense",
        date: "2026-08-29T08:00:00.000Z",
        note: "Old",
      },
    ]);
    await initializeTransactions();

    vi.spyOn(expenseData, "updateTransaction").mockRejectedValueOnce(new Error("Update failed"));

    const updatePayload: UpdateTransactionParams = {
      id: "tx-1",
      name: "Attempted Edit",
      amount: 200000,
      categoryId: "cat-1",
      accountId: "acc-1",
      type: "expense",
      isRecurring: false,
      date: new Date("2026-08-29T08:00:00.000Z"),
    };

    await updateTransactionOptimistically(updatePayload, sampleMeta);

    // Restores original snapshot
    expect(transactions()[0].name).toBe("Original Snapshot");
    expect(transactions()[0].amount).toBe(100000);
    expect(isTransactionPending("tx-1")).toBe(false);
    expect(mutationToasts()).toHaveLength(1);
  });

  it("preserves pending overlays during background refreshTransactions", async () => {
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce([
      {
        id: "tx-1",
        amount: 50000,
        name: "Server Record 1",
        category: "Food",
        type: "expense",
        date: "2026-08-29T08:00:00.000Z",
        note: "",
      },
    ]);
    await initializeTransactions();

    // Start an in-flight add
    vi.spyOn(expenseData, "addTransaction").mockReturnValueOnce(new Promise(() => {}));
    createTransactionOptimistically(
      {
        name: "Pending Item",
        amount: 25000,
        categoryId: "cat-1",
        accountId: "acc-1",
        type: "expense",
        isRecurring: false,
      },
      sampleMeta,
    );

    expect(transactions()).toHaveLength(2);

    // Now background refresh finishes with newer server records
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce([
      {
        id: "tx-1",
        amount: 50000,
        name: "Server Record 1",
        category: "Food",
        type: "expense",
        date: "2026-08-29T08:00:00.000Z",
        note: "",
      },
      {
        id: "tx-2",
        amount: 75000,
        name: "Server Record 2",
        category: "Bills",
        type: "expense",
        date: "2026-08-29T07:00:00.000Z",
        note: "",
      },
    ]);

    await refreshTransactions();

    // Pending addition is still present alongside both server records!
    const names = transactions().map((t) => t.name);
    expect(names).toContain("Pending Item");
    expect(names).toContain("Server Record 1");
    expect(names).toContain("Server Record 2");
  });

  it("manages drawer state correctly for create and edit modes", async () => {
    vi.spyOn(expenseData, "getTransactions").mockResolvedValueOnce([
      {
        id: "tx-edit-target",
        amount: 50000,
        name: "Target",
        category: "Food",
        type: "income",
        date: "2026-08-29T08:00:00.000Z",
        note: "",
      },
    ]);
    await initializeTransactions();

    openCreateTransaction("income");
    expect(drawerState().isOpen).toBe(true);
    expect(drawerState().mode).toBe("create");
    expect(drawerState().initialType).toBe("income");

    closeDrawer();
    expect(drawerState().isOpen).toBe(false);

    openEditTransaction("tx-edit-target");
    expect(drawerState().isOpen).toBe(true);
    expect(drawerState().mode).toBe("edit");
    expect(drawerState().editingId).toBe("tx-edit-target");
  });
});
