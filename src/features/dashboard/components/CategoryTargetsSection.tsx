import { For, Show } from "solid-js";
import { formatRupiah } from "../../../utils/format";
import type { CategoryTargetItem } from "./topExpensesHelpers";

interface CategoryTargetsSectionProps {
  targets: CategoryTargetItem[];
  targetsTotal: number;
  loading?: boolean;
  onEditTarget: (category: string, currentTarget: number) => void;
}

export const CategoryTargetsSection = (props: CategoryTargetsSectionProps) => {
  return (
    <div class="flex-1 basis-0 flex flex-col min-h-0 overflow-hidden">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-1.5">
          <span class="material-icons !text-base text-forest">track_changes</span>
          Category Targets
        </h4>
        <span class="text-xs font-bold font-outfit text-forest shrink-0">
          {formatRupiah(props.targetsTotal)}
        </span>
      </div>

      <div class="flex-1 max-h-[220px] lg:max-h-none overflow-y-auto pr-1 custom-scrollbar-thin space-y-2 min-h-0">
        <Show
          when={!props.loading}
          fallback={
            <div class="h-24 flex items-center justify-center text-xs text-earth/40 font-outfit">
              Loading...
            </div>
          }
        >
          <For each={props.targets}>
            {(item) => {
              const isOver = () => item.target > 0 && item.spent > item.target;
              const isWarning = () =>
                item.target > 0 && item.pct >= 80 && item.pct <= 100;

              return (
                <div class="p-1.5 rounded-lg bg-forest/[0.02] hover:bg-forest/[0.05] transition-all group">
                  <div class="flex items-center justify-between text-xs mb-1">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <div
                        class="w-2 h-2 rounded-full shrink-0"
                        style={{ "background-color": item.color }}
                      />
                      <span class="font-semibold text-forest text-xs truncate">
                        {item.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => props.onEditTarget(item.category, item.target)}
                      class="flex items-center gap-1 text-[11px] font-outfit text-earth hover:text-forest transition-colors cursor-pointer group/btn"
                      title="Click to edit target"
                    >
                      <span class="font-bold text-forest">
                        {formatRupiah(item.spent)}
                      </span>
                      <span class="text-earth/50">/</span>
                      <span class="text-earth/70 group-hover/btn:underline group-hover/btn:text-forest">
                        {item.target > 0
                          ? formatRupiah(item.target)
                          : "Set target"}
                      </span>
                      <span class="material-icons !text-[11px] text-earth/40 group-hover/btn:text-forest">
                        edit
                      </span>
                    </button>
                  </div>

                  {/* Target Progress / Level Bar */}
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-forest/10 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full transition-all duration-500 ${
                          isOver()
                            ? "bg-rose-500"
                            : isWarning()
                              ? "bg-amber-500"
                              : "bg-forest"
                        }`}
                        style={{
                          width: `${Math.min(item.pct, 100)}%`,
                          "background-color":
                            !isOver() && !isWarning() ? item.color : undefined,
                        }}
                      />
                    </div>
                    <span
                      class={`text-[10px] font-bold font-outfit shrink-0 ${
                        isOver()
                          ? "text-rose-500"
                          : isWarning()
                            ? "text-amber-600"
                            : "text-forest"
                      }`}
                    >
                      {item.target > 0 ? `${item.pct}%` : "-"}
                    </span>
                  </div>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
};
