import { For, Show } from "solid-js";
import type { Account, Category } from "../../../types";
import type { EntryKind, TransactionDraft } from "../../../types/intelligence";
import { updateBatchDraft } from "../../../store/intelligenceStore";

interface BatchDraftEditFormProps {
  draft: TransactionDraft;
  isSaved: boolean;
  accounts: Account[];
  categories: Category[];
}

export default function BatchDraftEditForm(props: BatchDraftEditFormProps) {
  const patchDraft = (patch: Partial<TransactionDraft>) => {
    updateBatchDraft(props.draft.id, patch, props.accounts, props.categories);
  };

  return (
    <div class="mt-3 pt-3 border-t border-forest/10 space-y-2.5 animate-slide-down">
      {/* Name */}
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
          Description
        </label>
        <input
          type="text"
          disabled={props.isSaved}
          value={props.draft.name}
          onInput={(e) => patchDraft({ name: e.currentTarget.value })}
          class="w-full px-2.5 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
        />
        <Show when={props.draft.errors?.name}>
          <p class="text-[10px] text-rose-600 mt-0.5">{props.draft.errors?.name}</p>
        </Show>
      </div>

      {/* Amount & Type */}
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Amount (Rp)
          </label>
          <input
            type="number"
            disabled={props.isSaved}
            min="1"
            value={props.draft.amount}
            onInput={(e) => {
              const val = Number.parseFloat(e.currentTarget.value) || 0;
              patchDraft({ amount: val });
            }}
            class="w-full px-2.5 py-1.5 text-xs font-bold font-outfit rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          />
          <Show when={props.draft.errors?.amount}>
            <p class="text-[10px] text-rose-600 mt-0.5">{props.draft.errors?.amount}</p>
          </Show>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Type
          </label>
          <div class="flex rounded-xl border border-forest/20 overflow-hidden p-0.5 bg-forest/5">
            <button
              type="button"
              disabled={props.isSaved}
              onClick={() =>
                patchDraft({
                  type: "expense",
                  entryKind: props.draft.entryKind === "discount" ? "item" : props.draft.entryKind,
                })
              }
              class={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                props.draft.type === "expense"
                  ? "bg-white text-rose-600 shadow-xs"
                  : "text-earth/60 hover:text-forest"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              disabled={props.isSaved}
              onClick={() => patchDraft({ type: "income" })}
              class={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                props.draft.type === "income"
                  ? "bg-white text-emerald-600 shadow-xs"
                  : "text-earth/60 hover:text-forest"
              }`}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      {/* Category & Account */}
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Category
          </label>
          <select
            disabled={props.isSaved}
            value={props.draft.categoryId || ""}
            onChange={(e) => patchDraft({ categoryId: e.currentTarget.value || null })}
            class="w-full px-2 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          >
            <option value="">Select Category...</option>
            <For each={props.categories}>
              {(cat) => (
                <option value={cat.id} selected={props.draft.categoryId === cat.id}>
                  {cat.name}
                </option>
              )}
            </For>
          </select>
          <Show when={props.draft.errors?.categoryId}>
            <p class="text-[10px] text-rose-600 mt-0.5">{props.draft.errors?.categoryId}</p>
          </Show>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Account
          </label>
          <select
            disabled={props.isSaved}
            value={props.draft.accountId || ""}
            onChange={(e) => patchDraft({ accountId: e.currentTarget.value || null })}
            class="w-full px-2 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          >
            <option value="">Select Account...</option>
            <For each={props.accounts}>
              {(acc) => (
                <option value={acc.id} selected={props.draft.accountId === acc.id}>
                  {acc.name}
                </option>
              )}
            </For>
          </select>
          <Show when={props.draft.errors?.accountId}>
            <p class="text-[10px] text-rose-600 mt-0.5">{props.draft.errors?.accountId}</p>
          </Show>
        </div>
      </div>

      {/* Date & Kind */}
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Date
          </label>
          <input
            type="date"
            disabled={props.isSaved}
            value={props.draft.date || ""}
            onInput={(e) => patchDraft({ date: e.currentTarget.value })}
            class="w-full px-2 py-1 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Line Kind
          </label>
          <select
            disabled={props.isSaved}
            value={props.draft.entryKind}
            onChange={(e) => {
              const kind = e.currentTarget.value as EntryKind;
              patchDraft({
                entryKind: kind,
                type: kind === "discount" ? "income" : props.draft.type,
              });
            }}
            class="w-full px-2 py-1 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          >
            <option value="item">Item</option>
            <option value="tax">Tax</option>
            <option value="service">Service Charge</option>
            <option value="discount">Discount</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
      </div>

      {/* Note & Recurring */}
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            disabled={props.isSaved}
            placeholder="e.g. Lunch with team"
            value={props.draft.note || ""}
            onInput={(e) => patchDraft({ note: e.currentTarget.value })}
            class="w-full px-2.5 py-1 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
          />
        </div>

        <div class="pt-4 flex items-center gap-1.5 select-none">
          <input
            type="checkbox"
            id={`rec-${props.draft.id}`}
            disabled={props.isSaved}
            checked={props.draft.isRecurring || false}
            onChange={(e) => patchDraft({ isRecurring: e.currentTarget.checked })}
            class="w-3.5 h-3.5 rounded text-forest focus:ring-forest/30 border-forest/20 cursor-pointer"
          />
          <label
            for={`rec-${props.draft.id}`}
            class="text-[10px] font-bold text-earth/80 uppercase cursor-pointer"
          >
            Recurring
          </label>
        </div>
      </div>
    </div>
  );
}
