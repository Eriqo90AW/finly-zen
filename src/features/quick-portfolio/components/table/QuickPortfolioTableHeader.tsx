import { For, Show } from "solid-js";
import type { SortKey, SortOrder } from "../../types";

interface HeaderColumn {
  key: SortKey;
  label: string;
  thClass: string;
  align: "left" | "right";
  hideWhenFxHidden?: boolean;
}

const COLUMNS: HeaderColumn[] = [
  {
    key: "asset",
    label: "Asset",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider w-1/4",
    align: "left",
  },
  {
    key: "qty",
    label: "Quantity",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-[110px]",
    align: "right",
  },
  {
    key: "avgPrice",
    label: "Avg Price",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6",
    align: "right",
  },
  {
    key: "fxRate",
    label: "FX Rate",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-[150px]",
    align: "right",
    hideWhenFxHidden: true,
  },
  {
    key: "currentPrice",
    label: "Current Price",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6",
    align: "right",
  },
  {
    key: "value",
    label: "Total Value",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6",
    align: "right",
  },
  {
    key: "gain",
    label: "Gain",
    thClass: "px-6 py-3 font-semibold uppercase tracking-wider text-right w-[calc(100%/7)]",
    align: "right",
  },
  {
    key: "allocation",
    label: "Allocation",
    thClass:
      "pl-6 pr-8 py-3 font-semibold uppercase tracking-wider text-right w-[14%] min-w-[180px]",
    align: "right",
  },
];

interface QuickPortfolioTableHeaderProps {
  sortBy: SortKey;
  sortOrder: SortOrder;
  hideFxRate: boolean;
  onSort: (key: SortKey) => void;
}

export const QuickPortfolioTableHeader = (props: QuickPortfolioTableHeaderProps) => {
  return (
    <thead class="bg-sage/20 border-b border-forest/5 text-[11px] text-earth">
      <tr class="group/header">
        <For each={COLUMNS}>
          {(col) => {
            const isActive = () => props.sortBy === col.key;
            const iconName = () =>
              isActive() && props.sortOrder === "asc" ? "expand_less" : "expand_more";

            return (
              <Show when={!col.hideWhenFxHidden || !props.hideFxRate}>
                <th class={col.thClass}>
                  <button
                    type="button"
                    onClick={() => props.onSort(col.key)}
                    class={
                      col.align === "left"
                        ? "flex items-center gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase text-left bg-transparent border-0 p-0 outline-none select-none"
                        : "flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                    }
                  >
                    <Show when={col.align === "right"}>
                      <span
                        class="material-icons !text-[14px] transition-all duration-200"
                        classList={{
                          "text-forest font-bold": isActive(),
                          "text-earth/20 opacity-0 group-hover/header:opacity-100": !isActive(),
                        }}
                      >
                        {iconName()}
                      </span>
                    </Show>
                    {col.label}
                    <Show when={col.align === "left"}>
                      <span
                        class="material-icons !text-[14px] transition-all duration-200"
                        classList={{
                          "text-forest font-bold": isActive(),
                          "text-earth/20 opacity-0 group-hover/header:opacity-100": !isActive(),
                        }}
                      >
                        {iconName()}
                      </span>
                    </Show>
                  </button>
                </th>
              </Show>
            );
          }}
        </For>
      </tr>
    </thead>
  );
};
