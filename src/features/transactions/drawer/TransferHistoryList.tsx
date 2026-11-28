import { For, Show } from "solid-js";
import ArrowForwardIcon from "@suid/icons-material/ArrowForwardOutlined";
import type { TransferRecord } from "../../../types";
import { formatRupiah } from "../../../utils/format";

interface TransferHistoryListProps {
  items: TransferRecord[];
  loading: boolean;
  isDeleting: boolean;
  onRequestDelete: (record: TransferRecord) => void;
}

export const TransferHistoryList = (props: TransferHistoryListProps) => {
  return (
    <div class="space-y-3 pt-4 border-t border-forest/10">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold font-outfit text-forest uppercase tracking-wider flex items-center gap-1.5">
          <span class="material-icons !text-sm text-forest">history</span>
          Transfer History
        </h4>
        <span class="text-[10px] text-earth/60 font-outfit">
          {props.items.length} Transfers
        </span>
      </div>

      <div class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        <Show
          when={!props.loading}
          fallback={
            <div class="p-4 text-center text-xs text-earth/50">
              Loading history...
            </div>
          }
        >
          <Show
            when={props.items.length > 0}
            fallback={
              <div class="p-6 text-center text-xs text-earth/40 bg-page-bg/50 rounded-xl">
                No previous transfers recorded.
              </div>
            }
          >
            <For each={props.items}>
              {(item) => (
                <div class="p-2.5 rounded-xl bg-forest/[0.03] border border-forest/5 flex items-center justify-between text-xs hover:bg-forest/[0.06] transition-colors group">
                  <div class="min-w-0 pr-2">
                    <div class="flex items-center gap-1 font-semibold text-forest text-xs truncate">
                      <span
                        class="truncate max-w-[75px]"
                        style={{
                          color: item.fromAccountColor || "var(--color-forest)",
                        }}
                      >
                        {item.fromAccountName}
                      </span>
                      <ArrowForwardIcon
                        sx={{ fontSize: 12 }}
                        class="text-earth/40 shrink-0"
                      />
                      <span
                        class="truncate max-w-[75px]"
                        style={{
                          color: item.toAccountColor || "var(--color-forest)",
                        }}
                      >
                        {item.toAccountName}
                      </span>
                    </div>
                    <p class="text-[10px] text-earth/60 mt-0.5">
                      {new Date(item.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-bold text-forest font-outfit">
                      {formatRupiah(item.amount)}
                    </span>
                    <button
                      type="button"
                      title="Delete Transfer"
                      disabled={props.isDeleting}
                      onClick={() => props.onRequestDelete(item)}
                      class="w-6 h-6 rounded-lg flex items-center justify-center text-earth/40 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <span class="material-icons !text-[15px]">
                        delete_outline
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
};
