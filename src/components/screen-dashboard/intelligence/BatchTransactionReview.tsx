import { createSignal, createMemo, For, Show, createResource } from "solid-js";
import type {
  PendingBatchTransactionAction,
  TransactionDraft,
  EntryKind,
} from "../../../types/intelligence";
import {
  intelligenceState,
  updateBatchDraft,
  toggleDraftSelection,
  selectAllValidDrafts,
  toggleExcludeDraft,
  applyAccountToSelectedDrafts,
  applyDateToSelectedDrafts,
} from "../../../store/intelligenceStore";

import {
  saveBatchTransactions,
  finishBatchAction,
  cancelPendingAction,
} from "../../../services/intelligence/chatOrchestrator";
import { getAccounts, getCategories } from "../../../data/expenseData";
import { formatRupiah } from "../../../utils/format";

interface Props {
  action: PendingBatchTransactionAction;
}

export const BatchTransactionReview = (props: Props) => {
  const [categoriesResource] = createResource(getCategories);
  const [accountsResource] = createResource(getAccounts);

  const [expandedDraftIds, setExpandedDraftIds] = createSignal<Set<string>>(new Set());
  const [isSaving, setIsSaving] = createSignal(false);
  const [bulkAccountOpen, setBulkAccountOpen] = createSignal(false);
  const [bulkDateOpen, setBulkDateOpen] = createSignal(false);
  const [bulkDateValue, setBulkDateValue] = createSignal(new Date().toISOString().split("T")[0]);

  const categories = () => categoriesResource() || [];
  const accounts = () => accountsResource() || [];

  const currentAction = () =>
    intelligenceState.pendingAction?.kind === "transaction-batch"
      ? intelligenceState.pendingAction
      : props.action;

  const drafts = () => currentAction().drafts || [];

  const savedDrafts = createMemo(() => drafts().filter((d) => d.status === "saved"));
  const savedCount = createMemo(() => savedDrafts().length);

  const validSelectedDrafts = createMemo(() =>
    drafts().filter((d) => d.selected && (d.status === "ready" || d.status === "failed")),
  );
  const validSelectedCount = createMemo(() => validSelectedDrafts().length);

  const selectedNetTotal = createMemo(() => {
    let expenseTotal = 0;
    let incomeTotal = 0;
    for (const d of drafts()) {
      if (d.selected && d.status !== "excluded") {
        if (d.type === "income" || d.entryKind === "discount") {
          incomeTotal += d.amount || 0;
        } else {
          expenseTotal += d.amount || 0;
        }
      }
    }
    return expenseTotal - incomeTotal;
  });

  const reconciliation = createMemo(() => {
    const expected = currentAction().receiptTotal;
    if (expected === undefined || expected === null || expected <= 0) return null;

    const actual = selectedNetTotal();
    const diff = Math.abs(expected - actual);
    const isReconciled = diff <= 1;

    return {
      expected,
      actual,
      diff,
      isReconciled,
    };
  });

  const toggleExpand = (id: string) => {
    setExpandedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (isSaving() || validSelectedCount() === 0) return;
    setIsSaving(true);
    try {
      await saveBatchTransactions();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    await finishBatchAction();
  };

  const handleCancel = async () => {
    await cancelPendingAction();
  };

  const getKindIcon = (kind: EntryKind) => {
    switch (kind) {
      case "tax":
        return "receipt_long";
      case "service":
        return "room_service";
      case "discount":
        return "local_offer";
      case "adjustment":
        return "tune";
      default:
        return "shopping_bag";
    }
  };

  const getStatusBadge = (draft: TransactionDraft) => {
    switch (draft.status) {
      case "saved":
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span class="material-icons text-[12px]">check_circle</span> Saved
          </span>
        );
      case "saving":
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
            <span class="material-icons text-[12px] animate-spin">refresh</span> Saving…
          </span>
        );
      case "failed":
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span class="material-icons text-[12px]">error_outline</span> Failed
          </span>
        );
      case "invalid":
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span class="material-icons text-[12px]">warning_amber</span> Needs info
          </span>
        );
      case "excluded":
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            <span class="material-icons text-[12px]">block</span> Excluded
          </span>
        );
      default:
        return (
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest/10 text-forest border border-forest/20">
            <span class="material-icons text-[12px]">check</span> Ready
          </span>
        );
    }
  };

  return (
    <div class="flex flex-col flex-1 min-h-0 bg-page-bg">
      {/* Header */}
      <div class="p-3.5 bg-white border-b border-forest/10 shrink-0 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                currentAction().source === "ocr"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-forest/10 text-forest border border-forest/20"
              }`}
            >
              {currentAction().source === "ocr" ? "Receipt OCR" : "AI Batch"}
            </span>

            <Show when={currentAction().ocrConfidence !== undefined && currentAction().ocrConfidence !== null}>
              <span class="text-[10px] text-earth/60 font-semibold">
                {Math.round(currentAction().ocrConfidence!)}% confidence
              </span>
            </Show>
          </div>

          <span class="text-xs font-bold text-forest font-outfit">
            {drafts().length} {drafts().length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div class="flex items-center justify-between text-xs">
          <div class="min-w-0">
            <h4 class="font-outfit font-bold text-forest truncate text-sm">
              {currentAction().merchant || "Batch Transaction Review"}
            </h4>
            <Show when={savedCount() > 0}>
              <p class="text-[11px] text-emerald-700 font-medium">
                {savedCount()} of {drafts().length} entries saved
              </p>
            </Show>
          </div>


          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => selectAllValidDrafts(true)}
              class="px-2 py-1 rounded-lg text-[10px] font-bold text-forest bg-forest/5 hover:bg-forest/10 transition-colors cursor-pointer"
            >
              Select Valid
            </button>
            <button
              type="button"
              onClick={() => selectAllValidDrafts(false)}
              class="px-2 py-1 rounded-lg text-[10px] font-bold text-earth/60 hover:text-earth bg-forest/5 hover:bg-forest/10 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div class="flex items-center gap-2 pt-1 border-t border-forest/5 text-xs">
          <div class="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setBulkAccountOpen((v) => !v);
                setBulkDateOpen(false);
              }}
              class="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-forest/15 bg-white text-forest hover:border-forest/40 transition-colors cursor-pointer"
            >
              <span class="truncate">Apply Account</span>
              <span class="material-icons text-[14px]">expand_more</span>
            </button>

            <Show when={bulkAccountOpen()}>
              <div class="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-forest/10 p-1 z-30 flex flex-col gap-0.5 animate-slide-down">
                <For each={accounts()}>
                  {(acc) => (
                    <button
                      type="button"
                      onClick={() => {
                        applyAccountToSelectedDrafts(acc.id, acc.name);
                        setBulkAccountOpen(false);
                      }}
                      class="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-left rounded-lg text-forest hover:bg-forest/5 transition-colors cursor-pointer"
                    >
                      <span
                        class="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ "background-color": acc.color || "var(--color-mid-green)" }}
                      />
                      <span class="truncate">{acc.name}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setBulkDateOpen((v) => !v);
                setBulkAccountOpen(false);
              }}
              class="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-forest/15 bg-white text-forest hover:border-forest/40 transition-colors cursor-pointer"
            >
              <span class="truncate">Apply Date</span>
              <span class="material-icons text-[14px]">calendar_today</span>
            </button>

            <Show when={bulkDateOpen()}>
              <div class="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-forest/10 p-2.5 z-30 flex flex-col gap-2 animate-slide-down">
                <p class="text-[10px] font-bold uppercase tracking-wider text-earth/70">
                  Apply Date to Selected
                </p>
                <input
                  type="date"
                  value={bulkDateValue()}
                  onInput={(e) => setBulkDateValue(e.currentTarget.value)}
                  class="w-full px-2 py-1 text-xs border border-forest/20 rounded-lg text-forest bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    applyDateToSelectedDrafts(bulkDateValue());
                    setBulkDateOpen(false);
                  }}
                  class="w-full py-1 text-xs font-bold bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors cursor-pointer"
                >
                  Apply to Selected
                </button>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Scrollable Draft Rows */}
      <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 min-h-0">
        <For each={drafts()}>
          {(draft) => {
            const isExpanded = () => expandedDraftIds().has(draft.id);
            const isSaved = () => draft.status === "saved";
            const isExcluded = () => draft.status === "excluded";

            return (
              <div
                class={`p-3 rounded-2xl border transition-all duration-200 ${
                  isSaved()
                    ? "bg-emerald-50/60 border-emerald-200/80 opacity-95"
                    : isExcluded()
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : draft.status === "failed"
                    ? "bg-rose-50/60 border-rose-200"
                    : draft.status === "invalid"
                    ? "bg-amber-50/40 border-amber-200"
                    : "bg-white border-forest/10 shadow-xs hover:border-forest/30"
                }`}
              >
                {/* Collapsed summary row */}
                <div class="flex items-start gap-2.5">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={draft.selected}
                    disabled={isSaved() || isExcluded()}
                    onChange={() => toggleDraftSelection(draft.id)}
                    aria-label={`Select ${draft.name}`}
                    class="mt-1 w-4 h-4 rounded text-forest focus:ring-forest/30 border-forest/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />

                  {/* Icon & Details */}
                  <div
                    class="flex-1 min-w-0 cursor-pointer select-none"
                    onClick={() => toggleExpand(draft.id)}
                  >
                    <div class="flex items-center justify-between gap-1.5">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="material-icons text-[15px] text-earth/60 shrink-0">
                          {getKindIcon(draft.entryKind)}
                        </span>
                        <p
                          class={`text-xs font-semibold truncate leading-snug ${
                            isExcluded() ? "line-through text-earth/50" : "text-forest"
                          }`}
                        >
                          {draft.name}
                        </p>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        <span
                          class={`text-xs font-bold font-outfit ${
                            draft.type === "income" || draft.entryKind === "discount"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {draft.type === "income" || draft.entryKind === "discount" ? "+" : "-"}
                          {formatRupiah(draft.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata pills */}
                    <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {getStatusBadge(draft)}

                      <Show when={draft.categoryName}>
                        <span class="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-forest/5 text-forest border border-forest/10 truncate max-w-[110px]">
                          {draft.categoryName}
                        </span>
                      </Show>

                      <Show when={draft.accountName}>
                        <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-sage/50 text-earth border border-forest/10 truncate max-w-[100px]">
                          {draft.accountName}
                        </span>
                      </Show>

                      <Show when={draft.date}>
                        <span class="text-[9px] text-earth/60 font-medium">
                          {draft.date}
                        </span>
                      </Show>
                    </div>

                    {/* Inline error hint */}
                    <Show when={draft.errorMessage}>
                      <p class="text-[10px] text-rose-600 font-medium mt-1">
                        {draft.errorMessage}
                      </p>
                    </Show>
                  </div>

                  {/* Row Actions */}
                  <div class="flex items-center gap-0.5 shrink-0">
                    <Show when={!isSaved()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExcludeDraft(draft.id);
                        }}
                        class={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isExcluded()
                            ? "text-earth/60 hover:text-forest hover:bg-forest/5"
                            : "text-earth/40 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={isExcluded() ? "Include entry" : "Exclude entry"}
                        aria-label={isExcluded() ? `Include ${draft.name}` : `Exclude ${draft.name}`}
                      >
                        <span class="material-icons text-[16px]">
                          {isExcluded() ? "add_circle_outline" : "remove_circle_outline"}
                        </span>
                      </button>
                    </Show>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(draft.id);
                      }}
                      class="w-7 h-7 rounded-lg text-earth/50 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-transform cursor-pointer"
                      aria-expanded={isExpanded()}
                      aria-label="Toggle edit details"
                    >
                      <span
                        class={`material-icons text-[16px] transition-transform duration-200 ${
                          isExpanded() ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                </div>

                {/* Expanded Editing Form */}
                <Show when={isExpanded()}>
                  <div class="mt-3 pt-3 border-t border-forest/10 space-y-2.5 animate-slide-down">
                    {/* Name */}
                    <div>
                      <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        disabled={isSaved()}
                        value={draft.name}
                        onInput={(e) =>
                          updateBatchDraft(
                            draft.id,
                            { name: e.currentTarget.value },
                            accounts(),
                            categories(),
                          )
                        }
                        class="w-full px-2.5 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                      />
                      <Show when={draft.errors?.name}>
                        <p class="text-[10px] text-rose-600 mt-0.5">{draft.errors?.name}</p>
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
                          disabled={isSaved()}
                          min="1"
                          value={draft.amount}
                          onInput={(e) => {
                            const val = parseFloat(e.currentTarget.value) || 0;
                            updateBatchDraft(
                              draft.id,
                              { amount: val },
                              accounts(),
                              categories(),
                            );
                          }}
                          class="w-full px-2.5 py-1.5 text-xs font-bold font-outfit rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                        />
                        <Show when={draft.errors?.amount}>
                          <p class="text-[10px] text-rose-600 mt-0.5">{draft.errors?.amount}</p>
                        </Show>
                      </div>

                      <div>
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
                          Type
                        </label>
                        <div class="flex rounded-xl border border-forest/20 overflow-hidden p-0.5 bg-forest/5">
                          <button
                            type="button"
                            disabled={isSaved()}
                            onClick={() =>
                              updateBatchDraft(
                                draft.id,
                                { type: "expense", entryKind: draft.entryKind === "discount" ? "item" : draft.entryKind },
                                accounts(),
                                categories(),
                              )
                            }
                            class={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                              draft.type === "expense"
                                ? "bg-white text-rose-600 shadow-xs"
                                : "text-earth/60 hover:text-forest"
                            }`}
                          >
                            Expense
                          </button>
                          <button
                            type="button"
                            disabled={isSaved()}
                            onClick={() =>
                              updateBatchDraft(
                                draft.id,
                                { type: "income" },
                                accounts(),
                                categories(),
                              )
                            }
                            class={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                              draft.type === "income"
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
                          disabled={isSaved()}
                          value={draft.categoryId || ""}
                          onChange={(e) => {
                            const catId = e.currentTarget.value || null;
                            updateBatchDraft(
                              draft.id,
                              { categoryId: catId },
                              accounts(),
                              categories(),
                            );
                          }}
                          class="w-full px-2 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                        >
                          <option value="">Select Category...</option>
                          <For each={categories()}>
                            {(cat) => (
                              <option value={cat.id} selected={draft.categoryId === cat.id}>
                                {cat.name}
                              </option>
                            )}
                          </For>
                        </select>
                        <Show when={draft.errors?.categoryId}>
                          <p class="text-[10px] text-rose-600 mt-0.5">{draft.errors?.categoryId}</p>
                        </Show>
                      </div>

                      <div>
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
                          Account
                        </label>
                        <select
                          disabled={isSaved()}
                          value={draft.accountId || ""}
                          onChange={(e) => {
                            const accId = e.currentTarget.value || null;
                            updateBatchDraft(
                              draft.id,
                              { accountId: accId },
                              accounts(),
                              categories(),
                            );
                          }}
                          class="w-full px-2 py-1.5 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                        >
                          <option value="">Select Account...</option>
                          <For each={accounts()}>
                            {(acc) => (
                              <option value={acc.id} selected={draft.accountId === acc.id}>
                                {acc.name}
                              </option>
                            )}
                          </For>
                        </select>
                        <Show when={draft.errors?.accountId}>
                          <p class="text-[10px] text-rose-600 mt-0.5">{draft.errors?.accountId}</p>
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
                          disabled={isSaved()}
                          value={draft.date || ""}
                          onInput={(e) =>
                            updateBatchDraft(
                              draft.id,
                              { date: e.currentTarget.value },
                              accounts(),
                              categories(),
                            )
                          }
                          class="w-full px-2 py-1 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                        />
                      </div>

                      <div>
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-earth/70 mb-1">
                          Line Kind
                        </label>
                        <select
                          disabled={isSaved()}
                          value={draft.entryKind}
                          onChange={(e) => {
                            const kind = e.currentTarget.value as EntryKind;
                            updateBatchDraft(
                              draft.id,
                              {
                                entryKind: kind,
                                type: kind === "discount" ? "income" : draft.type,
                              },
                              accounts(),
                              categories(),
                            );
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
                          disabled={isSaved()}
                          placeholder="e.g. Lunch with team"
                          value={draft.note || ""}
                          onInput={(e) =>
                            updateBatchDraft(
                              draft.id,
                              { note: e.currentTarget.value },
                              accounts(),
                              categories(),
                            )
                          }
                          class="w-full px-2.5 py-1 text-xs rounded-xl border border-forest/20 text-forest bg-white focus:outline-none focus:ring-1 focus:ring-forest/40 disabled:bg-slate-50 disabled:text-earth/60"
                        />
                      </div>

                      <div class="pt-4 flex items-center gap-1.5 select-none">
                        <input
                          type="checkbox"
                          id={`rec-${draft.id}`}
                          disabled={isSaved()}
                          checked={draft.isRecurring || false}
                          onChange={(e) =>
                            updateBatchDraft(
                              draft.id,
                              { isRecurring: e.currentTarget.checked },
                              accounts(),
                              categories(),
                            )
                          }
                          class="w-3.5 h-3.5 rounded text-forest focus:ring-forest/30 border-forest/20 cursor-pointer"
                        />
                        <label for={`rec-${draft.id}`} class="text-[10px] font-bold text-earth/80 uppercase cursor-pointer">
                          Recurring
                        </label>
                      </div>
                    </div>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Sticky Bottom Summary & Actions */}
      <div class="p-3.5 bg-white border-t border-forest/10 shrink-0 space-y-2.5 shadow-premium">
        {/* Reconciliation Warning or Info */}
        <Show when={reconciliation()}>
          {(rec) => (
            <div
              class={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                rec().isReconciled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="material-icons text-[16px] shrink-0">
                  {rec().isReconciled ? "check_circle" : "warning_amber"}
                </span>
                <span class="truncate">
                  {rec().isReconciled
                    ? `Reconciled: Receipt matches selected total (${formatRupiah(rec().actual)})`
                    : `Diff: ${formatRupiah(rec().diff)} (Receipt: ${formatRupiah(rec().expected)}, Selected: ${formatRupiah(rec().actual)})`}
                </span>
              </div>
            </div>
          )}
        </Show>

        <div class="flex items-center justify-between text-xs">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold uppercase tracking-wider text-earth/60">
              Selected: {validSelectedCount()} valid
            </span>
            <span class="text-sm font-extrabold font-outfit text-forest">
              {formatRupiah(selectedNetTotal())}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <Show
              when={savedCount() > 0}
              fallback={
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving()}
                  class="px-3 py-2 rounded-xl border border-forest/20 text-forest text-xs font-semibold hover:bg-forest/5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              }
            >
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSaving()}
                class="px-3 py-2 rounded-xl border border-forest/20 text-forest text-xs font-bold hover:bg-forest/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Finish ({savedCount()} saved)
              </button>
            </Show>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving() || validSelectedCount() === 0}
              class="px-4 py-2 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest/90 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Show when={isSaving()} fallback={`Save ${validSelectedCount()} valid`}>
                <span class="material-icons text-[14px] animate-spin">refresh</span>
                <span>Saving…</span>
              </Show>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchTransactionReview;
