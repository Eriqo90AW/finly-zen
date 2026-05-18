import { createMemo, For, Show } from "solid-js";
import { getAssetColor } from "../../../utils/colors";

interface PortfolioMiniDonutProps {
  portfolio: any;
}

export const PortfolioMiniDonut = (props: PortfolioMiniDonutProps) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;

  const segments = createMemo(() => {
    const total = props.portfolio.totalValue;
    if (total === 0) return [];

    const list: {
      name: string;
      percentage: number;
      color: string;
      offset: number;
    }[] = [];
    let accumulated = 0;

    props.portfolio.assets.forEach((asset: any) => {
      if (asset.actualAllocation > 0) {
        list.push({
          name: asset.ticker,
          percentage: asset.actualAllocation,
          color: getAssetColor(asset.ticker),
          offset: accumulated,
        });
        accumulated += asset.actualAllocation;
      }
    });

    const cashPercent = (props.portfolio.cash / total) * 100;
    if (cashPercent > 0) {
      list.push({
        name: "Cash",
        percentage: cashPercent,
        color: "#2D7D46", // mid-green for cash
        offset: accumulated,
      });
    }

    return list;
  });

  const top3Allocations = createMemo(() => {
    const list = segments().map((s) => ({
      name: s.name,
      percentage: s.percentage,
      color: s.color,
    }));
    return list.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  });

  return (
    <div class="flex items-center gap-1.5">
      <Show
        when={props.portfolio.totalValue > 0}
        fallback={
          <div class="flex items-center gap-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              class="transform -rotate-90"
            >
              <circle
                cx="12"
                cy="12"
                r={radius}
                stroke="currentColor"
                stroke-width="3.5"
                fill="transparent"
                class="text-forest/10"
              />
            </svg>
            <span class="text-[10px] text-earth/40 italic font-outfit">
              Empty
            </span>
          </div>
        }
      >
        <div class="flex flex-col gap-0.5 min-w-0">
          <For each={top3Allocations()}>
            {(item) => (
              <div class="flex items-center gap-1 text-[9px] font-outfit font-bold uppercase tracking-wider text-earth/80">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ "background-color": item.color }}
                />
                <span
                  class="truncate max-w-[45px] leading-none"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span class="text-earth/40 text-[8px] font-medium leading-none">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </For>
        </div>

        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          class="transform -rotate-90 drop-shadow-sm flex-shrink-0"
        >
          <circle
            cx="12"
            cy="12"
            r={radius}
            stroke="currentColor"
            stroke-width="3.5"
            fill="transparent"
            class="text-forest/10"
          />
          <For each={segments()}>
            {(segment) => {
              const strokeLength = (segment.percentage / 100) * circumference;
              const strokeOffset = -((segment.offset / 100) * circumference);

              return (
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  stroke={segment.color}
                  stroke-width="3.5"
                  fill="transparent"
                  stroke-dasharray={`${strokeLength} ${circumference}`}
                  stroke-dashoffset={`${strokeOffset}`}
                  class="transition-all duration-1000 ease-out"
                />
              );
            }}
          </For>
        </svg>
      </Show>
    </div>
  );
};
