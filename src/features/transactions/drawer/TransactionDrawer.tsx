import { Show } from "solid-js";
import CloseIcon from "@suid/icons-material/Close";
import CheckIcon from "@suid/icons-material/Check";
import SwapHorizIcon from "@suid/icons-material/SwapHorizOutlined";
import EditIcon from "@suid/icons-material/EditOutlined";
import { closeDrawer } from "../../../store/transactionStore";
import { formatNumericInput } from "../../../utils/format";
import { ConfirmDeleteTransferModal } from "./ConfirmDeleteTransferModal";
import { TransferFormSection } from "./TransferFormSection";
import { RegularTransactionFields } from "./RegularTransactionFields";
import { useTransactionDrawerState } from "./useTransactionDrawerState";

export const TransactionDrawer = () => {
  let amountInputRef: HTMLInputElement | undefined;
  let merchantInputRef: HTMLInputElement | undefined;
  let categoryContainerRef: HTMLDivElement | undefined;
  let accountContainerRef: HTMLDivElement | undefined;

  const form = useTransactionDrawerState({
    getAmountInput: () => amountInputRef,
    getMerchantInput: () => merchantInputRef,
    getCategoryContainer: () => categoryContainerRef,
    getAccountContainer: () => accountContainerRef,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-drawer-title"
      class="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end"
      classList={{
        "pointer-events-auto": form.isOpen(),
        "pointer-events-none": !form.isOpen(),
      }}
    >
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-forest/40 transition-opacity duration-450 ease-[cubic-bezier(0.16,1,0.3,1)]"
        classList={{
          "opacity-100": form.isOpen(),
          "opacity-0": !form.isOpen(),
        }}
        onClick={closeDrawer}
      />

      {/* Panel: Bottom Sheet on Mobile, Slide-over on sm/desktop */}
      <div
        class="relative w-full sm:max-w-[440px] max-h-[92dvh] sm:max-h-none sm:h-dvh bg-white flex flex-col will-change-transform contain-content shadow-2xl rounded-t-3xl sm:rounded-t-none"
        style={{
          transform: form.isOpen()
            ? "translate3d(0, 0, 0)"
            : "translate3d(0, 100%, 0)",
          transition: "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Mobile Pull Indicator */}
        <div class="w-12 h-1.5 bg-forest/10 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div class="px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-forest/5 shrink-0">
          <div class="space-y-0.5 sm:space-y-1">
            <h3
              id="transaction-drawer-title"
              class="text-xl sm:text-2xl font-cormorant font-bold text-forest"
            >
              {form.type() === "transfer"
                ? "Inter-Account Transfer"
                : form.isEditMode()
                  ? "Edit Transaction"
                  : "New Transaction"}
            </h3>
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              {form.type() === "transfer"
                ? "Move funds between accounts"
                : form.isEditMode()
                  ? "Update transaction details"
                  : "Tending to your garden"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close transaction editor"
            class="w-10 h-10 rounded-full flex items-center justify-center text-earth hover:bg-sage/20 transition-all cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit}
          class="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6 sm:space-y-8 pb-32 will-change-scroll contain-paint overscroll-contain"
        >
          {/* Type Toggle: 3 Tabs */}
          <div class="flex p-1 bg-page-bg rounded-2xl border border-forest/5">
            <button
              type="button"
              onClick={() => form.setType("expense")}
              class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer ${
                form.type() === "expense"
                  ? "bg-white text-forest shadow-md"
                  : "text-earth hover:text-forest"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => form.setType("income")}
              class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer ${
                form.type() === "income"
                  ? "bg-white text-spring shadow-md"
                  : "text-earth hover:text-spring"
              }`}
            >
              Income
            </button>
            <Show when={!form.isEditMode()}>
              <button
                type="button"
                onClick={() => {
                  form.setType("transfer");
                  form.setErrors({});
                }}
                class={`flex-1 py-2.5 rounded-xl font-outfit text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  form.type() === "transfer"
                    ? "bg-white text-forest shadow-md"
                    : "text-earth hover:text-forest"
                }`}
              >
                <SwapHorizIcon sx={{ fontSize: 16 }} /> Transfer
              </button>
            </Show>
          </div>

          {/* Amount Input */}
          <div class="space-y-1.5 group">
            <label
              for="transaction-amount-input"
              class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
            >
              <span class="material-icons !text-[14px]">payments</span> Amount
            </label>
            <div class="relative group-focus-within:scale-[1.01] transition-transform duration-300 origin-left">
              <span class="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-outfit font-semibold text-forest/40">
                Rp
              </span>
              <input
                id="transaction-amount-input"
                ref={(el) => {
                  amountInputRef = el;
                }}
                type="text"
                inputmode="numeric"
                placeholder="0"
                value={formatNumericInput(form.amount())}
                onInput={(e) => {
                  const rawValue = e.currentTarget.value.replace(/\D/g, "");
                  form.setAmount(rawValue);
                  if (form.errors().amount) {
                    form.setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                class="w-full pl-8 pb-2 bg-transparent border-b-2 border-sage/30 focus:border-forest outline-none text-4xl font-outfit font-semibold text-forest transition-all placeholder:text-forest/10"
                classList={{
                  "border-rose-400": !!form.errors().amount,
                }}
              />
            </div>
            <Show when={form.errors().amount}>
              <p class="text-xs text-rose-600 font-medium pt-1 animate-fade-in">
                {form.errors().amount}
              </p>
            </Show>
          </div>

          <Show when={form.type() === "transfer"}>
            <TransferFormSection
              accounts={form.accounts() || []}
              accountsLoading={form.accounts.loading}
              fromAccountId={form.fromAccountId()}
              toAccountId={form.toAccountId()}
              date={form.date()}
              note={form.note()}
              errors={form.errors()}
              transferHistory={form.transferHistory() || []}
              transferHistoryLoading={form.transferHistory.loading}
              isDeletingTransfer={form.isDeletingTransfer()}
              onSelectFromAccount={(id) => {
                form.setFromAccountId(id);
                if (form.toAccountId() === id) {
                  const other = form.accounts()?.find((a) => a.id !== id);
                  if (other) form.setToAccountId(other.id);
                }
                form.setErrors((prev) => ({
                  ...prev,
                  fromAccountId: undefined,
                }));
              }}
              onSelectToAccount={(id) => {
                form.setToAccountId(id);
                form.setErrors((prev) => ({
                  ...prev,
                  toAccountId: undefined,
                }));
              }}
              onDateChange={form.setDate}
              onNoteChange={form.setNote}
              onRequestDeleteTransfer={form.setTransferToDelete}
            />
          </Show>

          <Show when={form.type() !== "transfer"}>
            <RegularTransactionFields
              type={form.type()}
              merchant={form.merchant()}
              categoryId={form.categoryId()}
              accountId={form.accountId()}
              date={form.date()}
              isRecurring={form.isRecurring()}
              note={form.note()}
              categories={form.filteredCategories()}
              categoriesLoading={form.categories.loading}
              accounts={form.accounts() || []}
              accountsLoading={form.accounts.loading}
              errors={form.errors()}
              onMerchantChange={(val) => {
                form.setMerchant(val);
                if (form.errors().merchant) {
                  form.setErrors((prev) => ({ ...prev, merchant: undefined }));
                }
              }}
              onSelectCategory={(id) => {
                form.setCategoryId(id);
                form.setErrors((prev) => ({ ...prev, categoryId: undefined }));
              }}
              onSelectAccount={(id) => {
                form.setAccountId(id);
                form.setErrors((prev) => ({ ...prev, accountId: undefined }));
              }}
              onDateChange={form.setDate}
              onToggleRecurring={() => form.setIsRecurring((v) => !v)}
              onNoteChange={form.setNote}
              onMerchantInputRef={(el) => {
                merchantInputRef = el;
              }}
              onCategoryContainerRef={(el) => {
                categoryContainerRef = el;
              }}
              onAccountContainerRef={(el) => {
                accountContainerRef = el;
              }}
            />
          </Show>
        </form>

        {/* Footer Actions */}
        <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-white border-t border-forest/5">
          <button
            type="submit"
            onClick={form.handleSubmit}
            disabled={form.isSubmittingTransfer()}
            class="w-full h-14 sm:h-16 rounded-2xl font-outfit font-bold flex items-center justify-center gap-3 transition-all shadow-2xl cursor-pointer min-h-[44px] bg-forest text-white hover:bg-mid-green shadow-forest/20 hover:-translate-y-0.5 active:translate-y-0"
            classList={{
              "bg-sage text-forest/40 cursor-not-allowed":
                form.isSubmittingTransfer(),
            }}
          >
            <Show
              when={form.isSubmittingTransfer()}
              fallback={
                form.type() === "transfer" ? (
                  <>
                    <SwapHorizIcon /> Transfer Funds
                  </>
                ) : form.isEditMode() ? (
                  <>
                    <EditIcon sx={{ fontSize: 18 }} /> Save Changes
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

      <ConfirmDeleteTransferModal
        isOpen={!!form.transferToDelete()}
        transfer={form.transferToDelete()}
        isDeleting={form.isDeletingTransfer()}
        onClose={() => form.setTransferToDelete(null)}
        onConfirm={form.handleConfirmDeleteTransfer}
      />
    </div>
  );
};

export default TransactionDrawer;
