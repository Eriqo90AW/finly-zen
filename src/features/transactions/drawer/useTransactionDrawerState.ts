import {
  createSignal,
  createResource,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import {
  drawerState,
  closeDrawer,
  transactions,
} from "../../../store/transactionStore";
import {
  getCategories,
  getAccounts,
  getTransferHistory,
} from "../../../data/expenseData";
import { getLocalYmd } from "../../../utils/date";
import type { TransferRecord } from "../../../types";
import {
  filterCategoriesByType,
  pickDefaultCategoryId,
  type DrawerFocusRefs,
  type DrawerTransactionType,
  type TransactionFormErrors,
} from "./drawerFormHelpers";
import {
  executeDeleteTransfer,
  executeRegularSubmit,
  executeTransferSubmit,
} from "./drawerSubmitActions";

export type { DrawerFocusRefs };

export function useTransactionDrawerState(refs: DrawerFocusRefs) {
  const drawer = drawerState;
  const isOpen = () => drawer().isOpen;
  const isEditMode = () => drawer().mode === "edit";
  const editingId = () => drawer().editingId;

  const [amount, setAmount] = createSignal("");
  const [type, setType] = createSignal<DrawerTransactionType>("expense");
  const [merchant, setMerchant] = createSignal("");
  const [categoryId, setCategoryId] = createSignal("");
  const [accountId, setAccountId] = createSignal("");
  const [fromAccountId, setFromAccountId] = createSignal("");
  const [toAccountId, setToAccountId] = createSignal("");
  const [date, setDate] = createSignal(getLocalYmd(new Date()));
  const [originalIso, setOriginalIso] = createSignal<string | undefined>(
    undefined,
  );
  const [note, setNote] = createSignal("");
  const [isRecurring, setIsRecurring] = createSignal(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = createSignal(false);
  const [transferToDelete, setTransferToDelete] =
    createSignal<TransferRecord | null>(null);
  const [isDeletingTransfer, setIsDeletingTransfer] = createSignal(false);
  const [errors, setErrors] = createSignal<TransactionFormErrors>({});

  let previousActiveElement: HTMLElement | null = null;

  const [categories] = createResource(getCategories);
  const [accounts] = createResource(getAccounts);
  const [transferHistory, { refetch: refetchTransfers }] = createResource(
    () => isOpen() && type() === "transfer",
    async (shouldFetch) => {
      if (!shouldFetch) return [];
      return await getTransferHistory();
    },
  );

  const editingTransaction = createMemo(() => {
    const id = editingId();
    if (!id) return null;
    return transactions().find((t) => t.id === id) || null;
  });

  // Handle opening and prefilling
  createEffect(() => {
    if (isOpen()) {
      previousActiveElement = document.activeElement as HTMLElement | null;
      setErrors({});

      const tx = editingTransaction();
      if (isEditMode() && tx) {
        setAmount(String(tx.amount || ""));
        setType(tx.type || "expense");
        setMerchant(tx.name || "");
        setDate(getLocalYmd(tx.date));
        setOriginalIso(tx.date);
        setIsRecurring(Boolean(tx.isRecurring));
        setNote(tx.note || "");

        const cats = categories() || [];
        if (tx.categoryId) {
          setCategoryId(tx.categoryId);
        } else {
          const match = cats.find(
            (c) => c.name.toLowerCase() === tx.category?.toLowerCase(),
          );
          if (match) setCategoryId(match.id);
        }

        const accs = accounts() || [];
        if (tx.accountId) {
          setAccountId(tx.accountId);
        } else {
          const match = accs.find(
            (a) => a.name.toLowerCase() === tx.accountName?.toLowerCase(),
          );
          if (match) setAccountId(match.id);
        }
      } else {
        setAmount("");
        setType(drawer().initialType || "expense");
        setMerchant("");
        setDate(getLocalYmd(new Date()));
        setOriginalIso(undefined);
        setNote("");
        setIsRecurring(false);
        setFromAccountId("");
        setToAccountId("");
      }

      setTimeout(() => {
        refs.getAmountInput()?.focus();
      }, 50);
    } else if (
      previousActiveElement &&
      typeof previousActiveElement.focus === "function"
    ) {
      previousActiveElement.focus();
    }
  });

  // Category Auto-Selection in Create mode
  createEffect(() => {
    const currentType = type();
    if (currentType === "transfer" || isEditMode()) return;
    const nextId = pickDefaultCategoryId(
      categories() || [],
      currentType,
      categoryId(),
    );
    if (nextId) setCategoryId(nextId);
  });

  // Account Auto-Selection in Create mode
  createEffect(() => {
    if (isEditMode()) return;
    const accs = accounts() || [];
    if (accs.length > 0 && !accountId()) {
      setAccountId(accs[0].id);
    }
  });

  // Default from/to accounts when entering transfer mode
  createEffect(() => {
    if (type() === "transfer") {
      const accs = accounts() || [];
      if (accs.length >= 2) {
        if (!fromAccountId()) setFromAccountId(accs[0].id);
        if (!toAccountId() || toAccountId() === accs[0].id) {
          setToAccountId(accs[1].id);
        }
      } else if (accs.length === 1 && !fromAccountId()) {
        setFromAccountId(accs[0].id);
      }
    }
  });

  // Escape key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopPropagation();
      closeDrawer();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  }

  const filteredCategories = createMemo(() =>
    filterCategoriesByType(categories() || [], type()),
  );

  const selectedCategory = createMemo(() =>
    categories()?.find((c) => c.id === categoryId()),
  );

  const selectedAccount = createMemo(() =>
    accounts()?.find((a) => a.id === accountId()),
  );

  const handleConfirmDeleteTransfer = async () => {
    const item = transferToDelete();
    if (!item) return;
    await executeDeleteTransfer({
      item,
      setIsDeleting: setIsDeletingTransfer,
      refetchTransfers,
      clearTransferToDelete: () => setTransferToDelete(null),
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (type() === "transfer") {
      await executeTransferSubmit({
        amount: amount(),
        fromAccountId: fromAccountId(),
        toAccountId: toAccountId(),
        date: date(),
        note: note(),
        setErrors,
        setIsSubmitting: setIsSubmittingTransfer,
        refs,
      });
      return;
    }

    executeRegularSubmit({
      amount: amount(),
      merchant: merchant(),
      categoryId: categoryId(),
      accountId: accountId(),
      type: type(),
      date: date(),
      originalIso: originalIso(),
      note: note(),
      isRecurring: isRecurring(),
      isEditMode: isEditMode(),
      editingId: editingId(),
      selectedCategory: selectedCategory(),
      selectedAccount: selectedAccount(),
      setErrors,
      refs,
    });
  };

  return {
    isOpen,
    isEditMode,
    amount,
    setAmount,
    type,
    setType,
    merchant,
    setMerchant,
    categoryId,
    setCategoryId,
    accountId,
    setAccountId,
    fromAccountId,
    setFromAccountId,
    toAccountId,
    setToAccountId,
    date,
    setDate,
    note,
    setNote,
    isRecurring,
    setIsRecurring,
    isSubmittingTransfer,
    transferToDelete,
    setTransferToDelete,
    isDeletingTransfer,
    errors,
    setErrors,
    categories,
    accounts,
    transferHistory,
    filteredCategories,
    handleConfirmDeleteTransfer,
    handleSubmit,
  };
}
