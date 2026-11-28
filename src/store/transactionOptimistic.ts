import type {
  Transaction,
  TransactionType,
  AddTransactionParams,
  UpdateTransactionParams,
} from "../types";

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

export interface OptimisticAddition {
  tempId: string;
  transaction: Transaction;
  rawPayload: AddTransactionParams;
  displayMeta: TransactionDisplayMeta;
}

export interface OptimisticPatch {
  id: string;
  patch: Partial<Transaction>;
  original: Transaction;
  rawPayload: UpdateTransactionParams;
  displayMeta: TransactionDisplayMeta;
}

export const INITIAL_DRAWER_STATE: DrawerState = {
  isOpen: false,
  mode: "create",
  editingId: null,
  initialType: "expense",
};

// Deterministic comparator: primary = date desc, secondary = id desc
export function sortTransactions(a: Transaction, b: Transaction): number {
  const timeA = new Date(a.date).getTime();
  const timeB = new Date(b.date).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return (b.id || "").localeCompare(a.id || "");
}

export function composeTransactions(
  confirmed: Transaction[],
  patches: Map<string, OptimisticPatch>,
  additions: OptimisticAddition[],
): Transaction[] {
  const patched = confirmed.map((t) => {
    const patchObj = patches.get(t.id);
    if (patchObj) {
      return { ...t, ...patchObj.patch };
    }
    return t;
  });

  const combined = [...additions.map((a) => a.transaction), ...patched];
  return combined.slice().sort(sortTransactions);
}

export function buildOptimisticTransaction(
  tempId: string,
  params: AddTransactionParams,
  displayMeta: TransactionDisplayMeta,
): Transaction {
  const dateStr = params.createdAt
    ? params.createdAt.toISOString()
    : new Date().toISOString();

  return {
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
}

export function buildOptimisticPatch(
  params: UpdateTransactionParams,
  displayMeta: TransactionDisplayMeta,
): Partial<Transaction> {
  return {
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
    date:
      params.date instanceof Date
        ? params.date.toISOString()
        : String(params.date),
    note: params.note || "",
    isRecurring: params.isRecurring,
  };
}

export function addIdToSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.add(id);
  return next;
}

export function removeIdFromSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.delete(id);
  return next;
}

export function setMapEntry<K, V>(
  prev: Map<K, V>,
  key: K,
  value: V,
): Map<K, V> {
  const next = new Map(prev);
  next.set(key, value);
  return next;
}

export function deleteMapEntry<K, V>(prev: Map<K, V>, key: K): Map<K, V> {
  const next = new Map(prev);
  next.delete(key);
  return next;
}

export function createErrorToast(
  message: string,
  onRetry: () => Promise<void>,
  onRemove: (id: string) => void,
): MutationToast {
  const toastId = crypto.randomUUID();
  return {
    id: toastId,
    message,
    type: "error",
    retry: async () => {
      onRemove(toastId);
      await onRetry();
    },
    dismiss: () => onRemove(toastId),
  };
}
