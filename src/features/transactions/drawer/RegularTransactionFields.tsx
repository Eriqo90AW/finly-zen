import { For, Show } from "solid-js";
import LocalOfferIcon from "@suid/icons-material/LocalOfferOutlined";
import CalendarTodayIcon from "@suid/icons-material/CalendarTodayOutlined";
import NotesIcon from "@suid/icons-material/NotesOutlined";
import SyncIcon from "@suid/icons-material/Sync";
import RepeatIcon from "@suid/icons-material/Repeat";
import HistoryIcon from "@suid/icons-material/History";
import type { Account, Category } from "../../../types";
import {
  EXPENSE_SUGGESTIONS,
  type DrawerTransactionType,
  type TransactionFormErrors,
} from "./drawerFormHelpers";
import { CategoryAccountPickers } from "./CategoryAccountPickers";

interface RegularTransactionFieldsProps {
  type: DrawerTransactionType;
  merchant: string;
  categoryId: string;
  accountId: string;
  date: string;
  isRecurring: boolean;
  note: string;
  categories: Category[];
  categoriesLoading: boolean;
  accounts: Account[];
  accountsLoading: boolean;
  errors: TransactionFormErrors;
  onMerchantChange: (value: string) => void;
  onSelectCategory: (id: string) => void;
  onSelectAccount: (id: string) => void;
  onDateChange: (value: string) => void;
  onToggleRecurring: () => void;
  onNoteChange: (value: string) => void;
  onMerchantInputRef: (el: HTMLInputElement) => void;
  onCategoryContainerRef: (el: HTMLDivElement) => void;
  onAccountContainerRef: (el: HTMLDivElement) => void;
}

export const RegularTransactionFields = (
  props: RegularTransactionFieldsProps,
) => {
  return (
    <>
      {/* Merchant / Name */}
      <div class="space-y-1.5">
        <label
          for="transaction-name-input"
          class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
        >
          <LocalOfferIcon sx={{ fontSize: 14 }} /> Name / Merchant
        </label>
        <input
          id="transaction-name-input"
          ref={props.onMerchantInputRef}
          type="text"
          placeholder={
            props.type === "income"
              ? "e.g. Salary, Client project"
              : "Where did you spend?"
          }
          value={props.merchant}
          onInput={(e) => props.onMerchantChange(e.currentTarget.value)}
          class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
          classList={{
            "border-rose-400": !!props.errors.merchant,
          }}
        />
        <Show when={props.errors.merchant}>
          <p class="text-xs text-rose-600 font-medium">
            {props.errors.merchant}
          </p>
        </Show>
        <Show when={props.type === "expense"}>
          <div class="flex flex-wrap gap-2 pt-1">
            <For each={EXPENSE_SUGGESTIONS}>
              {(suggestion) => (
                <button
                  type="button"
                  onClick={() => props.onMerchantChange(suggestion)}
                  class="px-3 py-1 bg-sage/40 border-forest/10 border text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-sage/50 transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      <CategoryAccountPickers
        categories={props.categories}
        categoriesLoading={props.categoriesLoading}
        categoryId={props.categoryId}
        accounts={props.accounts}
        accountsLoading={props.accountsLoading}
        accountId={props.accountId}
        errors={props.errors}
        onSelectCategory={props.onSelectCategory}
        onSelectAccount={props.onSelectAccount}
        onCategoryContainerRef={props.onCategoryContainerRef}
        onAccountContainerRef={props.onAccountContainerRef}
      />

      {/* Date & Recurring Row */}
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label
            for="transaction-date-input"
            class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
          >
            <CalendarTodayIcon sx={{ fontSize: 14 }} /> Date
          </label>
          <input
            id="transaction-date-input"
            type="date"
            value={props.date}
            onInput={(e) => props.onDateChange(e.currentTarget.value)}
            class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none cursor-pointer min-h-[44px]"
          />
        </div>
        <div class="space-y-1.5 flex flex-col">
          <span class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
            <SyncIcon sx={{ fontSize: 14 }} /> Is Recurring?
          </span>
          <button
            type="button"
            onClick={props.onToggleRecurring}
            class="flex p-4 rounded-2xl border gap-2 transition-all font-outfit text-sm font-bold cursor-pointer min-h-[44px] items-center justify-center"
            classList={{
              "bg-spring/10 border-spring text-spring": props.isRecurring,
              "bg-page-bg border-forest/5 text-earth": !props.isRecurring,
            }}
          >
            <Show
              when={props.isRecurring}
              fallback={<HistoryIcon sx={{ fontSize: 18 }} />}
            >
              <RepeatIcon sx={{ fontSize: 18 }} />
            </Show>
            {props.isRecurring ? "Every Month" : "One-time"}
          </button>
        </div>
      </div>

      {/* Notes */}
      <div class="space-y-1.5">
        <label
          for="transaction-note-input"
          class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
        >
          <NotesIcon sx={{ fontSize: 14 }} /> Note (Optional)
        </label>
        <textarea
          id="transaction-note-input"
          placeholder="What was this for? (e.g. Lunch with friends)"
          value={props.note}
          onInput={(e) => props.onNoteChange(e.currentTarget.value)}
          class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-24"
        />
      </div>
    </>
  );
};
