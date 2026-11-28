import { For, Show } from "solid-js";
import CheckIcon from "@suid/icons-material/Check";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import type { Account, Category } from "../../../types";
import { formatIconName } from "../../../utils/format";
import type { TransactionFormErrors } from "./drawerFormHelpers";

interface CategoryAccountPickersProps {
  categories: Category[];
  categoriesLoading: boolean;
  categoryId: string;
  accounts: Account[];
  accountsLoading: boolean;
  accountId: string;
  errors: TransactionFormErrors;
  onSelectCategory: (id: string) => void;
  onSelectAccount: (id: string) => void;
  onCategoryContainerRef: (el: HTMLDivElement) => void;
  onAccountContainerRef: (el: HTMLDivElement) => void;
}

export const CategoryAccountPickers = (props: CategoryAccountPickersProps) => {
  return (
    <>
      {/* Category Selector */}
      <div ref={props.onCategoryContainerRef} class="space-y-1.5">
        <span class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
          <span class="material-icons !text-[14px]">category</span> Category
        </span>
        <div class="grid grid-cols-3 gap-3">
          <Show
            when={!props.categoriesLoading}
            fallback={
              <For each={[1, 2, 3, 4, 5, 6]}>
                {() => (
                  <div class="h-20 bg-page-bg rounded-2xl animate-pulse" />
                )}
              </For>
            }
          >
            <For each={props.categories}>
              {(cat) => {
                const isSelected = () => props.categoryId === cat.id;
                return (
                  <button
                    type="button"
                    onClick={() => props.onSelectCategory(cat.id)}
                    class="p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-[transform,colors,shadow] duration-200 group cursor-pointer min-h-[44px]"
                    classList={{
                      "border-transparent text-white shadow-xl scale-[1.05]":
                        isSelected(),
                      "bg-white border-forest/10 text-forest hover:border-forest/30":
                        !isSelected(),
                    }}
                    style={{
                      "background-color": isSelected()
                        ? cat.color || "var(--color-forest)"
                        : cat.color
                          ? `${cat.color}15`
                          : "rgba(232, 245, 236, 0.5)",
                    }}
                  >
                    <span
                      class={`material-icons text-xl h-6 w-6 ${isSelected() ? "text-white" : ""}`}
                      style={{
                        color: isSelected()
                          ? "white"
                          : cat.color || "var(--color-forest)",
                      }}
                    >
                      {formatIconName(cat.icon)}
                    </span>
                    <span
                      class="text-[10px] font-bold font-outfit uppercase tracking-tighter truncate w-full text-center"
                      style={{
                        color: isSelected() ? "white" : "var(--color-forest)",
                      }}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              }}
            </For>
          </Show>
        </div>
        <Show when={props.errors.categoryId}>
          <p class="text-xs text-rose-600 font-medium">
            {props.errors.categoryId}
          </p>
        </Show>
      </div>

      {/* Account Selector */}
      <div ref={props.onAccountContainerRef} class="space-y-1.5">
        <span class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
          <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> Account
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
                const isSelected = () => props.accountId === acc.id;
                return (
                  <button
                    type="button"
                    onClick={() => props.onSelectAccount(acc.id)}
                    class="w-full p-4 rounded-2xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 cursor-pointer min-h-[44px]"
                    classList={{
                      "shadow-sm": isSelected(),
                      "bg-page-bg border-forest/5 hover:border-forest/20":
                        !isSelected(),
                    }}
                    style={{
                      "background-color": isSelected()
                        ? acc.color
                          ? `${acc.color}15`
                          : "rgba(26,77,46,0.05)"
                        : "var(--color-page-bg)",
                      "border-color": isSelected()
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
                        class="font-outfit text-sm font-semibold"
                        style={{
                          color: isSelected()
                            ? acc.color || "var(--color-forest)"
                            : "var(--color-earth)",
                        }}
                      >
                        {acc.name}
                      </span>
                    </div>
                    <Show when={isSelected()}>
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
                );
              }}
            </For>
          </Show>
        </div>
        <Show when={props.errors.accountId}>
          <p class="text-xs text-rose-600 font-medium">
            {props.errors.accountId}
          </p>
        </Show>
      </div>
    </>
  );
};
