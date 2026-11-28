import { For, Show } from "solid-js";
import { SORT_OPTIONS, type SortOption } from "./dividendListHelpers";

interface DividendSortDropdownProps {
  sortBy: SortOption;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (option: SortOption) => void;
}

export const DividendSortDropdown = (props: DividendSortDropdownProps) => {
  const shortLabel = () =>
    SORT_OPTIONS.find((opt) => opt.key === props.sortBy)?.shortLabel ?? "Newest";

  return (
    <div class="relative sort-dropdown-container">
      <button
        onClick={(e) => {
          e.stopPropagation();
          props.onToggle();
        }}
        class={`text-earth hover:text-forest transition-colors rounded hover:bg-sage/40 cursor-pointer flex items-center gap-1 px-1.5 py-1 ${props.sortBy !== "default" ? "bg-sage/40 text-forest" : ""}`}
        title="Sort options"
      >
        <span class="material-icons !text-[16px]">sort</span>
        <span class="text-[9px] font-bold uppercase tracking-wider">
          {shortLabel()}
        </span>
        <span
          class="material-icons !text-[10px] transition-transform duration-200"
          classList={{ "rotate-180": props.isOpen }}
        >
          keyboard_arrow_down
        </span>
      </button>

      <Show when={props.isOpen}>
        <div class="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-premium border border-forest/10 p-1 z-50 animate-slide-down">
          <For each={SORT_OPTIONS}>
            {(option) => (
              <button
                onClick={() => props.onSelect(option.key)}
                class={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between
                  ${props.sortBy === option.key ? "bg-sage text-forest" : "text-earth hover:text-forest hover:bg-sage/30"}
                `}
              >
                <span>{option.label}</span>
                <Show when={props.sortBy === option.key}>
                  <span class="material-icons !text-[12px]">check</span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
