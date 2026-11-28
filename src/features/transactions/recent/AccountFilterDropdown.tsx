import { createSignal, For } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../components/ui";
import { setSelectedAccount, state } from "../../../store";
import type { AccountOption } from "./recentTransactionsHelpers";

interface AccountFilterDropdownProps {
  accounts: AccountOption[];
}

export const AccountFilterDropdown = (props: AccountFilterDropdownProps) => {
  const [open, setOpen] = createSignal(false);
  const selectedValue = () => state.ui.selectedAccount || "All Accounts";

  const handleSelectAccount = (accountName: string) => {
    const matched = props.accounts.find((acc) => acc.name === accountName);
    setSelectedAccount(
      accountName === "All Accounts" ? null : accountName,
      matched?.color ?? null,
    );
    setOpen(false);
  };

  return (
    <div class="relative shrink-0 min-w-0">
      <DropdownMenu
        open={open()}
        onOpenChange={setOpen}
        placement="bottom-end"
      >
        <DropdownMenuTrigger
          aria-label="Filter transactions by account"
          class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-200 cursor-pointer select-none group/acc hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 shrink-0 min-w-0"
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
            class="material-icons !text-[14px] shrink-0 transition-transform duration-200 group-data-[expanded]:rotate-180"
            style={{
              color: state.ui.selectedAccountColor || "var(--color-forest)",
            }}
          >
            expand_more
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent class="w-48 max-w-[calc(100vw-2rem)] p-1 flex flex-col gap-0.5">
          <DropdownMenuRadioGroup
            value={selectedValue()}
            onChange={handleSelectAccount}
            class="flex flex-col gap-0.5"
          >
            <For each={props.accounts}>
              {(acc) => {
                const isSelected = () =>
                  acc.name === "All Accounts"
                    ? !state.ui.selectedAccount
                    : state.ui.selectedAccount === acc.name;
                return (
                  <DropdownMenuRadioItem
                    value={acc.name}
                    closeOnSelect={true}
                    onSelect={() => setOpen(false)}
                    class="px-3 py-2 text-[11px] font-semibold text-left"
                    classList={{
                      "bg-forest/10 text-forest font-bold data-[highlighted]:bg-forest/15":
                        isSelected(),
                      "text-forest/80 hover:bg-forest/5 data-[highlighted]:bg-forest/5":
                        !isSelected(),
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
                    <DropdownMenuItemIndicator class="shrink-0 flex items-center">
                      <span class="material-icons !text-[14px] text-forest shrink-0">
                        check
                      </span>
                    </DropdownMenuItemIndicator>
                  </DropdownMenuRadioItem>
                );
              }}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
