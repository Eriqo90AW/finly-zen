import { For, Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../components/ui";
import { formatIconName } from "../../../utils/format";
import type { CategoryOption } from "./recentTransactionsHelpers";

interface CategoryFilterDropdownProps {
  categories: CategoryOption[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onClear: () => void;
}

export const CategoryFilterDropdown = (props: CategoryFilterDropdownProps) => {
  return (
    <div class="relative shrink-0">
      <DropdownMenu placement="bottom-end">
        <DropdownMenuTrigger
          aria-label="Filter transactions by category"
          class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none group/filter hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 shrink-0"
          style={{
            ...(props.selectedCategories.size > 0
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
          <span
            class="material-icons !text-[13px] shrink-0"
            style={{
              color:
                props.selectedCategories.size > 0
                  ? "var(--color-forest)"
                  : "var(--color-mid-green)",
            }}
          >
            filter_list
          </span>
          <span
            class="text-[10px] font-bold uppercase tracking-wider sm:tracking-widest"
            classList={{
              "text-forest font-black": props.selectedCategories.size > 0,
              "text-forest/70": props.selectedCategories.size === 0,
            }}
          >
            Filters
          </span>
          <Show when={props.selectedCategories.size > 0}>
            <span
              class="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-[8px] sm:text-[9px] font-bold shrink-0"
              style={{
                "background-color": "var(--color-forest)",
                color: "#ffffff",
              }}
            >
              {props.selectedCategories.size}
            </span>
          </Show>
          <span class="material-icons !text-[14px] shrink-0 transition-transform duration-200 text-forest group-data-[expanded]:rotate-180">
            expand_more
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent class="w-56 sm:w-60 max-w-[calc(100vw-2rem)] p-2 flex flex-col gap-1">
          <div class="flex items-center justify-between px-2 py-1 border-b border-forest/10 mb-0.5">
            <span class="text-[10px] font-bold uppercase tracking-widest text-forest">
              Categories ({props.categories.length})
            </span>
            <Show
              when={props.selectedCategories.size > 0}
              fallback={
                <span class="text-[9px] text-earth/50 italic">All shown</span>
              }
            >
              <button
                type="button"
                class="text-[10px] font-bold text-earth/60 hover:text-red-500 transition-colors cursor-pointer"
                onClick={props.onClear}
              >
                Clear
              </button>
            </Show>
          </div>

          <div class="max-h-60 overflow-y-auto custom-scrollbar-thin flex flex-col gap-0.5 pr-0.5">
            <For each={props.categories}>
              {(cat) => {
                const isSelected = () => props.selectedCategories.has(cat.name);
                return (
                  <DropdownMenuCheckboxItem
                    checked={isSelected()}
                    onChange={() => props.onToggleCategory(cat.name)}
                    closeOnSelect={false}
                    class="px-2.5 py-1.5 text-[11px] font-semibold text-left group/item"
                    classList={{
                      "bg-forest/10 text-forest font-bold data-[highlighted]:bg-forest/15":
                        isSelected(),
                      "text-forest/80 hover:bg-forest/5 data-[highlighted]:bg-forest/5":
                        !isSelected(),
                    }}
                  >
                    <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                      <div
                        class="w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0"
                        classList={{
                          "bg-forest border-forest text-white": isSelected(),
                          "border-forest/30 bg-white group-hover/item:border-forest/60":
                            !isSelected(),
                        }}
                      >
                        <span
                          class="material-icons !text-[11px] font-bold transition-opacity"
                          classList={{
                            "opacity-100": isSelected(),
                            "opacity-0": !isSelected(),
                          }}
                        >
                          check
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 min-w-0">
                        <Show
                          when={formatIconName(cat.icon)}
                          fallback={
                            <span
                              class="w-2 h-2 rounded-full shrink-0"
                              style={{
                                "background-color":
                                  cat.color || "var(--color-mid-green)",
                              }}
                            />
                          }
                        >
                          <span
                            class="material-icons !text-[13px] shrink-0"
                            style={{
                              color: cat.color || "var(--color-forest)",
                            }}
                          >
                            {formatIconName(cat.icon)}
                          </span>
                        </Show>
                        <span class="truncate">{cat.name}</span>
                      </div>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              }}
            </For>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
