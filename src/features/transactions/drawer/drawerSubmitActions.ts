import {
  closeDrawer,
  createTransactionOptimistically,
  updateTransactionOptimistically,
  type TransactionDisplayMeta,
} from "../../../store/transactionStore";
import { addTransfer, deleteTransfer } from "../../../data/expenseData";
import { composeDateWithTime } from "../../../utils/date";
import type {
  Account,
  Category,
  TransactionType,
  TransferRecord,
} from "../../../types";
import {
  validateRegularForm,
  validateTransferForm,
  type DrawerFocusRefs,
  type DrawerTransactionType,
  type TransactionFormErrors,
} from "./drawerFormHelpers";

export async function executeDeleteTransfer(params: {
  item: TransferRecord;
  setIsDeleting: (v: boolean) => void;
  refetchTransfers: () => Promise<unknown> | unknown;
  clearTransferToDelete: () => void;
}): Promise<void> {
  params.setIsDeleting(true);
  try {
    await deleteTransfer(params.item.transactionIds);
    await params.refetchTransfers();
    params.clearTransferToDelete();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("finly:data-changed", {
          detail: {
            source: "delete_transfer",
            ids: params.item.transactionIds,
          },
        }),
      );
    }
  } catch (err) {
    console.error("Failed to delete transfer:", err);
    alert("Failed to delete transfer. Please try again.");
  } finally {
    params.setIsDeleting(false);
  }
}

export async function executeTransferSubmit(params: {
  amount: string;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  note: string;
  setErrors: (errors: TransactionFormErrors) => void;
  setIsSubmitting: (v: boolean) => void;
  refs: DrawerFocusRefs;
}): Promise<void> {
  const newErrors = validateTransferForm({
    amount: params.amount,
    fromAccountId: params.fromAccountId,
    toAccountId: params.toAccountId,
  });

  if (Object.keys(newErrors).length > 0) {
    params.setErrors(newErrors);
    if (newErrors.amount) params.refs.getAmountInput()?.focus();
    return;
  }

  params.setIsSubmitting(true);
  try {
    const transactionDate = composeDateWithTime(params.date);
    await addTransfer({
      fromAccountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      amount: Number.parseFloat(params.amount),
      note: params.note,
      createdAt: transactionDate,
    });

    closeDrawer();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("finly:data-changed", {
          detail: { source: "add_transfer" },
        }),
      );
    }
  } catch (error) {
    console.error("Failed to execute transfer:", error);
    alert("Failed to complete transfer. Please try again.");
  } finally {
    params.setIsSubmitting(false);
  }
}

export function executeRegularSubmit(params: {
  amount: string;
  merchant: string;
  categoryId: string;
  accountId: string;
  type: DrawerTransactionType;
  date: string;
  originalIso: string | undefined;
  note: string;
  isRecurring: boolean;
  isEditMode: boolean;
  editingId: string | null;
  selectedCategory: Category | undefined;
  selectedAccount: Account | undefined;
  setErrors: (errors: TransactionFormErrors) => void;
  refs: DrawerFocusRefs;
}): void {
  const newErrors = validateRegularForm({
    amount: params.amount,
    merchant: params.merchant,
    categoryId: params.categoryId,
    accountId: params.accountId,
  });

  if (Object.keys(newErrors).length > 0) {
    params.setErrors(newErrors);
    if (newErrors.amount) params.refs.getAmountInput()?.focus();
    else if (newErrors.merchant) params.refs.getMerchantInput()?.focus();
    else if (newErrors.categoryId) {
      params.refs.getCategoryContainer()?.scrollIntoView({ behavior: "smooth" });
    } else if (newErrors.accountId) {
      params.refs.getAccountContainer()?.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  const parsedAmount = Number.parseFloat(params.amount);
  const displayMeta: TransactionDisplayMeta = {
    categoryName: params.selectedCategory?.name || "General",
    categoryIcon: params.selectedCategory?.icon,
    categoryColor: params.selectedCategory?.color,
    accountName: params.selectedAccount?.name || "Main",
    accountColor: params.selectedAccount?.color,
  };

  if (params.isEditMode && params.editingId) {
    const transactionDate = composeDateWithTime(
      params.date,
      params.originalIso,
    );
    const payload = {
      id: params.editingId,
      amount: parsedAmount,
      name: params.merchant.trim(),
      categoryId: params.categoryId,
      accountId: params.accountId,
      userId: params.selectedAccount?.user_id,
      type: params.type as TransactionType,
      note: params.note.trim(),
      isRecurring: params.isRecurring,
      date: transactionDate,
    };

    closeDrawer();
    updateTransactionOptimistically(payload, displayMeta);
    return;
  }

  const transactionDate = composeDateWithTime(params.date);
  const payload = {
    amount: parsedAmount,
    name: params.merchant.trim(),
    categoryId: params.categoryId,
    accountId: params.accountId,
    userId: params.selectedAccount?.user_id,
    type: params.type as TransactionType,
    note: params.note.trim(),
    isRecurring: params.isRecurring,
    createdAt: transactionDate,
  };

  closeDrawer();
  createTransactionOptimistically(payload, displayMeta);
}
