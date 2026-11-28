import { Show } from "solid-js";

interface AssetsListFilterMenuProps {
  activeFilters: Set<string>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onToggleFilter: (filter: string) => void;
  onClearFilters: () => void;
}

export const AssetsListFilterMenu = (props: AssetsListFilterMenuProps) => {
  return (
    <div class="relative">
      <button
        type="button"
        onClick={props.onToggleOpen}
        class={`px-4 py-1.5 rounded-lg text-xs font-bold transition-[background-color,box-shadow,color,border-color] duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2 outline-none select-none ${
          props.activeFilters.size > 0
            ? "bg-spring/10 text-forest border border-spring/50"
            : "bg-white text-forest border border-forest/10 hover:bg-forest/5"
        }`}
      >
        <span class="material-icons !text-sm">filter_list</span>
        FILTER
        <Show when={props.activeFilters.size > 0}>
          <span class="ml-0.5 px-1.5 py-0.5 text-[9px] bg-forest text-white rounded-full leading-none font-bold">
            {props.activeFilters.size}
          </span>
        </Show>
      </button>

      {/* Dropdown checklist */}
      <Show when={props.isOpen}>
        <div
          class="fixed inset-0 z-10 cursor-default"
          onClick={props.onClose}
        />
        <div class="absolute right-0 mt-2 w-60 bg-white border border-forest/10 rounded-xl shadow-xl z-20 py-2 cursor-default animate-fade-in origin-top-right">
          <div class="px-4 py-2 border-b border-forest/5 text-[10px] font-bold text-earth/60 uppercase tracking-wider">
            Filter by Weight
          </div>

          {/* Underweight Checkbox */}
          <label class="flex items-center gap-3 px-4 py-3 hover:bg-earth/5 cursor-pointer text-xs font-outfit text-forest font-semibold transition-colors duration-150 select-none">
            <input
              type="checkbox"
              checked={props.activeFilters.has("underweight")}
              onChange={() => props.onToggleFilter("underweight")}
              class="accent-forest w-4 h-4 rounded text-forest focus:ring-forest/20 cursor-pointer"
            />
            <div class="flex flex-col">
              <span>Underweight</span>
              <span class="text-[10px] text-earth/60 font-normal">
                Target &gt; Current allocation
              </span>
            </div>
          </label>

          {/* Overweight Checkbox */}
          <label class="flex items-center gap-3 px-4 py-3 hover:bg-earth/5 cursor-pointer text-xs font-outfit text-forest font-semibold transition-colors duration-150 select-none">
            <input
              type="checkbox"
              checked={props.activeFilters.has("overweight")}
              onChange={() => props.onToggleFilter("overweight")}
              class="accent-forest w-4 h-4 rounded text-forest focus:ring-forest/20 cursor-pointer"
            />
            <div class="flex flex-col">
              <span>Overweight</span>
              <span class="text-[10px] text-earth/60 font-normal">
                Target &lt; Current allocation
              </span>
            </div>
          </label>

          <Show when={props.activeFilters.size > 0}>
            <div class="px-4 py-1.5 border-t border-forest/5 flex justify-end">
              <button
                type="button"
                onClick={props.onClearFilters}
                class="text-[10px] font-bold text-rose-500 hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                Clear Filters
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
