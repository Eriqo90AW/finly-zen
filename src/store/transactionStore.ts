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
import {
  INITIAL_DRAWER_STATE,
  sortTransactions,
  composeTransactions,
  buildOptimisticTransaction,
  buildOptimisticPatch,
  addIdToSet,
  removeIdFromSet,
  setMapEntry,
  deleteMapEntry,
  createErrorToast,
  type TransactionDisplayMeta,
  type DrawerState,
  type MutationToast,
  type OptimisticAddition,
  type OptimisticPatch,
} from "./transactionOptimistic";

export {
  sortTransactions,
  type TransactionDisplayMeta,
  type DrawerState,
  type MutationToast,
};

// Internal Signals & Reactive State wrapped in createRoot to avoid rootless computation warnings
const {
  setConfirmedTransactions,
  setOptimisticAdditions,
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
  const [confirmedTransactions, setConfirmedTransactions] = createSignal<
    Transaction[]
  >([]);
  const [optimisticAdditions, setOptimisticAdditions] = createSignal<
    OptimisticAddition[]
  >([]);
  const [optimisticPatches, setOptimisticPatches] = createSignal<
    Map<string, OptimisticPatch>
  >(new Map());
  const [pendingIds, setPendingIds] = createSignal<Set<string>>(new Set());

  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);

  const [drawer, setDrawer] = createSignal<DrawerState>({
    ...INITIAL_DRAWER_STATE,
  });

  const [toasts, setToasts] = createSignal<MutationToast[]>([]);

  const transactions = createMemo<Transaction[]>(() =>
    composeTransactions(
      confirmedTransactions(),
      optimisticPatches(),
      optimisticAdditions(),
    ),
  );

  return {
    setConfirmedTransactions,
    setOptimisticAdditions,
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
export function openCreateTransaction(
  initialType: TransactionType = "expense",
) {
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
    const msg =
      err instanceof Error ? err.message : "Failed to load transactions";
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
    setError(null);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to refresh transactions",
    );
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
  const addition: OptimisticAddition = {
    tempId,
    transaction: buildOptimisticTransaction(tempId, params, displayMeta),
    rawPayload: params,
    displayMeta,
  };

  batch(() => {
    setOptimisticAdditions((prev) => [addition, ...prev]);
    setPendingIds((prev) => addIdToSet(prev, tempId));
  });

  try {
    const rawResult = await addTransaction(params);
    const authoritative = mapTransactionDetail(rawResult);

    batch(() => {
      setConfirmedTransactions((prev) => [authoritative, ...prev]);
      setOptimisticAdditions((prev) => prev.filter((a) => a.tempId !== tempId));
      setPendingIds((prev) => removeIdFromSet(prev, tempId));
    });
  } catch (err) {
    batch(() => {
      setOptimisticAdditions((prev) => prev.filter((a) => a.tempId !== tempId));
      setPendingIds((prev) => removeIdFromSet(prev, tempId));
    });

    const errorMsg =
      err instanceof Error ? err.message : "Failed to save transaction";
    addToast(
      createErrorToast(
        `Failed to add "${params.name}": ${errorMsg}`,
        () => createTransactionOptimistically(params, displayMeta),
        removeToast,
      ),
    );
  }
}

// Optimistic Update Mutation
export async function updateTransactionOptimistically(
  params: UpdateTransactionParams,
  displayMeta: TransactionDisplayMeta,
): Promise<void> {
  const original = transactions().find((t) => t.id === params.id);
  if (!original || isTransactionPending(params.id)) {
    return;
  }

  const patchObj: OptimisticPatch = {
    id: params.id,
    patch: buildOptimisticPatch(params, displayMeta),
    original,
    rawPayload: params,
    displayMeta,
  };

  batch(() => {
    setOptimisticPatches((prev) => setMapEntry(prev, params.id, patchObj));
    setPendingIds((prev) => addIdToSet(prev, params.id));
  });

  try {
    const rawResult = await updateTransaction(params);
    const authoritative = mapTransactionDetail(rawResult);

    batch(() => {
      setConfirmedTransactions((prev) =>
        prev.map((t) => (t.id === params.id ? authoritative : t)),
      );
      setOptimisticPatches((prev) => deleteMapEntry(prev, params.id));
      setPendingIds((prev) => removeIdFromSet(prev, params.id));
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("finly:data-changed", {
          detail: { source: "update_transaction", id: params.id },
        }),
      );
    }
  } catch (err) {
    batch(() => {
      setOptimisticPatches((prev) => deleteMapEntry(prev, params.id));
      setPendingIds((prev) => removeIdFromSet(prev, params.id));
    });

    const errorMsg =
      err instanceof Error ? err.message : "Failed to update transaction";
    addToast(
      createErrorToast(
        `Failed to update "${params.name}": ${errorMsg}`,
        () => updateTransactionOptimistically(params, displayMeta),
        removeToast,
      ),
    );
  }
}

// Reset store state (used for testing and user logout)
export function resetTransactionStore() {
  batch(() => {
    setConfirmedTransactions([]);
    setOptimisticAdditions([]);
    setOptimisticPatches(new Map());
    setPendingIds(new Set<string>());
    setIsLoading(false);
    setError(null);
    setIsInitialized(false);
    setDrawer({ ...INITIAL_DRAWER_STATE });
    setToasts([]);
  });
}
