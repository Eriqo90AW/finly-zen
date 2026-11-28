import { For, Show } from "solid-js";
import { formatIconName } from "../../../utils/format";
import type { CategoryOption } from "./recentTransactionsHelpers";

interface CategoryFilterDropdownProps {
  categories: CategoryOption[];
  selectedCategories: Set<string>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleCategory: (category: string) => void;
  onClear: () => void;
}

export const CategoryFilterDropdown = (props: CategoryFilterDropdownProps) => {
  return (
    <div class="relative filter-dropdown-container shrink-0">
      <button
        type="button"
        class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none group/filter hover:shadow-sm shrink-0"
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
        onClick={props.onToggleOpen}
        aria-expanded={props.isOpen}
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
        <span
          class="material-icons !text-[14px] shrink-0 transition-transform duration-200 text-forest"
          classList={{
            "rotate-180": props.isOpen,
          }}
        >
          expand_more
        </span>
      </button>

      <Show when={props.isOpen}>
        <div
          class="absolute right-0 mt-1.5 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-forest/10 p-2 z-40 flex flex-col gap-1 animate-slide-down"
          onClick={(e) => e.stopPropagation()}
        >
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
                onClick={(e) => {
                  e.stopPropagation();
                  props.onClear();
                }}
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
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer text-left group"
                    classList={{
                      "bg-forest/10 text-forest font-bold": isSelected(),
                      "text-forest/80 hover:bg-forest/5": !isSelected(),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onToggleCategory(cat.name);
                    }}
                  >
                    <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                      <div
                        class="w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0"
                        classList={{
                          "bg-forest border-forest text-white": isSelected(),
                          "border-forest/30 bg-white group-hover:border-forest/60":
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
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};
