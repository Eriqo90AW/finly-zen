import { createSignal, createMemo, batch, createRoot } from "solid-js";
import type {
  Transaction,
  TransactionType,
  AddTransactionParams,
  UpdateTransactionParams,
} from "../types";
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  mapTransactionDetail,
} from "../data/expenseData";

export interface TransactionDisplayMeta {
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountName?: string;
  accountColor?: string;
}

export interface DrawerState {
  isOpen: boolean;
  mode: "create" | "edit";
  editingId: string | null;
  initialType: TransactionType;
}

export interface MutationToast {
  id: string;
  message: string;
  type: "error";
  retry: () => Promise<void>;
  dismiss: () => void;
}

interface OptimisticAddition {
  tempId: string;
  transaction: Transaction;
  rawPayload: AddTransactionParams;
  displayMeta: TransactionDisplayMeta;
}

interface OptimisticPatch {
  id: string;
  patch: Partial<Transaction>;
  original: Transaction;
  rawPayload: UpdateTransactionParams;
  displayMeta: TransactionDisplayMeta;
}

// Deterministic comparator: primary = date desc, secondary = id desc
export function sortTransactions(a: Transaction, b: Transaction): number {
  const timeA = new Date(a.date).getTime();
  const timeB = new Date(b.date).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return (b.id || "").localeCompare(a.id || "");
}

// Internal Signals & Reactive State wrapped in createRoot to avoid rootless computation warnings
const {
  confirmedTransactions,
  setConfirmedTransactions,
  optimisticAdditions,
  setOptimisticAdditions,
  optimisticPatches,
  setOptimisticPatches,
  pendingIds,
  setPendingIds,
  isLoading,
  setIsLoading,
  error,
  setError,
  isInitialized,
  setIsInitialized,
  drawer,
  setDrawer,
  toasts,
  setToasts,
  transactions,
} = createRoot(() => {
  const [confirmedTransactions, setConfirmedTransactions] = createSignal<Transaction[]>([]);
  const [optimisticAdditions, setOptimisticAdditions] = createSignal<OptimisticAddition[]>([]);
  const [optimisticPatches, setOptimisticPatches] = createSignal<Map<string, OptimisticPatch>>(new Map());
  const [pendingIds, setPendingIds] = createSignal<Set<string>>(new Set());

  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);

  const [drawer, setDrawer] = createSignal<DrawerState>({
    isOpen: false,
    mode: "create",
    editingId: null,
    initialType: "expense",
  });

  const [toasts, setToasts] = createSignal<MutationToast[]>([]);

  // Composed Reactive Transaction List
  const transactions = createMemo<Transaction[]>(() => {
    const base = confirmedTransactions();
    const patches = optimisticPatches();
    const additions = optimisticAdditions();

    // 1. Apply patches to confirmed records
    const patched = base.map((t) => {
      const patchObj = patches.get(t.id);
      if (patchObj) {
        return { ...t, ...patchObj.patch };
      }
      return t;
    });

    // 2. Combine with optimistic additions
    const combined = [
      ...additions.map((a) => a.transaction),
      ...patched,
    ];

    // 3. Sort deterministically
    return combined.slice().sort(sortTransactions);
  });

  return {
    confirmedTransactions,
    setConfirmedTransactions,
    optimisticAdditions,
    setOptimisticAdditions,
    optimisticPatches,
    setOptimisticPatches,
    pendingIds,
    setPendingIds,
    isLoading,
    setIsLoading,
    error,
    setError,
    isInitialized,
    setIsInitialized,
    drawer,
    setDrawer,
    toasts,
    setToasts,
    transactions,
  };
});

export { transactions };
export const isTransactionsLoading = () => isLoading();
export const transactionsError = () => error();
export const drawerState = () => drawer();
export const mutationToasts = () => toasts();

export function isTransactionPending(id: string): boolean {
  return pendingIds().has(id);
}

// Drawer Controls
export function openCreateTransaction(initialType: TransactionType = "expense") {
  setDrawer({
    isOpen: true,
    mode: "create",
    editingId: null,
    initialType,
  });
}

export function openEditTransaction(id: string): boolean {
  if (isTransactionPending(id)) {
    return false;
  }
  const tx = transactions().find((t) => t.id === id);
  if (!tx) {
    return false;
  }
  setDrawer({
    isOpen: true,
    mode: "edit",
    editingId: id,
    initialType: tx.type || "expense",
  });
  return true;
}

export function closeDrawer() {
  setDrawer((prev) => ({
    ...prev,
    isOpen: false,
    editingId: null,
  }));
}

// Toast Helpers
function addToast(toast: MutationToast) {
  setToasts((prev) => [...prev, toast]);
}

export function removeToast(id: string) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

// Data Fetching & Sync
export async function initializeTransactions(force = false): Promise<void> {
  if (isInitialized() && !force) return;

  setIsLoading(true);
  setError(null);
  try {
    const data = await getTransactions();
    setConfirmedTransactions(data);
    setIsInitialized(true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load transactions";
    setError(msg);
    console.error("Failed to initialize transactions:", err);
  } finally {
    setIsLoading(false);
  }
}

export async function refreshTransactions(): Promise<void> {
  try {
    const data = await getTransactions();
    setConfirmedTransactions(data);
  } catch (err) {
    console.error("Failed to refresh transactions in background:", err);
  }
}

// Global Listener for external/AI/delete changes
let isListenerAttached = false;
export function setupTransactionListener() {
  if (typeof window === "undefined" || isListenerAttached) return;

  const handleDataChanged = () => {
    refreshTransactions();
  };

  window.addEventListener("finly:data-changed", handleDataChanged);
  isListenerAttached = true;
}

// Optimistic Add Mutation
export async function createTransactionOptimistically(
  params: AddTransactionParams,
  displayMeta: TransactionDisplayMeta,
): Promise<void> {
  const tempId = crypto.randomUUID();
  const dateStr = params.createdAt ? params.createdAt.toISOString() : new Date().toISOString();

  const tempTx: Transaction = {
    id: tempId,
    amount: params.amount,
    category: displayMeta.categoryName,
    categoryIcon: displayMeta.categoryIcon,
    categoryColor: displayMeta.categoryColor,
    categoryId: params.categoryId,
    name: params.name,
    accountName: displayMeta.accountName,
    accountColor: displayMeta.accountColor,
    accountId: params.accountId,
    type: params.type,
    date: dateStr,
    note: params.note || "",
    isRecurring: params.isRecurring,
  };

  const addition: OptimisticAddition = {
    tempId,
    transaction: tempTx,
    rawPayload: params,
    displayMeta,
  };

  // 1. Immediately apply overlay & mark pending
  batch(() => {
    setOptimisticAdditions((prev) => [addition, ...prev]);
    setPendingIds((prev) => new Set(prev).add(tempId));
  });

  // 2. Perform network request in background
  try {
    const rawResult = await addTransaction(params);
    const authoritative = mapTransactionDetail(rawResult);

    batch(() => {
      // Replace temporary addition with authoritative record in confirmed list
      setConfirmedTransactions((prev) => [authoritative, ...prev]);
      setOptimisticAdditions((prev) => prev.filter((a) => a.tempId !== tempId));
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    });
  } catch (err) {
    // 3. Rollback on failure
    batch(() => {
      setOptimisticAdditions((prev) => prev.filter((a) => a.tempId !== tempId));
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    });

    const errorMsg = err instanceof Error ? err.message : "Failed to save transaction";
    const toastId = crypto.randomUUID();

    addToast({
      id: toastId,
      message: `Failed to add "${params.name}": ${errorMsg}`,
      type: "error",
      retry: async () => {
        removeToast(toastId);
        await createTransactionOptimistically(params, displayMeta);
      },
      dismiss: () => removeToast(toastId),
    });
  }
}

// Optimistic Update Mutation
export async function updateTransactionOptimistically(
  params: UpdateTransactionParams,
  displayMeta: TransactionDisplayMeta,
): Promise<void> {
  const currentList = transactions();
  const original = currentList.find((t) => t.id === params.id);

  if (!original || isTransactionPending(params.id)) {
    return;
  }

  const patch: Partial<Transaction> = {
    amount: params.amount,
    category: displayMeta.categoryName,
    categoryIcon: displayMeta.categoryIcon,
    categoryColor: displayMeta.categoryColor,
    categoryId: params.categoryId,
    name: params.name,
    accountName: displayMeta.accountName,
    accountColor: displayMeta.accountColor,
    accountId: params.accountId,
    type: params.type,
    date: params.date instanceof Date ? params.date.toISOString() : String(params.date),
    note: params.note || "",
    isRecurring: params.isRecurring,
  };

  const patchObj: OptimisticPatch = {
    id: params.id,
    patch,
    original,
    rawPayload: params,
    displayMeta,
  };

  // 1. Immediately apply patch overlay & mark pending
  batch(() => {
    setOptimisticPatches((prev) => {
      const next = new Map(prev);
      next.set(params.id, patchObj);
      return next;
    });
    setPendingIds((prev) => new Set(prev).add(params.id));
  });

  // 2. Perform network request in background
  try {
    const rawResult = await updateTransaction(params);
    const authoritative = mapTransactionDetail(rawResult);

    batch(() => {
      // Replace confirmed item with authoritative result
      setConfirmedTransactions((prev) =>
        prev.map((t) => (t.id === params.id ? authoritative : t)),
      );
      setOptimisticPatches((prev) => {
        const next = new Map(prev);
        next.delete(params.id);
        return next;
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(params.id);
        return next;
      });
    });
  } catch (err) {
    // 3. Rollback on failure (removes patch overlay, restoring original snapshot)
    batch(() => {
      setOptimisticPatches((prev) => {
        const next = new Map(prev);
        next.delete(params.id);
        return next;
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(params.id);
        return next;
      });
    });

    const errorMsg = err instanceof Error ? err.message : "Failed to update transaction";
    const toastId = crypto.randomUUID();

    addToast({
      id: toastId,
      message: `Failed to update "${params.name}": ${errorMsg}`,
      type: "error",
      retry: async () => {
        removeToast(toastId);
        await updateTransactionOptimistically(params, displayMeta);
      },
      dismiss: () => removeToast(toastId),
    });
  }
}

// Reset store state (used for testing and user logout)
export function resetTransactionStore() {
  batch(() => {
    setConfirmedTransactions([]);
    setOptimisticAdditions([]);
    setOptimisticPatches(new Map());
    setPendingIds(new Set());
    setIsLoading(false);
    setError(null);
    setIsInitialized(false);
    setDrawer({
      isOpen: false,
      mode: "create",
      editingId: null,
      initialType: "expense",
    });
    setToasts([]);
  });
}
