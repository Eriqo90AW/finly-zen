import { For, Show } from "solid-js";
import { state, setSelectedAccount } from "../../../store";
import type { AccountOption } from "./recentTransactionsHelpers";

interface AccountFilterDropdownProps {
  accounts: AccountOption[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const AccountFilterDropdown = (props: AccountFilterDropdownProps) => {
  return (
    <div class="relative account-dropdown-container shrink-0 min-w-0">
      <button
        type="button"
        class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-200 cursor-pointer select-none group/acc hover:shadow-sm shrink-0 min-w-0"
        style={{
          ...(state.ui.selectedAccountColor
            ? {
                "background-color": `${state.ui.selectedAccountColor}20`,
                "border-color": `${state.ui.selectedAccountColor}45`,
              }
            : state.ui.selectedAccount
              ? {
                  "background-color": "rgba(82, 194, 120, 0.15)",
                  "border-color": "rgba(82, 194, 120, 0.35)",
                }
              : {
                  "background-color": "rgba(44, 74, 56, 0.05)",
                  "border-color": "rgba(44, 74, 56, 0.1)",
                }),
        }}
        onClick={props.onToggle}
        aria-expanded={props.isOpen}
      >
        <div class="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span
            class="material-icons !text-[13px] shrink-0"
            style={{
              color:
                state.ui.selectedAccountColor ||
                (state.ui.selectedAccount
                  ? "var(--color-forest)"
                  : "var(--color-mid-green)"),
            }}
          >
            account_balance_wallet
          </span>
          <span
            class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest shrink-0"
            style={{
              color: state.ui.selectedAccountColor || undefined,
            }}
            classList={{
              "text-earth":
                !state.ui.selectedAccountColor && !state.ui.selectedAccount,
              "text-forest":
                !state.ui.selectedAccountColor && !!state.ui.selectedAccount,
            }}
          >
            Account:
          </span>
          <span
            class="text-[10px] font-bold uppercase tracking-wider sm:tracking-widest truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[150px] md:max-w-none text-left"
            style={{
              color: state.ui.selectedAccountColor || undefined,
            }}
            classList={{
              "text-forest font-black":
                !state.ui.selectedAccountColor && !!state.ui.selectedAccount,
              "text-forest/70":
                !state.ui.selectedAccountColor && !state.ui.selectedAccount,
            }}
          >
            {state.ui.selectedAccount ? (
              state.ui.selectedAccount
            ) : (
              <>
                <span class="sm:hidden">Accounts</span>
                <span class="hidden sm:inline">All Accounts</span>
              </>
            )}
          </span>
        </div>
        <span
          class="material-icons !text-[14px] shrink-0 transition-transform duration-200"
          classList={{
            "rotate-180": props.isOpen,
          }}
          style={{
            color: state.ui.selectedAccountColor || "var(--color-forest)",
          }}
        >
          expand_more
        </span>
      </button>

      <Show when={props.isOpen}>
        <div class="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-1.5 w-48 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-1 z-40 flex flex-col gap-0.5 animate-slide-down">
          <For each={props.accounts}>
            {(acc) => {
              const isSelected = () =>
                acc.name === "All Accounts"
                  ? !state.ui.selectedAccount
                  : state.ui.selectedAccount === acc.name;
              return (
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer text-left"
                  classList={{
                    "bg-forest/10 text-forest font-bold": isSelected(),
                    "text-forest/80 hover:bg-forest/5": !isSelected(),
                  }}
                  onClick={() => {
                    setSelectedAccount(
                      acc.name === "All Accounts" ? null : acc.name,
                      acc.color ?? null,
                    );
                    props.onClose();
                  }}
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full border border-forest/20 shrink-0"
                      style={{
                        "background-color":
                          acc.color || "var(--color-mid-green)",
                      }}
                    />
                    <span class="truncate">{acc.name}</span>
                  </div>
                  <Show when={isSelected()}>
                    <span class="material-icons !text-[14px] text-forest shrink-0">
                      check
                    </span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
