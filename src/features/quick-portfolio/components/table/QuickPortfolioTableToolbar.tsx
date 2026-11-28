import { For } from "solid-js";
import type { FilterCategoryOption } from "../../types";

interface QuickPortfolioTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterCategories: FilterCategoryOption[];
  selectedAssetType: string;
  categoryCounts: Record<string, number>;
  onSelectAssetType: (category: string) => void;
  hideFxRate: boolean;
  onToggleHideFxRate: () => void;
  onStartAddHolding: () => void;
  onCopyJson: () => void;
  isCopied: boolean;
}

export const QuickPortfolioTableToolbar = (props: QuickPortfolioTableToolbarProps) => {
  return (
    <div class="p-3 sm:p-4 border-b border-forest/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white/50 backdrop-blur-sm">
      {/* Left Side: Add Holding Button + Search Bar */}
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={props.onStartAddHolding}
          class="bg-forest text-white font-outfit text-xs font-bold h-[30px] px-3.5 rounded-full flex items-center gap-1.5 hover:bg-mid-green transition-all shadow-xs hover:-translate-y-0.5 cursor-pointer border-0 outline-none select-none active:scale-95 shrink-0"
        >
          <span class="material-icons !text-base">add</span>
          Add Holding
        </button>

        <div class="relative flex-1 sm:w-56 lg:w-60 flex items-center">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-earth !text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={props.searchQuery}
            onInput={(e) => props.onSearchChange(e.currentTarget.value)}
            placeholder="Filter holdings..."
            class="w-full h-[30px] bg-sage/40 border border-forest/10 rounded-full pl-8 pr-3.5 font-outfit text-xs text-near-black placeholder:text-earth/60 focus:bg-white focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all focus:outline-none"
          />
        </div>
      </div>

      {/* Right Side: Pill Filters, FX Toggle, Copy JSON */}
      <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
        <div class="flex items-center gap-1 bg-sage/25 p-1 rounded-full border border-forest/10 overflow-x-auto no-scrollbar max-w-full">
          <For each={props.filterCategories}>
            {(cat) => {
              const isSelected = () => props.selectedAssetType === cat.id;
              const count = () => props.categoryCounts[cat.id] || 0;

              return (
                <button
                  type="button"
                  onClick={() => props.onSelectAssetType(cat.id)}
                  class="rounded-full px-3 h-[28px] text-[11px] sm:text-xs font-outfit font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none border outline-none active:scale-95 whitespace-nowrap"
                  classList={{
                    "bg-forest text-white border-forest shadow-xs": isSelected(),
                    "bg-transparent text-earth hover:text-forest hover:bg-sage/50 border-transparent":
                      !isSelected(),
                  }}
                >
                  <span class="material-icons !text-[13px] leading-none">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    class="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold transition-colors leading-none"
                    classList={{
                      "bg-white/20 text-white": isSelected(),
                      "bg-forest/10 text-forest": !isSelected(),
                    }}
                  >
                    {count()}
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        <div class="h-5 w-px bg-forest/10 hidden sm:block" />

        <button
          type="button"
          onClick={props.onToggleHideFxRate}
          class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/40 px-3.5 h-[30px] rounded-full font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none bg-white/80 shrink-0 shadow-xs"
        >
          <span class="material-icons !text-base">
            {props.hideFxRate ? "visibility_off" : "visibility"}
          </span>
          {props.hideFxRate ? "Show FX Rate" : "Hide FX Rate"}
        </button>

        <button
          type="button"
          onClick={props.onCopyJson}
          class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/40 px-3.5 h-[30px] rounded-full font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white/80 shrink-0 shadow-xs"
          classList={{ "text-forest border-forest/30 bg-sage/40": props.isCopied }}
        >
          <span class="material-icons !text-base">
            {props.isCopied ? "check" : "content_copy"}
          </span>
          {props.isCopied ? "Copied!" : "Copy JSON"}
        </button>
      </div>
    </div>
  );
};
