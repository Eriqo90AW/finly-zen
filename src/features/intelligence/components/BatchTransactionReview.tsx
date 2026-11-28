import { For, createMemo, createResource, createSignal } from "solid-js";
import type { PendingBatchTransactionAction } from "../../../types/intelligence";
import { intelligenceState } from "../../../store/intelligenceStore";
import {
  cancelPendingAction,
  finishBatchAction,
  saveBatchTransactions,
} from "../../../services/intelligence/chatOrchestrator";
import { getAccounts, getCategories } from "../../../data/expenseData";
import BatchDraftRow from "./BatchDraftRow";
import BatchSummaryFooter from "./BatchSummaryFooter";
import BatchSummaryHeader from "./BatchSummaryHeader";
import { calculateReconciliation, calculateSelectedNetTotal } from "./batchReviewHelpers";

interface Props {
  action: PendingBatchTransactionAction;
}

export const BatchTransactionReview = (props: Props) => {
  const [categoriesResource] = createResource(getCategories);
  const [accountsResource] = createResource(getAccounts);

  const [expandedDraftIds, setExpandedDraftIds] = createSignal<Set<string>>(new Set());
  const [isSaving, setIsSaving] = createSignal(false);

  const categories = () => categoriesResource() || [];
  const accounts = () => accountsResource() || [];

  const currentAction = () =>
    intelligenceState.pendingAction?.kind === "transaction-batch"
      ? intelligenceState.pendingAction
      : props.action;

  const drafts = () => currentAction().drafts || [];

  const savedCount = createMemo(() => drafts().filter((d) => d.status === "saved").length);

  const validSelectedCount = createMemo(
    () =>
      drafts().filter((d) => d.selected && (d.status === "ready" || d.status === "failed")).length,
  );

  const selectedNetTotal = createMemo(() => calculateSelectedNetTotal(drafts()));

  const reconciliation = createMemo(() =>
    calculateReconciliation(currentAction().receiptTotal, selectedNetTotal()),
  );

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

  return (
    <div class="flex flex-col flex-1 min-h-0 bg-page-bg">
      <BatchSummaryHeader
        action={currentAction()}
        totalCount={drafts().length}
        savedCount={savedCount()}
        accounts={accounts()}
      />

      <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 min-h-0">
        <For each={drafts()}>
          {(draft) => (
            <BatchDraftRow
              draft={draft}
              isExpanded={expandedDraftIds().has(draft.id)}
              onToggleExpand={() => toggleExpand(draft.id)}
              accounts={accounts()}
              categories={categories()}
            />
          )}
        </For>
      </div>

      <BatchSummaryFooter
        reconciliation={reconciliation()}
        validSelectedCount={validSelectedCount()}
        selectedNetTotal={selectedNetTotal()}
        savedCount={savedCount()}
        isSaving={isSaving()}
        onCancel={handleCancel}
        onFinish={handleFinish}
        onSave={handleSave}
      />
    </div>
  );
};

export default BatchTransactionReview;
