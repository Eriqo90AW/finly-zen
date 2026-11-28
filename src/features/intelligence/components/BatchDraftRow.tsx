import { Show } from "solid-js";
import type { Account, Category } from "../../../types";
import type { TransactionDraft } from "../../../types/intelligence";
import { toggleDraftSelection, toggleExcludeDraft } from "../../../store/intelligenceStore";
import { formatRupiah } from "../../../utils/format";
import {
  getDraftCardClasses,
  getKindIcon,
  getStatusBadgeStyle,
} from "./batchReviewHelpers";
import BatchDraftEditForm from "./BatchDraftEditForm";

interface BatchDraftRowProps {
  draft: TransactionDraft;
  isExpanded: boolean;
  onToggleExpand: () => void;
  accounts: Account[];
  categories: Category[];
}

export default function BatchDraftRow(props: BatchDraftRowProps) {
  const isSaved = () => props.draft.status === "saved";
  const isExcluded = () => props.draft.status === "excluded";
  const badge = () => getStatusBadgeStyle(props.draft.status);

  return (
    <div
      class={`p-3 rounded-2xl border transition-all duration-200 ${getDraftCardClasses(props.draft.status)}`}
    >
      {/* Collapsed summary row */}
      <div class="flex items-start gap-2.5">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={props.draft.selected}
          disabled={isSaved() || isExcluded()}
          onChange={() => toggleDraftSelection(props.draft.id)}
          aria-label={`Select ${props.draft.name}`}
          class="mt-1 w-4 h-4 rounded text-forest focus:ring-forest/30 border-forest/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        />

        {/* Icon & Details */}
        <div
          class="flex-1 min-w-0 cursor-pointer select-none"
          onClick={() => props.onToggleExpand()}
        >
          <div class="flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="material-icons text-[15px] text-earth/60 shrink-0">
                {getKindIcon(props.draft.entryKind)}
              </span>
              <p
                class={`text-xs font-semibold truncate leading-snug ${
                  isExcluded() ? "line-through text-earth/50" : "text-forest"
                }`}
              >
                {props.draft.name}
              </p>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <span
                class={`text-xs font-bold font-outfit ${
                  props.draft.type === "income" || props.draft.entryKind === "discount"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {props.draft.type === "income" || props.draft.entryKind === "discount" ? "+" : "-"}
                {formatRupiah(props.draft.amount)}
              </span>
            </div>
          </div>

          {/* Metadata pills */}
          <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span
              class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge().classes}`}
            >
              <span class={`material-icons text-[12px] ${badge().iconSpin ? "animate-spin" : ""}`}>
                {badge().icon}
              </span>{" "}
              {badge().label}
            </span>

            <Show when={props.draft.categoryName}>
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-forest/5 text-forest border border-forest/10 truncate max-w-[110px]">
                {props.draft.categoryName}
              </span>
            </Show>

            <Show when={props.draft.accountName}>
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-sage/50 text-earth border border-forest/10 truncate max-w-[100px]">
                {props.draft.accountName}
              </span>
            </Show>

            <Show when={props.draft.date}>
              <span class="text-[9px] text-earth/60 font-medium">{props.draft.date}</span>
            </Show>
          </div>

          {/* Inline error hint */}
          <Show when={props.draft.errorMessage}>
            <p class="text-[10px] text-rose-600 font-medium mt-1">{props.draft.errorMessage}</p>
          </Show>
        </div>

        {/* Row Actions */}
        <div class="flex items-center gap-0.5 shrink-0">
          <Show when={!isSaved()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExcludeDraft(props.draft.id);
              }}
              class={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isExcluded()
                  ? "text-earth/60 hover:text-forest hover:bg-forest/5"
                  : "text-earth/40 hover:text-rose-600 hover:bg-rose-50"
              }`}
              title={isExcluded() ? "Include entry" : "Exclude entry"}
              aria-label={
                isExcluded() ? `Include ${props.draft.name}` : `Exclude ${props.draft.name}`
              }
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
              props.onToggleExpand();
            }}
            class="w-7 h-7 rounded-lg text-earth/50 hover:text-forest hover:bg-forest/5 flex items-center justify-center transition-transform cursor-pointer"
            aria-expanded={props.isExpanded}
            aria-label="Toggle edit details"
          >
            <span
              class={`material-icons text-[16px] transition-transform duration-200 ${
                props.isExpanded ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Editing Form */}
      <Show when={props.isExpanded}>
        <BatchDraftEditForm
          draft={props.draft}
          isSaved={isSaved()}
          accounts={props.accounts}
          categories={props.categories}
        />
      </Show>
    </div>
  );
}
