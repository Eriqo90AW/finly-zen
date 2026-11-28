import { Show } from "solid-js";
import type { PortfolioAsset } from "../../../../types";
import { formatPortfolioValue } from "../../../../utils/format";

interface AssetExposureSectionProps {
  asset: PortfolioAsset;
  portfolioTotalValue: number;
  currency: "IDR" | "USD";
  portfolioNativeCurrency?: "IDR" | "USD";
  expanded: boolean;
  onToggle: () => void;
}

export const AssetExposureSection = (props: AssetExposureSectionProps) => {
  const actualAllocation = () => props.asset.actualAllocation;
  const targetAllocation = () => props.asset.targetAllocation;
  const deviation = () => actualAllocation() - targetAllocation();

  const differenceToTarget = () => {
    const targetValue = props.portfolioTotalValue * (targetAllocation() / 100);
    return targetValue - props.asset.currentValue;
  };

  const differenceToTargetInShares = () => {
    if (props.asset.currentPrice === 0) return 0;
    return differenceToTarget() / props.asset.currentPrice;
  };

  const exposureStatus = () => {
    const dev = deviation();
    if (targetAllocation() === 0) return "NO_TARGET";
    if (dev > 1) return "OVER";
    if (dev < -1) return "UNDER";
    return "TARGET";
  };

  return (
    <div class="p-6 border-b border-forest/5">
      <div
        onClick={props.onToggle}
        class="flex items-center justify-between cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
      >
        <div class="flex items-center gap-1.5">
          <span class="material-icons !text-[16px] text-earth">
            track_changes
          </span>
          <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
            Allocation Target Exposure
          </h4>
        </div>
        <span
          class="material-icons text-earth transition-transform duration-300 transform"
          style={{
            transform: props.expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          expand_more
        </span>
      </div>

      {/* Collapsed visual summary */}
      <Show when={!props.expanded}>
        <div class="flex items-center gap-2 mt-3 pl-5 text-[11px] font-outfit font-medium text-earth/60">
          <span>Actual: {actualAllocation().toFixed(1)}%</span>
          <span>•</span>
          <span>Target: {targetAllocation().toFixed(1)}%</span>
          <Show when={targetAllocation() > 0}>
            <span>•</span>
            <span
              class={
                exposureStatus() === "OVER"
                  ? "text-red-600 font-bold"
                  : exposureStatus() === "UNDER"
                    ? "text-amber-600 font-bold"
                    : "text-emerald-600 font-bold"
              }
            >
              {deviation() >= 0 ? "+" : ""}
              {deviation().toFixed(1)}% dev
            </span>
          </Show>
        </div>
      </Show>

      {/* Expandable Content wrapper */}
      <div
        class={`grid transition-all duration-300 ease-in-out ${
          props.expanded
            ? "grid-rows-[1fr] opacity-100 mt-4"
            : "grid-rows-[0fr] opacity-0 overflow-hidden"
        }`}
      >
        <div class="overflow-hidden">
          <Show
            when={exposureStatus() !== "NO_TARGET"}
            fallback={
              <div class="p-4 rounded-2xl border border-forest/10 bg-sage/5 text-center">
                <p class="text-xs text-earth italic">
                  No target allocation set for this asset.
                </p>
                <p class="text-[10px] text-earth/60 mt-1 uppercase tracking-wider font-semibold">
                  Actual: {actualAllocation().toFixed(1)}%
                </p>
              </div>
            }
          >
            <div
              class={`p-4 rounded-2xl border ${
                exposureStatus() === "OVER"
                  ? "bg-red-50 border-red-100/50"
                  : exposureStatus() === "UNDER"
                    ? "bg-amber-50/70 border-amber-100/60"
                    : "bg-emerald-50 border-emerald-100/50"
              }`}
            >
              <div class="flex justify-between items-center mb-2">
                <span
                  class={`text-xs font-outfit font-bold uppercase tracking-wider ${
                    exposureStatus() === "OVER"
                      ? "text-red-700"
                      : exposureStatus() === "UNDER"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {exposureStatus() === "OVER"
                    ? "Overexposed"
                    : exposureStatus() === "UNDER"
                      ? "Underexposed"
                      : "On Target"}
                </span>
                <span
                  class={`text-xs font-outfit font-bold ${
                    exposureStatus() === "OVER"
                      ? "text-red-700"
                      : exposureStatus() === "UNDER"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {deviation() >= 0 ? "+" : ""}
                  {deviation().toFixed(1)}% deviation
                </span>
              </div>

              {/* Progress Bar Visualizer */}
              <div class="w-full bg-forest/5 h-2 rounded-full overflow-hidden mb-3 flex relative">
                <div
                  class={`h-full rounded-full transition-all duration-500 ${
                    exposureStatus() === "OVER"
                      ? "bg-red-500"
                      : exposureStatus() === "UNDER"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (actualAllocation() /
                        Math.max(targetAllocation(), actualAllocation())) *
                        100,
                      100,
                    )}%`,
                  }}
                />
                <Show when={actualAllocation() > targetAllocation()}>
                  <div
                    class="absolute top-0 bottom-0 w-0.5 bg-white opacity-80"
                    style={{
                      left: `${(targetAllocation() / actualAllocation()) * 100}%`,
                    }}
                    title={`Target: ${targetAllocation().toFixed(1)}%`}
                  />
                </Show>
              </div>

              <div class="flex justify-between text-[10px] text-earth/70 font-outfit font-medium mb-3">
                <span>Actual: {actualAllocation().toFixed(1)}%</span>
                <span>Target: {targetAllocation().toFixed(1)}%</span>
              </div>

              <p class="text-xs text-forest/90 font-outfit font-medium leading-relaxed">
                <Show
                  when={differenceToTarget() > 0}
                  fallback={
                    <span>
                      Sell{" "}
                      <span class="font-bold text-red-600">
                        {formatPortfolioValue(
                          Math.abs(differenceToTarget()),
                          props.currency,
                          false,
                          props.portfolioNativeCurrency,
                        )}
                      </span>{" "}
                      <span class="text-[11px] text-red-500/85">
                        ({Math.abs(differenceToTargetInShares()).toFixed(4)}{" "}
                        shares)
                      </span>{" "}
                      worth of shares to return to target.
                    </span>
                  }
                >
                  Buy{" "}
                  <span class="font-bold text-green-600">
                    {formatPortfolioValue(
                      differenceToTarget(),
                      props.currency,
                      false,
                      props.portfolioNativeCurrency,
                    )}
                  </span>{" "}
                  <span class="text-[11px] text-green-500/85">
                    ({differenceToTargetInShares().toFixed(4)} shares)
                  </span>{" "}
                  more to reach target allocation.
                </Show>
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
