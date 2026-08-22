import {
  createSignal,
  For,
  createResource,
  Show,
  createMemo,
  createEffect,
} from "solid-js";
import { state, setState } from "../../../store";
import {
  getCategories,
  getAccounts,
  addTransaction,
  addTransfer,
  getTransferHistory,
  deleteTransfer,
} from "../../../data/expenseData";
import CloseIcon from "@suid/icons-material/Close";
import CheckIcon from "@suid/icons-material/Check";
import LocalOfferIcon from "@suid/icons-material/LocalOfferOutlined";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import CalendarTodayIcon from "@suid/icons-material/CalendarTodayOutlined";
import NotesIcon from "@suid/icons-material/NotesOutlined";
import SyncIcon from "@suid/icons-material/Sync";
import RepeatIcon from "@suid/icons-material/Repeat";
import HistoryIcon from "@suid/icons-material/History";
import SwapHorizIcon from "@suid/icons-material/SwapHorizOutlined";
import ArrowForwardIcon from "@suid/icons-material/ArrowForwardOutlined";
import {
  formatIconName,
  formatNumericInput,
  formatRupiah,
  formatDateDetail,
} from "../../../utils/format";
import { ConfirmDeleteTransferModal } from "./ConfirmDeleteTransferModal";
import type { TransactionType, TransferRecord } from "../../../types";

const AddExpenseSlideOver = () => {
  // Form State
  const [amount, setAmount] = createSignal("");
  const [type, setType] = createSignal<"expense" | "income" | "transfer">("expense");
  const [merchant, setMerchant] = createSignal("");
  const [categoryId, setCategoryId] = createSignal("");
  const [accountId, setAccountId] = createSignal("");
  const [fromAccountId, setFromAccountId] = createSignal("");
  const [toAccountId, setToAccountId] = createSignal("");
  const [date, setDate] = createSignal(new Date().toISOString().split("T")[0]);
  const [note, setNote] = createSignal("");
  const [isRecurring, setIsRecurring] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [transferToDelete, setTransferToDelete] = createSignal<TransferRecord | null>(null);
  const [isDeletingTransfer, setIsDeletingTransfer] = createSignal(false);

  const handleConfirmDelete = async () => {
    const item = transferToDelete();
    if (!item) return;

    setIsDeletingTransfer(true);
    try {
      await deleteTransfer(item.transactionIds);
      await refetchTransfers();
      setTransferToDelete(null);
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete transfer:", err);
      alert("Failed to delete transfer. Please try again.");
    } finally {
      setIsDeletingTransfer(false);
    }
  };

  // Data Resources
  const [categories] = createResource(getCategories);
  const [accounts] = createResource(getAccounts);
  const [transferHistory, { refetch: refetchTransfers }] = createResource(
    () => (state.ui.showAddExpense ? true : false),
    async (shouldFetch) => {
      if (!shouldFetch) return [];
      return await getTransferHistory();
    },
  );

  // Suggestions (for regular expenses)
  const suggestions = [
    "Grabfood",
    "Parkir",
    "Bensin",
    "Sarapan",
    "Makan Siang",
    "Grabbike",
    "Indomaret",
  ];

  // Exclude 'Debt' and 'income' appropriately
  const filteredCategories = createMemo(() => {
    const cats = categories() || [];
    if (type() === "income") {
      return cats.filter((c) => c.name.toLowerCase() === "income");
    } else {
      return cats.filter(
        (c) =>
          c.name.toLowerCase() !== "income" &&
          c.name.toLowerCase() !== "debt",
      );
    }
  });

  // Default category handling
  createEffect(() => {
    const currentType = type();
    if (currentType === "transfer") return;

    const cats = categories() || [];
    if (cats.length === 0) return;

    if (currentType === "income") {
      const incomeCat = cats.find((c) => c.name.toLowerCase() === "income");
      if (incomeCat) setCategoryId(incomeCat.id);
    } else {
      const currentCatName = cats
        .find((c) => c.id === categoryId())
        ?.name.toLowerCase();
      if (!categoryId() || currentCatName === "income" || currentCatName === "debt") {
        const foodCat = cats.find((c) => c.name.toLowerCase() === "food");
        if (foodCat) setCategoryId(foodCat.id);
        else {
          const firstExpense = cats.find(
            (c) =>
              c.name.toLowerCase() !== "income" &&
              c.name.toLowerCase() !== "debt",
          );
          if (firstExpense) setCategoryId(firstExpense.id);
        }
      }
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
      } else if (accs.length === 1) {
        if (!fromAccountId()) setFromAccountId(accs[0].id);
      }
    }
  });

  const handleAdd = async (e: Event) => {
    e.preventDefault();

    if (type() === "transfer") {
      if (!amount() || !fromAccountId() || !toAccountId()) {
        alert("Please select source account, destination account, and amount.");
        return;
      }
      if (fromAccountId() === toAccountId()) {
        alert("Source and destination accounts must be different.");
        return;
      }

      setIsSubmitting(true);
      try {
        const [year, month, day] = date().split("-").map(Number);
        const transactionDate = new Date();
        transactionDate.setFullYear(year, month - 1, day);

        await addTransfer({
          fromAccountId: fromAccountId(),
          toAccountId: toAccountId(),
          amount: parseFloat(amount()),
          note: note(),
          createdAt: transactionDate,
        });

        resetForm();
        setState("ui", "showAddExpense", false);
        window.location.reload();
      } catch (error) {
        console.error("Failed to execute transfer:", error);
        alert("Failed to complete transfer. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Regular Income / Expense
    if (!amount() || !merchant() || !categoryId() || !accountId()) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const [year, month, day] = date().split("-").map(Number);
      const transactionDate = new Date();
      transactionDate.setFullYear(year, month - 1, day);

      await addTransaction({
        amount: parseFloat(amount()),
        name: merchant(),
        categoryId: categoryId(),
        accountId: accountId(),
        userId: selectedAccount()?.user_id,
        type: type() as TransactionType,
        note: note(),
        isRecurring: isRecurring(),
        createdAt: transactionDate,
      });

      // Reset and close
      resetForm();
      setState("ui", "showAddExpense", false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Failed to add transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setMerchant("");
    setCategoryId("");
    setAccountId("");
    setFromAccountId("");
    setToAccountId("");
    setNote("");
    setIsRecurring(false);
    setType("expense");
  };

  const selectedCategory = createMemo(() =>
    categories()?.find((c) => c.id === categoryId()),
  );

  const selectedAccount = createMemo(() =>
    accounts()?.find((a) => a.id === accountId()),
  );

  const selectedFromAccount = createMemo(() =>
    accounts()?.find((a) => a.id === fromAccountId()),
  );

  const selectedToAccount = createMemo(() =>
    accounts()?.find((a) => a.id === toAccountId()),
  );

  return (
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end"
      classList={{
        "pointer-events-auto": state.ui.showAddExpense,
        "pointer-events-none": !state.ui.showAddExpense,
      }}
    >
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-forest/40 transition-opacity duration-450 ease-[cubic-bezier(0.16,1,0.3,1)]"
        classList={{
          "opacity-100": state.ui.showAddExpense,
          "opacity-0": !state.ui.showAddExpense,
        }}
        onClick={() => setState("ui", "showAddExpense", false)}
      />

      {/* Panel: Bottom Sheet on Mobile, Slide-over on sm/desktop */}
      <div
        class="relative w-full sm:max-w-[440px] max-h-[92dvh] sm:max-h-none sm:h-dvh bg-white flex flex-col will-change-transform contain-content shadow-2xl rounded-t-3xl sm:rounded-t-none"
        style={{
          transform: state.ui.showAddExpense
            ? "translate3d(0, 0, 0)"
            : "translate3d(0, 100%, 0)",
          transition: "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Mobile Pull Indicator */}
        <div class="w-12 h-1.5 bg-forest/10 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div class="px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-forest/5">
          <div class="space-y-0.5 sm:space-y-1">
            <h3 class="text-xl sm:text-2xl font-cormorant font-bold text-forest">
              {type() === "transfer" ? "Inter-Account Transfer" : "New Transaction"}
            </h3>
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              {type() === "transfer"
                ? "Move funds between accounts"
                : "Tending to your garden"}
            </p>
          </div>
          <button
            onClick={() => setState("ui", "showAddExpense", false)}
            class="w-10 h-10 rounded-full flex items-center justify-center text-earth hover:bg-sage/20 transition-all cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={handleAdd}
          class="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 pb-32 will-change-scroll contain-paint overscroll-contain"
        >
          {/* Type Toggle: 3 Tabs */}
          <div class="flex p-1 bg-page-bg rounded-2xl border border-forest/5">
            <button
              type="button"
              onClick={() => setType("expense")}
              class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer ${
                type() === "expense"
                  ? "bg-white text-forest shadow-md"
                  : "text-earth hover:text-forest"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer ${
                type() === "income"
                  ? "bg-white text-spring shadow-md"
                  : "text-earth hover:text-spring"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("transfer")}
              class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                type() === "transfer"
                  ? "bg-white text-forest shadow-md"
                  : "text-earth hover:text-forest"
              }`}
            >
              <SwapHorizIcon sx={{ fontSize: 16 }} />
              Transfer
            </button>
          </div>

          {/* Amount Input */}
          <div class="space-y-2 group">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <span class="material-icons !text-[14px]">payments</span> Amount
            </label>
            <div class="relative group-focus-within:scale-[1.02] transition-transform duration-300 origin-left">
              <span class="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-outfit font-semibold text-forest/40">
                Rp
              </span>
              <input
                type="text"
                inputmode="numeric"
                placeholder="0"
                required
                value={formatNumericInput(amount())}
                onInput={(e) => {
                  const rawValue = e.currentTarget.value.replace(/\D/g, "");
                  setAmount(rawValue);
                }}
                class="w-full pl-8 pb-2 bg-transparent border-b-2 border-sage/30 focus:border-forest outline-none text-4xl font-outfit font-semibold text-forest transition-all placeholder:text-forest/10"
              />
            </div>
          </div>

          {/* ================= TRANSFER SPECIFIC FORM ================= */}
          <Show when={type() === "transfer"}>
            {/* From Account Selector */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> From Account (Source)
              </label>
              <div class="space-y-2">
                <Show
                  when={!accounts.loading}
                  fallback={<div class="h-12 bg-page-bg rounded-2xl animate-pulse" />}
                >
                  <For each={accounts()}>
                    {(acc) => (
                      <button
                        type="button"
                        onClick={() => {
                          setFromAccountId(acc.id);
                          if (toAccountId() === acc.id) {
                            const other = accounts()?.find((a) => a.id !== acc.id);
                            if (other) setToAccountId(other.id);
                          }
                        }}
                        class="w-full p-3 rounded-xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 cursor-pointer"
                        classList={{
                          "shadow-sm": fromAccountId() === acc.id,
                          "bg-page-bg border-forest/5 hover:border-forest/20":
                            fromAccountId() !== acc.id,
                        }}
                        style={{
                          "background-color":
                            fromAccountId() === acc.id
                              ? acc.color
                                ? acc.color + "15"
                                : "rgba(26,77,46,0.05)"
                              : "var(--color-page-bg)",
                          "border-color":
                            fromAccountId() === acc.id
                              ? acc.color || "var(--color-forest)"
                              : "rgba(26,77,46,0.05)",
                        }}
                      >
                        <div class="flex items-center gap-2.5">
                          <div
                            class="w-2.5 h-2.5 rounded-full"
                            style={{
                              "background-color": acc.color || "var(--color-forest)",
                            }}
                          />
                          <span
                            class="font-outfit text-xs font-semibold"
                            style={{
                              color:
                                fromAccountId() === acc.id
                                  ? acc.color || "var(--color-forest)"
                                  : "var(--color-earth)",
                            }}
                          >
                            {acc.name}
                          </span>
                        </div>
                        <Show when={fromAccountId() === acc.id}>
                          <div
                            class="w-4 h-4 rounded-full text-white flex items-center justify-center"
                            style={{
                              "background-color": acc.color || "var(--color-forest)",
                            }}
                          >
                            <CheckIcon sx={{ fontSize: 10 }} />
                          </div>
                        </Show>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* To Account Selector */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> To Account (Destination)
              </label>
              <div class="space-y-2">
                <Show
                  when={!accounts.loading}
                  fallback={<div class="h-12 bg-page-bg rounded-2xl animate-pulse" />}
                >
                  <For each={accounts()}>
                    {(acc) => {
                      const isSource = () => fromAccountId() === acc.id;
                      return (
                        <button
                          type="button"
                          disabled={isSource()}
                          onClick={() => setToAccountId(acc.id)}
                          class="w-full p-3 rounded-xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200"
                          classList={{
                            "opacity-40 cursor-not-allowed bg-page-bg/50": isSource(),
                            "cursor-pointer": !isSource(),
                            "shadow-sm": toAccountId() === acc.id && !isSource(),
                            "bg-page-bg border-forest/5 hover:border-forest/20":
                              toAccountId() !== acc.id && !isSource(),
                          }}
                          style={{
                            "background-color":
                              toAccountId() === acc.id && !isSource()
                                ? acc.color
                                  ? acc.color + "15"
                                  : "rgba(26,77,46,0.05)"
                                : undefined,
                            "border-color":
                              toAccountId() === acc.id && !isSource()
                                ? acc.color || "var(--color-forest)"
                                : undefined,
                          }}
                        >
                          <div class="flex items-center gap-2.5">
                            <div
                              class="w-2.5 h-2.5 rounded-full"
                              style={{
                                "background-color": acc.color || "var(--color-forest)",
                              }}
                            />
                            <span
                              class="font-outfit text-xs font-semibold"
                              style={{
                                color:
                                  toAccountId() === acc.id && !isSource()
                                    ? acc.color || "var(--color-forest)"
                                    : "var(--color-earth)",
                              }}
                            >
                              {acc.name}
                            </span>
                            <Show when={isSource()}>
                              <span class="text-[9px] text-earth/50 italic ml-1">
                                (Source)
                              </span>
                            </Show>
                          </div>
                          <Show when={toAccountId() === acc.id && !isSource()}>
                            <div
                              class="w-4 h-4 rounded-full text-white flex items-center justify-center"
                              style={{
                                "background-color": acc.color || "var(--color-forest)",
                              }}
                            >
                              <CheckIcon sx={{ fontSize: 10 }} />
                            </div>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </Show>
              </div>
            </div>

            {/* Date Picker */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <CalendarTodayIcon sx={{ fontSize: 14 }} /> Date
              </label>
              <input
                type="date"
                value={date()}
                onInput={(e) => setDate(e.currentTarget.value)}
                class="w-full p-3.5 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none cursor-pointer"
              />
            </div>

            {/* Note Input */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <NotesIcon sx={{ fontSize: 14 }} /> Note (Optional)
              </label>
              <textarea
                placeholder="Reason or reference for this transfer..."
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                class="w-full p-3.5 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-20"
              />
            </div>

            {/* Transfer History Section */}
            <div class="space-y-3 pt-4 border-t border-forest/10">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold font-outfit text-forest uppercase tracking-wider flex items-center gap-1.5">
                  <span class="material-icons !text-sm text-forest">history</span>
                  Transfer History
                </h4>
                <span class="text-[10px] text-earth/60 font-outfit">
                  {transferHistory()?.length || 0} Transfers
                </span>
              </div>

              <div class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                <Show
                  when={!transferHistory.loading}
                  fallback={
                    <div class="p-4 text-center text-xs text-earth/50">
                      Loading history...
                    </div>
                  }
                >
                  <Show
                    when={(transferHistory() || []).length > 0}
                    fallback={
                      <div class="p-6 text-center text-xs text-earth/40 bg-page-bg/50 rounded-xl">
                        No previous transfers recorded.
                      </div>
                    }
                  >
                    <For each={transferHistory()}>
                      {(item) => (
                        <div class="p-2.5 rounded-xl bg-forest/[0.03] border border-forest/5 flex items-center justify-between text-xs hover:bg-forest/[0.06] transition-colors group">
                          <div class="min-w-0 pr-2">
                            <div class="flex items-center gap-1 font-semibold text-forest text-xs truncate">
                              <span
                                class="truncate max-w-[75px]"
                                style={{ color: item.fromAccountColor || "#1A4D2E" }}
                              >
                                {item.fromAccountName}
                              </span>
                              <ArrowForwardIcon sx={{ fontSize: 12 }} class="text-earth/40 shrink-0" />
                              <span
                                class="truncate max-w-[75px]"
                                style={{ color: item.toAccountColor || "#1A4D2E" }}
                              >
                                {item.toAccountName}
                              </span>
                            </div>
                            <p class="text-[10px] text-earth/60 mt-0.5">
                              {new Date(item.date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div class="flex items-center gap-2 shrink-0">
                            <span class="font-bold text-forest font-outfit">
                              {formatRupiah(item.amount)}
                            </span>
                            <button
                              type="button"
                              title="Delete Transfer"
                              disabled={isDeletingTransfer()}
                              onClick={() => setTransferToDelete(item)}
                              class="w-6 h-6 rounded-lg flex items-center justify-center text-earth/40 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <span class="material-icons !text-[15px]">
                                delete_outline
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </Show>
              </div>
            </div>
          </Show>

          {/* ================= REGULAR EXPENSE / INCOME FORM ================= */}
          <Show when={type() !== "transfer"}>
            {/* Merchant / Name */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <LocalOfferIcon sx={{ fontSize: 14 }} /> Name / Merchant
              </label>
              <input
                type="text"
                placeholder="Where did you spend?"
                required
                value={merchant()}
                onInput={(e) => setMerchant(e.currentTarget.value)}
                class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
              />
              <div class="flex flex-wrap gap-2">
                <For each={suggestions}>
                  {(s) => (
                    <button
                      type="button"
                      onClick={() => setMerchant(s)}
                      class="px-3 py-1 bg-sage/40 border-forest/10 border text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-sage/40 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Category Selector */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <span class="material-icons !text-[14px]">category</span> Category
              </label>
              <div class="grid grid-cols-3 gap-3">
                <Show
                  when={!categories.loading}
                  fallback={
                    <For each={[1, 2, 3, 4, 5, 6]}>
                      {() => (
                        <div class="h-20 bg-page-bg rounded-2xl animate-pulse" />
                      )}
                    </For>
                  }
                >
                  <For each={filteredCategories()}>
                    {(cat) => (
                      <button
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        class="p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-[transform,colors,shadow] duration-200 group cursor-pointer"
                        classList={{
                          "border-transparent text-white shadow-xl scale-[1.05]":
                            categoryId() === cat.id,
                          "bg-white border-forest/10 text-forest hover:border-forest/30":
                            categoryId() !== cat.id,
                        }}
                        style={{
                          "background-color":
                            categoryId() === cat.id
                              ? cat.color || "var(--color-forest)"
                              : cat.color
                                ? cat.color + "15"
                                : "rgba(232, 245, 236, 0.5)",
                        }}
                      >
                        <span
                          class={`material-icons text-xl h-6 w-6 ${categoryId() === cat.id ? "text-white" : ""}`}
                          style={{
                            color:
                              categoryId() === cat.id
                                ? "white"
                                : cat.color || "var(--color-forest)",
                          }}
                        >
                          {formatIconName(cat.icon)}
                        </span>
                        <span
                          class="text-[10px] font-bold font-outfit uppercase tracking-tighter truncate w-full text-center"
                          style={{
                            color:
                              categoryId() === cat.id
                                ? "white"
                                : "var(--color-forest)",
                          }}
                        >
                          {cat.name}
                        </span>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* Account Selector */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> Account
              </label>
              <div class="space-y-2">
                <Show
                  when={!accounts.loading}
                  fallback={
                    <div class="h-12 bg-page-bg rounded-2xl animate-pulse" />
                  }
                >
                  <For each={accounts()}>
                    {(acc) => (
                      <button
                        type="button"
                        onClick={() => setAccountId(acc.id)}
                        class="w-full p-4 rounded-2xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 cursor-pointer"
                        classList={{
                          "shadow-sm": accountId() === acc.id,
                          "bg-page-bg border-forest/5 hover:border-forest/20":
                            accountId() !== acc.id,
                        }}
                        style={{
                          "background-color":
                            accountId() === acc.id
                              ? acc.color
                                ? acc.color + "15"
                                : "rgba(26,77,46,0.05)"
                              : "var(--color-page-bg)",
                          "border-color":
                            accountId() === acc.id
                              ? acc.color || "var(--color-forest)"
                              : "rgba(26,77,46,0.05)",
                        }}
                      >
                        <div class="flex items-center gap-3">
                          <div
                            class="w-2 h-2 rounded-full"
                            style={{
                              "background-color":
                                acc.color || "var(--color-forest)",
                            }}
                          />
                          <span
                            class={`font-outfit text-sm font-semibold`}
                            style={{
                              color:
                                accountId() === acc.id
                                  ? acc.color || "var(--color-forest)"
                                  : "var(--color-earth)",
                            }}
                          >
                            {acc.name}
                          </span>
                        </div>
                        <Show when={accountId() === acc.id}>
                          <div
                            class="w-5 h-5 rounded-full text-white flex items-center justify-center"
                            style={{
                              "background-color":
                                acc.color || "var(--color-forest)",
                            }}
                          >
                            <CheckIcon sx={{ fontSize: 12 }} />
                          </div>
                        </Show>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* Date & Note Row */}
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-3">
                <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarTodayIcon sx={{ fontSize: 14 }} /> Date
                </label>
                <input
                  type="date"
                  value={date()}
                  onInput={(e) => setDate(e.currentTarget.value)}
                  class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none cursor-pointer"
                />
              </div>
              <div class="space-y-3 flex flex-col">
                <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                  <SyncIcon sx={{ fontSize: 14 }} /> Is Recurring?
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring())}
                  class={`flex p-4 rounded-2xl border gap-2 transition-all font-outfit text-sm font-bold cursor-pointer ${
                    isRecurring()
                      ? "bg-spring/10 border-spring text-spring"
                      : "bg-page-bg border-forest/5 text-earth"
                  }`}
                >
                  <Show
                    when={isRecurring()}
                    fallback={<HistoryIcon sx={{ fontSize: 18 }} />}
                  >
                    <RepeatIcon sx={{ fontSize: 18 }} />
                  </Show>
                  {isRecurring() ? "Every Month" : "One-time"}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <NotesIcon sx={{ fontSize: 14 }} /> Note (Optional)
              </label>
              <textarea
                placeholder="What was this for? (e.g. Lunch with friends)"
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-24"
              />
            </div>
          </Show>
        </form>

        {/* Footer Actions */}
        <div class="absolute bottom-0 left-0 right-0 p-8 bg-white border-t border-forest/5">
          <button
            type="submit"
            onClick={handleAdd}
            disabled={isSubmitting()}
            class={`w-full h-16 rounded-2xl font-outfit font-bold flex items-center justify-center gap-3 transition-all shadow-2xl cursor-pointer ${
              isSubmitting()
                ? "bg-sage text-forest/40 cursor-not-allowed"
                : "bg-forest text-white hover:bg-mid-green shadow-forest/20 hover:-translate-y-1"
            }`}
          >
            <Show
              when={isSubmitting()}
              fallback={
                type() === "transfer" ? (
                  <>
                    <SwapHorizIcon /> Transfer Funds
                  </>
                ) : (
                  <>
                    <CheckIcon /> Add Transaction
                  </>
                )
              }
            >
              <div class="w-5 h-5 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
              Processing...
            </Show>
          </button>
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting Transfer */}
      <ConfirmDeleteTransferModal
        isOpen={!!transferToDelete()}
        transfer={transferToDelete()}
        isDeleting={isDeletingTransfer()}
        onClose={() => setTransferToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AddExpenseSlideOver;

