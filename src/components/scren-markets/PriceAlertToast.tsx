import { For, onMount, onCleanup } from "solid-js";
import type { PriceAlert } from "../../types";
import { formatUSD } from "../../utils/format";

export interface PriceAlertToastProps {
  alerts: PriceAlert[];
  onDismiss: (id: string) => void;
}

const ToastItem = (props: { alert: PriceAlert; onDismiss: () => void }) => {
  let timer: any;

  onMount(() => {
    timer = setTimeout(() => {
      props.onDismiss();
    }, 8000);
  });

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return (
    <div
      class="pointer-events-auto premium-card bg-white border-l-4 p-4 shadow-2xl flex gap-3 animate-slide-in-right relative overflow-hidden"
      classList={{
        "border-l-fin-green": props.alert.condition === "above",
        "border-l-fin-red": props.alert.condition === "below",
      }}
    >
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        classList={{
          "bg-fin-green/10 text-fin-green": props.alert.condition === "above",
          "bg-fin-red/10 text-fin-red": props.alert.condition === "below",
        }}
      >
        <span class="material-icons text-lg animate-pulse-soft">
          {props.alert.condition === "above" ? "trending_up" : "trending_down"}
        </span>
      </div>

      <div class="flex-1 min-w-0 pr-6">
        <h5 class="font-outfit font-bold text-forest text-sm truncate">
          Price Alert Triggered!
        </h5>
        <p class="text-xs text-earth mt-1 leading-relaxed">
          <span class="font-bold text-forest bg-sage/40 px-1 py-0.5 rounded mr-1">
            {props.alert.ticker}
          </span>
          crossed your target of{" "}
          <span class="font-semibold text-forest">
            {formatUSD(props.alert.targetPrice)}
          </span>
          .
        </p>
      </div>

      <button
        onClick={props.onDismiss}
        class="absolute top-3 right-3 text-earth/40 hover:text-forest cursor-pointer p-0.5 rounded-lg hover:bg-sage/10 transition-colors flex items-center justify-center"
        title="Dismiss"
      >
        <span class="material-icons text-base">close</span>
      </button>
    </div>
  );
};

export const PriceAlertToast = (props: PriceAlertToastProps) => {
  return (
    <div class="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-[90vw] pointer-events-none">
      <For each={props.alerts}>
        {(alert) => (
          <ToastItem alert={alert} onDismiss={() => props.onDismiss(alert.id)} />
        )}
      </For>
    </div>
  );
};
