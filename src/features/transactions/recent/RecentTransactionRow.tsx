import { Show } from "solid-js";
import type { Transaction } from "../../../types";
import {
  openEditTransaction,
  isTransactionPending,
} from "../../../store/transactionStore";
import {
  formatIconName,
  formatRupiah,
  formatDateDetail,
} from "../../../utils/format";

interface RecentTransactionRowProps {
  transaction: Transaction;
  onRequestDelete: (t: Transaction) => void;
}

export const RecentTransactionRow = (props: RecentTransactionRowProps) => {
  const isPending = () => isTransactionPending(props.transaction.id);

  return (
    <tr
      tabIndex={isPending() ? -1 : 0}
      onClick={() => !isPending() && openEditTransaction(props.transaction.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isPending()) {
          e.preventDefault();
          openEditTransaction(props.transaction.id);
        }
      }}
      class="group hover:bg-page-bg transition-all cursor-pointer select-none"
      classList={{
        "opacity-70 bg-forest/[0.02]": isPending(),
      }}
    >
      <td class="pl-3.5 sm:pl-6 pr-1.5 sm:pr-4 py-2.5 sm:py-4 border-l-3 border-transparent group-hover:border-spring min-w-0">
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap min-w-0">
            <p class="font-semibold text-xs sm:text-sm text-forest leading-snug truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
              {props.transaction.name}
            </p>
            <Show when={props.transaction.isRecurring}>
              <span
                class="material-icons !text-[13px] sm:!text-[14px] text-spring shrink-0"
                title="Recurring Transaction"
              >
                autorenew
              </span>
            </Show>
            <Show when={isPending()}>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                <span class="w-2 h-2 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                Saving…
              </span>
            </Show>
          </div>

          {/* Mobile details: Category, Account, Date */}
          <div class="sm:hidden flex items-center gap-1.5 flex-wrap text-[10px] text-earth/70">
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
              style={{
                "background-color": props.transaction.categoryColor
                  ? `${props.transaction.categoryColor}15`
                  : "rgba(232, 245, 236, 0.5)",
                color: props.transaction.categoryColor || "var(--color-forest)",
              }}
            >
              <Show when={formatIconName(props.transaction.categoryIcon)}>
                <span class="material-icons !text-[11px] shrink-0">
                  {formatIconName(props.transaction.categoryIcon)}
                </span>
              </Show>
              <span class="truncate max-w-[80px]">
                {props.transaction.category}
              </span>
            </span>

            <Show when={props.transaction.accountName}>
              <span
                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                style={{
                  "background-color": props.transaction.accountColor
                    ? `${props.transaction.accountColor}15`
                    : "rgba(82, 194, 120, 0.1)",
                  color:
                    props.transaction.accountColor || "var(--color-mid-green)",
                }}
              >
                {props.transaction.accountName}
              </span>
            </Show>

            <span class="text-[10px] text-earth/60 shrink-0">
              {formatDateDetail(props.transaction.date)}
            </span>
          </div>
        </div>
      </td>

      <td class="hidden sm:table-cell px-6 py-4">
        <div class="flex items-center gap-2">
          <span
            class="pl-2 pr-3 py-1 text-[12px] rounded-md font-medium flex items-center gap-1.5 whitespace-nowrap"
            style={{
              "background-color": props.transaction.categoryColor
                ? `${props.transaction.categoryColor}15`
                : "rgba(232, 245, 236, 0.3)",
              color: props.transaction.categoryColor || "var(--color-forest)",
            }}
          >
            <Show when={formatIconName(props.transaction.categoryIcon)}>
              <span class="material-icons !text-[16px] w-4 h-4 flex items-center justify-center">
                {formatIconName(props.transaction.categoryIcon)}
              </span>
            </Show>
            {props.transaction.category}
          </span>
        </div>
      </td>

      <td class="hidden sm:table-cell px-6 py-4">
        <span
          class="px-2 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest whitespace-nowrap"
          style={{
            "background-color": props.transaction.accountColor
              ? `${props.transaction.accountColor}15`
              : "rgba(82, 194, 120, 0.1)",
            color: props.transaction.accountColor || "var(--color-mid-green)",
          }}
        >
          {props.transaction.accountName}
        </span>
      </td>

      <td class="hidden sm:table-cell px-6 py-4 text-earth">
        {formatDateDetail(props.transaction.date)}
      </td>

      <td
        class="px-1.5 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-xs sm:text-sm whitespace-nowrap w-px sm:w-auto"
        classList={{
          "text-red-600": props.transaction.type?.toLowerCase() === "expense",
          "text-green-600": props.transaction.type?.toLowerCase() === "income",
          "text-forest": !["expense", "income"].includes(
            props.transaction.type?.toLowerCase() || "",
          ),
        }}
      >
        {props.transaction.type?.toLowerCase() === "income"
          ? "+"
          : props.transaction.type?.toLowerCase() === "expense"
            ? "-"
            : ""}
        {formatRupiah(props.transaction.amount)}
      </td>

      <td class="pr-3.5 sm:pr-6 pl-1 sm:pl-4 py-2.5 sm:py-4 w-20 sm:w-24 text-center">
        <div
          class="flex items-center justify-center gap-1 sm:gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={isPending()}
            onClick={(e) => {
              e.stopPropagation();
              openEditTransaction(props.transaction.id);
            }}
            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-earth/60 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Edit transaction"
            aria-label={`Edit ${props.transaction.name}`}
          >
            <span class="material-icons !text-[15px] sm:!text-[16px]">
              edit
            </span>
          </button>
          <button
            type="button"
            disabled={isPending()}
            onClick={(e) => {
              e.stopPropagation();
              props.onRequestDelete(props.transaction);
            }}
            class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-earth/60 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete transaction"
            aria-label={`Delete ${props.transaction.name}`}
          >
            <span class="material-icons !text-[15px] sm:!text-[16px]">
              delete_outline
            </span>
          </button>
        </div>
      </td>
    </tr>
  );
};
