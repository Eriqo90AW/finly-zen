import { For, Show } from "solid-js";
import CheckIcon from "@suid/icons-material/Check";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import CalendarTodayIcon from "@suid/icons-material/CalendarTodayOutlined";
import NotesIcon from "@suid/icons-material/NotesOutlined";
import type { Account, TransferRecord } from "../../../types";
import type { TransactionFormErrors } from "./drawerFormHelpers";
import { TransferHistoryList } from "./TransferHistoryList";

interface TransferFormSectionProps {
  accounts: Account[];
  accountsLoading: boolean;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  note: string;
  errors: TransactionFormErrors;
  transferHistory: TransferRecord[];
  transferHistoryLoading: boolean;
  isDeletingTransfer: boolean;
  onSelectFromAccount: (id: string) => void;
  onSelectToAccount: (id: string) => void;
  onDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onRequestDeleteTransfer: (record: TransferRecord) => void;
}

export const TransferFormSection = (props: TransferFormSectionProps) => {
  return (
    <>
      {/* From Account Selector */}
      <div class="space-y-3">
        <span class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
          <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> From Account
          (Source)
        </span>
        <div class="space-y-2">
          <Show
            when={!props.accountsLoading}
            fallback={
              <div class="h-12 bg-page-bg rounded-2xl animate-pulse" />
            }
          >
            <For each={props.accounts}>
              {(acc) => (
                <button
                  type="button"
                  onClick={() => props.onSelectFromAccount(acc.id)}
                  class="w-full p-3 rounded-xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 cursor-pointer min-h-[44px]"
                  classList={{
                    "shadow-sm": props.fromAccountId === acc.id,
                    "bg-page-bg border-forest/5 hover:border-forest/20":
                      props.fromAccountId !== acc.id,
                  }}
                  style={{
                    "background-color":
                      props.fromAccountId === acc.id
                        ? acc.color
                          ? `${acc.color}15`
                          : "rgba(26,77,46,0.05)"
                        : "var(--color-page-bg)",
                    "border-color":
                      props.fromAccountId === acc.id
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
                          props.fromAccountId === acc.id
                            ? acc.color || "var(--color-forest)"
                            : "var(--color-earth)",
                      }}
                    >
                      {acc.name}
                    </span>
                  </div>
                  <Show when={props.fromAccountId === acc.id}>
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
        <Show when={props.errors.fromAccountId}>
          <p class="text-xs text-rose-600 font-medium">
            {props.errors.fromAccountId}
          </p>
        </Show>
      </div>

      {/* To Account Selector */}
      <div class="space-y-3">
        <span class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
          <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> To Account
          (Destination)
        </span>
        <div class="space-y-2">
          <Show
            when={!props.accountsLoading}
            fallback={
              <div class="h-12 bg-page-bg rounded-2xl animate-pulse" />
            }
          >
            <For each={props.accounts}>
              {(acc) => {
                const isSource = () => props.fromAccountId === acc.id;
                const isSelected = () =>
                  props.toAccountId === acc.id && !isSource();
                return (
                  <button
                    type="button"
                    disabled={isSource()}
                    onClick={() => props.onSelectToAccount(acc.id)}
                    class="w-full p-3 rounded-xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 min-h-[44px]"
                    classList={{
                      "opacity-40 cursor-not-allowed bg-page-bg/50": isSource(),
                      "cursor-pointer": !isSource(),
                      "shadow-sm": isSelected(),
                      "bg-page-bg border-forest/5 hover:border-forest/20":
                        !isSelected() && !isSource(),
                    }}
                    style={{
                      "background-color": isSelected()
                        ? acc.color
                          ? `${acc.color}15`
                          : "rgba(26,77,46,0.05)"
                        : undefined,
                      "border-color": isSelected()
                        ? acc.color || "var(--color-forest)"
                        : undefined,
                    }}
                  >
                    <div class="flex items-center gap-2.5">
                      <div
                        class="w-2.5 h-2.5 rounded-full"
                        style={{
                          "background-color":
                            acc.color || "var(--color-forest)",
                        }}
                      />
                      <span
                        class="font-outfit text-xs font-semibold"
                        style={{
                          color: isSelected()
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
                    <Show when={isSelected()}>
                      <div
                        class="w-4 h-4 rounded-full text-white flex items-center justify-center"
                        style={{
                          "background-color":
                            acc.color || "var(--color-forest)",
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
        <Show when={props.errors.toAccountId}>
          <p class="text-xs text-rose-600 font-medium">
            {props.errors.toAccountId}
          </p>
        </Show>
      </div>

      {/* Date Picker */}
      <div class="space-y-3">
        <label
          for="transfer-date-input"
          class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
        >
          <CalendarTodayIcon sx={{ fontSize: 14 }} /> Date
        </label>
        <input
          id="transfer-date-input"
          type="date"
          value={props.date}
          onInput={(e) => props.onDateChange(e.currentTarget.value)}
          class="w-full p-3.5 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none cursor-pointer"
        />
      </div>

      {/* Note Input */}
      <div class="space-y-3">
        <label
          for="transfer-note-input"
          class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5"
        >
          <NotesIcon sx={{ fontSize: 14 }} /> Note (Optional)
        </label>
        <textarea
          id="transfer-note-input"
          placeholder="Reason or reference for this transfer..."
          value={props.note}
          onInput={(e) => props.onNoteChange(e.currentTarget.value)}
          class="w-full p-3.5 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-20"
        />
      </div>

      <TransferHistoryList
        items={props.transferHistory}
        loading={props.transferHistoryLoading}
        isDeleting={props.isDeletingTransfer}
        onRequestDelete={props.onRequestDeleteTransfer}
      />
    </>
  );
};
