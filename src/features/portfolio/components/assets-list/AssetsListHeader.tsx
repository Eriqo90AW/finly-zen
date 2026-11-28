import type { AssetSortKey, SortOrder } from "./assetsListHelpers";

interface AssetsListHeaderProps {
  sortBy: AssetSortKey;
  sortOrder: SortOrder;
  onSort: (key: AssetSortKey) => void;
}

export const AssetsListHeader = (props: AssetsListHeaderProps) => {
  const iconClass = (key: AssetSortKey) =>
    `material-icons !text-[16px] transition-all duration-200 ${
      props.sortBy === key
        ? "text-forest font-bold"
        : "text-earth/20 opacity-0 group-hover/header:opacity-100"
    }`;

  const iconName = (key: AssetSortKey) =>
    props.sortBy === key && props.sortOrder === "asc"
      ? "expand_less"
      : "expand_more";

  return (
    <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60 group/header">
      <div class="w-1 mr-4" />

      <button
        type="button"
        onClick={() => props.onSort("ticker")}
        class="flex-[2] min-w-0 flex items-center gap-1 hover:text-forest transition-colors cursor-pointer uppercase text-left font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
      >
        Asset
        <span class={iconClass("ticker")}>{iconName("ticker")}</span>
      </button>

      <button
        type="button"
        onClick={() => props.onSort("value")}
        class="flex-1 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
      >
        <span class={iconClass("value")}>{iconName("value")}</span>
        Value
      </button>

      <button
        type="button"
        onClick={() => props.onSort("price")}
        class="flex-1 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
      >
        <span class={iconClass("price")}>{iconName("price")}</span>
        Price / Avg
      </button>

      <button
        type="button"
        onClick={() => props.onSort("gain")}
        class="flex-1 flex justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
      >
        <span class={iconClass("gain")}>{iconName("gain")}</span>
        Total Gain
      </button>

      <button
        type="button"
        onClick={() => props.onSort("allocation")}
        class="w-32 flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer uppercase font-bold tracking-widest text-[11px] text-earth/60 bg-transparent border-0 p-0 outline-none select-none"
      >
        <span class={iconClass("allocation")}>{iconName("allocation")}</span>
        Allocation
      </button>

      <div class="w-12" />
    </div>
  );
};
