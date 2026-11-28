import { addTransactions } from "../../data/expenseData";
import { buildUserContext } from "../../lib/userContext";
import {
  addMessage,
  createMessageId,
  intelligenceState,
  setActiveToolLabel,
  setIntelligenceError,
  setPendingAction,
  setStreaming,
  updateDraftStatus,
} from "../../store/intelligenceStore";
import type {
  BatchSaveResult,
  PendingBatchTransactionAction,
} from "../../types/intelligence";
import { formatRupiah } from "../../utils/format";
import { resolvePendingAction, stopIntelligenceStream } from "./orchestratorState";

export async function saveBatchTransactions(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action || action.kind !== "transaction-batch") return;

  const validDraftsToSave = action.drafts.filter(
    (d) => d.selected && (d.status === "ready" || d.status === "failed"),
  );

  if (validDraftsToSave.length === 0) return;

  for (const draft of validDraftsToSave) {
    updateDraftStatus(draft.id, "saving");
  }

  try {
    const ctx = await buildUserContext(action.originatingPath);

    const items = validDraftsToSave.map((d) => ({
      name: d.name,
      amount: d.amount,
      type: d.type,
      accountId: d.accountId!,
      categoryId: d.categoryId!,
      note: d.note,
      isRecurring: d.isRecurring || false,
      createdAt: d.date ? new Date(`${d.date}T12:00:00Z`) : undefined,
      userId: ctx.userId,
    }));

    const results = await addTransactions(items, 4);

    for (let i = 0; i < validDraftsToSave.length; i++) {
      const draft = validDraftsToSave[i];
      const res = results[i];
      if (res?.success && res.data) {
        updateDraftStatus(draft.id, "saved", undefined, res.data.transaction_id);
      } else {
        updateDraftStatus(
          draft.id,
          "failed",
          res?.error || "Failed to insert transaction into database.",
        );
      }
    }

    const updatedAction = intelligenceState.pendingAction as PendingBatchTransactionAction | null;
    if (!updatedAction) return;

    const remainingUnsaved = updatedAction.drafts.filter(
      (d) => d.status !== "saved" && d.status !== "excluded",
    );

    if (remainingUnsaved.length === 0) {
      await finishBatchAction();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch save failed";
    setIntelligenceError(message);
    for (const draft of validDraftsToSave) {
      updateDraftStatus(draft.id, "failed", message);
    }
  }
}

export async function finishBatchAction(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action || action.kind !== "transaction-batch") return;

  stopIntelligenceStream();
  setPendingAction(null);

  const model = action.originatingProfile || intelligenceState.activeProfile || "finly";

  const saved: Array<{ draftId: string; transactionId: string }> = [];
  const failed: Array<{ draftId: string; error: string }> = [];
  const excluded: Array<{ draftId: string }> = [];

  let savedExpenses = 0;
  let savedIncomes = 0;

  for (const draft of action.drafts) {
    if (draft.status === "saved") {
      saved.push({
        draftId: draft.id,
        transactionId: draft.savedTransactionId || "saved",
      });
      if (draft.type === "income") {
        savedIncomes += draft.amount;
      } else {
        savedExpenses += draft.amount;
      }
    } else if (draft.status === "excluded") {
      excluded.push({ draftId: draft.id });
    } else {
      failed.push({
        draftId: draft.id,
        error:
          draft.errorMessage ||
          (draft.status === "invalid" ? "Validation incomplete" : "Not saved"),
      });
    }
  }

  const savedCount = saved.length;
  const failedCount = failed.length;
  const skippedCount = excluded.length;
  const savedNetAmount = savedExpenses - savedIncomes;

  const batchResult: BatchSaveResult = {
    saved,
    failed,
    excluded,
    savedCount,
    failedCount,
    skippedCount,
    savedNetAmount,
  };

  let summaryText = "";
  if (savedCount > 0) {
    const details = [];
    if (failedCount > 0) details.push(`${failedCount} failed`);
    if (skippedCount > 0) details.push(`${skippedCount} excluded`);
    const detailsStr = details.length > 0 ? ` (${details.join(", ")})` : "";
    summaryText = `Saved ${savedCount} transaction${savedCount === 1 ? "" : "s"} totaling ${formatRupiah(savedNetAmount)} net${detailsStr}.`;
  } else if (skippedCount > 0 && failedCount === 0) {
    summaryText = `All ${skippedCount} entries were excluded. No transactions saved.`;
  } else {
    summaryText = `No transactions were saved (${failedCount} failed or cancelled).`;
  }

  addMessage(model, {
    id: createMessageId(),
    role: "assistant",
    content: summaryText,
    createdAt: Date.now(),
  });

  resolvePendingAction(
    JSON.stringify({
      success: savedCount > 0,
      status: savedCount > 0 ? "confirmed_and_saved" : "cancelled",
      result: batchResult,
    }),
  );

  setStreaming(false);
  setActiveToolLabel(null);
}

export async function confirmTransferAction(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action || action.kind !== "transfer") return;

  stopIntelligenceStream();
  setPendingAction(null);

  const model = intelligenceState.activeProfile || "finly";

  try {
    const result = await action.execute();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("finly:data-changed", {
          detail: { source: "ai", tool: action.toolName },
        }),
      );
    }

    addMessage(model, {
      id: createMessageId(),
      role: "assistant",
      content: "Transfer completed successfully.",
      createdAt: Date.now(),
    });

    resolvePendingAction(
      JSON.stringify({
        success: true,
        status: "confirmed_and_saved",
        data: result,
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transfer failed";
    setIntelligenceError(message);
    addMessage(model, {
      id: createMessageId(),
      role: "assistant",
      content: `Failed to confirm transfer: ${message}`,
      createdAt: Date.now(),
    });
    resolvePendingAction(
      JSON.stringify({
        success: false,
        status: "error",
        error: message,
      }),
    );
  } finally {
    setStreaming(false);
    setActiveToolLabel(null);
  }
}

export async function cancelPendingAction(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action) return;

  if (action.kind === "transaction-batch") {
    const hasSavedRows = action.drafts.some((d) => d.status === "saved");
    if (hasSavedRows) {
      await finishBatchAction();
      return;
    }
  }

  stopIntelligenceStream();
  setPendingAction(null);

  const model = intelligenceState.activeProfile || "finly";

  addMessage(model, {
    id: createMessageId(),
    role: "assistant",
    content: "Action cancelled.",
    createdAt: Date.now(),
  });

  resolvePendingAction(
    JSON.stringify({
      success: false,
      status: "cancelled",
      cancelled: true,
    }),
  );

  setStreaming(false);
  setActiveToolLabel(null);
}
