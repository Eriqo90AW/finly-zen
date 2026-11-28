import { For, Show } from "solid-js";
import type { PortfolioTransaction } from "../../../../types";
import { formatPortfolioValue } from "../../../../utils/format";

interface AssetTransactionsSectionProps {
  transactions: PortfolioTransaction[];
  currency: "IDR" | "USD";
  portfolioNativeCurrency?: "IDR" | "USD";
  expanded: boolean;
  onToggle: () => void;
}

export const AssetTransactionsSection = (
  props: AssetTransactionsSectionProps,
) => {
  const sortedTransactions = () =>
    [...props.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  return (
    <div class="p-6">
      <div
        onClick={props.onToggle}
        class="flex items-center gap-1 cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
      >
        <span class="material-icons !text-[16px] text-earth">receipt</span>
        <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
          Transaction History
        </h4>
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
        <p class="text-xs text-earth/60 italic mt-3 pl-5 border-l-2 border-forest/10">
          {props.transactions.length} transaction
          {props.transactions.length === 1 ? "" : "s"} recorded.
        </p>
      </Show>

      {/* Expandable Content wrapper */}
      <div
        class={`grid transition-all duration-300 ease-in-out ${
          props.expanded
            ? "grid-rows-[1fr] opacity-100 mt-4"
            : "grid-rows-[0fr] opacity-0 overflow-hidden"
        }`}
      >
        <div class="overflow-hidden space-y-3">
          <For
            each={sortedTransactions()}
            fallback={
              <div class="text-center py-10 text-earth/30 italic font-outfit text-sm">
                No transactions found for this asset.
              </div>
            }
          >
            {(tx) => (
              <div class="p-4 rounded-2xl border border-forest/5 hover:border-forest/20 transition-all group">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          tx.type === "BUY"
                            ? "bg-spring/10 text-spring"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {tx.type}
                      </span>
                      <span class="text-[10px] text-earth font-outfit">
                        {new Date(tx.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p class="text-sm font-outfit font-medium text-forest">
                      {tx.shares.toFixed(4)} @{" "}
                      {formatPortfolioValue(
                        tx.pricePerShare,
                        props.currency,
                        true,
                        props.portfolioNativeCurrency,
                      )}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-outfit font-bold text-forest">
                      {formatPortfolioValue(
                        tx.totalAmount,
                        props.currency,
                        false,
                        props.portfolioNativeCurrency,
                      )}
                    </p>
                    <Show when={tx.gainLoss !== undefined}>
                      <p
                        class={`text-[10px] font-bold ${
                          (tx.gainLoss ?? 0) >= 0
                            ? "text-spring"
                            : "text-red-500"
                        }`}
                      >
                        {(tx.gainLoss ?? 0) >= 0 ? "+" : ""}
                        {formatPortfolioValue(
                          tx.gainLoss ?? 0,
                          props.currency,
                          true,
                          props.portfolioNativeCurrency,
                        )}
                      </p>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
