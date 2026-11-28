import { Show } from "solid-js";
import EditIcon from "@suid/icons-material/EditOutlined";
import { openEditTransaction, isTransactionPending } from "../../store/transactionStore";
import { formatRupiah, formatIconName } from "../../utils/format";
import type { Transaction } from "../../types";

interface TransactionLedgerRowProps {
  transaction: Transaction;
}

export const TransactionLedgerRow = (props: TransactionLedgerRowProps) => {
  const isPending = () => isTransactionPending(props.transaction.id);

  return (
    <div
      role="button"
      tabIndex={isPending() ? -1 : 0}
      onClick={() => !isPending() && openEditTransaction(props.transaction.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isPending()) {
          e.preventDefault();
          openEditTransaction(props.transaction.id);
        }
      }}
      class="premium-card p-4 flex items-center justify-between group cursor-pointer hover:border-spring transition-all select-none"
      classList={{
        "opacity-75 bg-forest/[0.02]": isPending(),
      }}
    >
      <div class="flex items-center gap-4 min-w-0 pr-4">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{
            "background-color": props.transaction.categoryColor
              ? `${props.transaction.categoryColor}20`
              : "rgba(232, 245, 236, 0.5)",
            color: props.transaction.categoryColor || "var(--color-forest)",
          }}
        >
          <span
            class="material-icons !text-[20px] !leading-none w-5 h-5 text-center"
            aria-hidden="true"
          >
            {formatIconName(props.transaction.categoryIcon) || "receipt_long"}
          </span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-outfit font-semibold text-forest leading-none truncate">
              {props.transaction.name}
            </p>
            <Show when={props.transaction.isRecurring}>
              <span
                class="material-icons text-[14px] text-spring"
                title="Recurring"
              >
                autorenew
              </span>
            </Show>
          </div>
          <p class="text-xs text-earth mt-1 truncate">
            {props.transaction.note || props.transaction.category}
            <Show when={props.transaction.accountName}>
              <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-forest/5 text-forest/70">
                {props.transaction.accountName}
              </span>
            </Show>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4 shrink-0">
        <div class="text-right">
          <p
            class="font-outfit font-bold"
            classList={{
              "text-emerald-600": props.transaction.type === "income",
              "text-rose-600": props.transaction.type === "expense",
              "text-forest": !props.transaction.type,
            }}
          >
            {props.transaction.type === "income"
              ? "+"
              : props.transaction.type === "expense"
                ? "-"
                : ""}
            {formatRupiah(props.transaction.amount)}
          </p>
          <Show
            when={isPending()}
            fallback={
              <p class="text-[10px] text-earth uppercase tracking-widest">
                Confirmed
              </p>
            }
          >
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              <span class="w-2 h-2 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
              Saving…
            </span>
          </Show>
        </div>

        <button
          type="button"
          disabled={isPending()}
          onClick={(e) => {
            e.stopPropagation();
            openEditTransaction(props.transaction.id);
          }}
          class="w-8 h-8 rounded-xl text-earth/50 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 min-h-[32px]"
          title="Edit transaction"
          aria-label={`Edit ${props.transaction.name}`}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
};
