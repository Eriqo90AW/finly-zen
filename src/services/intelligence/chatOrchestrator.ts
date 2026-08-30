import { createChatCompletion, isHermesConfigured } from "../../lib/hermesClient";
import { buildUserContext, formatContextForPrompt } from "../../lib/userContext";
import { extractTextFromImage } from "../../lib/ocrService";
import { addTransactions } from "../../data/expenseData";
import {
  TOOL_LABELS,
  executeTool,
  getToolsForProfile,
} from "./tools";
import {
  addMessage,
  appendToMessage,
  appendToReasoning,
  clearIntelligenceChat as rawClearIntelligenceChat,
  createMessageId,
  getApiMessages,
  intelligenceState,
  setActiveProfile,
  setActiveToolLabel,
  setIntelligenceError,
  setPendingAction,
  setStreaming,
  updateDraftStatus,
  updateMessage,
} from "../../store/intelligenceStore";
import type {
  BatchSaveResult,
  ChatCompletionResponse,
  ChatToolCall,
  PendingAction,
  PendingBatchTransactionAction,
  PendingTransferAction,
} from "../../types/intelligence";
import { formatRupiah } from "../../utils/format";

export interface ImageAttachment {
  base64: string;
  fileName: string;
}

const MAX_TOOL_ROUNDS = 5;

let pendingActionResolver: ((result: string) => void) | null = null;
let currentAbortController: AbortController | null = null;

export function stopIntelligenceStream(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  setStreaming(false);
  setActiveToolLabel(null);
}

function waitForPendingActionDecision(): Promise<string> {
  return new Promise((resolve) => {
    pendingActionResolver = resolve;
  });
}

function resolvePendingAction(result: string) {
  pendingActionResolver?.(result);
  pendingActionResolver = null;
}

export async function saveBatchTransactions(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action || action.kind !== "transaction-batch") return;

  const validDraftsToSave = action.drafts.filter(
    (d) => d.selected && (d.status === "ready" || d.status === "failed"),
  );

  if (validDraftsToSave.length === 0) return;

  // Mark selected drafts as saving
  for (const draft of validDraftsToSave) {
    updateDraftStatus(draft.id, "saving");
  }

  const model = action.originatingProfile || intelligenceState.activeProfile || "finly";

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
      if (res && res.success && res.data) {
        updateDraftStatus(draft.id, "saved", undefined, res.data.transaction_id);
      } else {
        updateDraftStatus(
          draft.id,
          "failed",
          res?.error || "Failed to insert transaction into database.",
        );
      }
    }

    // Check updated batch status
    const updatedAction = intelligenceState.pendingAction as PendingBatchTransactionAction | null;
    if (!updatedAction) return;

    const remainingUnsaved = updatedAction.drafts.filter(
      (d) => d.status !== "saved" && d.status !== "excluded",
    );

    // If all drafts are now saved (or excluded), automatically finalize
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
        error: draft.errorMessage || (draft.status === "invalid" ? "Validation incomplete" : "Not saved"),
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

  // If this is a batch action and any row was already saved, finalize instead of discarding
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

export function resetConversation(profile?: string): void {
  if (pendingActionResolver) {
    resolvePendingAction(
      JSON.stringify({
        success: false,
        status: "cancelled",
        cancelled: true,
      }),
    );
  }
  rawClearIntelligenceChat(profile);
}

async function callModel(
  systemPrompt: string,
  model: string,
): Promise<ChatCompletionResponse> {
  const messages = getApiMessages(model);
  const assistantId = createMessageId();

  addMessage(model, {
    id: assistantId,
    role: "assistant",
    content: "",
    reasoning: "",
    createdAt: Date.now(),
    isStreaming: true,
  });

  const tools = getToolsForProfile(model);

  const response = await createChatCompletion({
    messages,
    systemPrompt,
    model,
    tools,
    stream: true,
    signal: currentAbortController?.signal,
    callbacks: {
      onToken: (token) => appendToMessage(model, assistantId, token),
      onReasoningToken: (token) => appendToReasoning(model, assistantId, token),
      onToolCallStart: (label) => setActiveToolLabel(label),
    },
  });

  const assistantMessage = response.choices[0]?.message;
  updateMessage(model, assistantId, {
    content: assistantMessage?.content || "",
    reasoning: assistantMessage?.reasoning || undefined,
    tool_calls: assistantMessage?.tool_calls,
    isStreaming: false,
  });

  return response;
}

async function runAgentLoop(
  systemPrompt: string,
  pathname: string,
  model: string,
): Promise<void> {
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const response = await callModel(systemPrompt, model);
    const toolCalls = response.choices[0]?.message?.tool_calls;

    if (!toolCalls?.length) break;

    const ctx = await buildUserContext(pathname);

    // Check if there are transaction proposals that should be consolidated into one batch
    const transactionToolCalls = toolCalls.filter(
      (tc) =>
        tc.function.name === "propose_add_transaction" ||
        tc.function.name === "propose_add_transactions",
    );

    const nonTransactionToolCalls = toolCalls.filter(
      (tc) =>
        tc.function.name !== "propose_add_transaction" &&
        tc.function.name !== "propose_add_transactions",
    );

    // 1. Execute non-transaction tool calls first
    for (const toolCall of nonTransactionToolCalls) {
      const toolName = toolCall.function.name;
      setActiveToolLabel(TOOL_LABELS[toolName] || toolName);

      const outcome = await executeTool(
        toolCall.function.name,
        toolCall.function.arguments,
        ctx,
        toolCall.id,
      );

      let toolContent: string;
      if (outcome.kind === "pending") {
        setPendingAction(outcome.pendingAction);
        toolContent = await waitForPendingActionDecision();
      } else {
        toolContent = JSON.stringify(outcome.data);
      }

      addMessage(model, {
        id: createMessageId(),
        role: "tool",
        content: toolContent,
        tool_call_id: toolCall.id,
        name: toolName,
        createdAt: Date.now(),
      });

      setActiveToolLabel(null);
    }

    // 2. Execute & consolidate transaction tool calls
    if (transactionToolCalls.length > 0) {
      if (transactionToolCalls.length === 1) {
        const tc = transactionToolCalls[0];
        const outcome = await executeTool(
          tc.function.name,
          tc.function.arguments,
          ctx,
          tc.id,
        );

        let toolContent: string;
        if (outcome.kind === "pending") {
          setPendingAction(outcome.pendingAction);
          toolContent = await waitForPendingActionDecision();
        } else {
          toolContent = JSON.stringify(outcome.data);
        }

        addMessage(model, {
          id: createMessageId(),
          role: "tool",
          content: toolContent,
          tool_call_id: tc.id,
          name: tc.function.name,
          createdAt: Date.now(),
        });
      } else {
        // Multiple transaction proposals in one response: consolidate them!
        const consolidatedDrafts: PendingBatchTransactionAction["drafts"] = [];
        const toolCallIds: string[] = [];
        let merchant: string | undefined;
        let source: "chat" | "ocr" = "chat";
        let receiptTotal: number | undefined;

        for (const tc of transactionToolCalls) {
          toolCallIds.push(tc.id);
          const outcome = await executeTool(
            tc.function.name,
            tc.function.arguments,
            ctx,
            tc.id,
          );

          if (outcome.kind === "pending" && outcome.pendingAction.kind === "transaction-batch") {
            const batch = outcome.pendingAction;
            consolidatedDrafts.push(...batch.drafts);
            if (batch.merchant && !merchant) merchant = batch.merchant;
            if (batch.source === "ocr") source = "ocr";
            if (batch.receiptTotal && !receiptTotal) receiptTotal = batch.receiptTotal;
          }
        }

        if (consolidatedDrafts.length > 0) {
          const combinedAction: PendingBatchTransactionAction = {
            id: crypto.randomUUID ? crypto.randomUUID() : `combined-${Date.now()}`,
            kind: "transaction-batch",
            toolCallId: toolCallIds[0],
            toolCallIds,
            toolName: "propose_add_transactions",
            source,
            merchant,
            receiptTotal,
            drafts: consolidatedDrafts,
            originatingProfile: model,
            originatingPath: pathname,
            createdAt: Date.now(),
          };

          setPendingAction(combinedAction);
          const batchDecisionJson = await waitForPendingActionDecision();

          // Post tool message for every consolidated tool call
          for (const tId of toolCallIds) {
            addMessage(model, {
              id: createMessageId(),
              role: "tool",
              content: batchDecisionJson,
              tool_call_id: tId,
              name: "propose_add_transactions",
              createdAt: Date.now(),
            });
          }
        }
      }

      // After a transaction proposal, break agent loop to await user's next request
      break;
    }
  }
}

export async function sendIntelligenceMessage(
  text: string,
  pathname?: string,
  attachment?: ImageAttachment,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;

  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const ctx = await buildUserContext(currentPath);
  const model = ctx.currentPage.model || "finly";

  setActiveProfile(model);

  if (!isHermesConfigured()) {
    setIntelligenceError(
      "Hermes Agent is not configured. Add AI_API_KEY to your .env file.",
    );
    return;
  }

  setIntelligenceError(null);
  setStreaming(true);
  currentAbortController = new AbortController();

  const userMessageId = createMessageId();

  if (attachment) {
    addMessage(model, {
      id: userMessageId,
      role: "user",
      content: trimmed || `[Attached image: ${attachment.fileName}]`,
      imageBase64: attachment.base64,
      imageFileName: attachment.fileName,
      isOcrProcessing: true,
      createdAt: Date.now(),
    });

    setActiveToolLabel("Scanning image text (OCR)");

    let ocrText = "";
    let ocrConfidence = 0;
    try {
      const ocrResult = await extractTextFromImage(attachment.base64);
      ocrText = ocrResult.rawText;
      ocrConfidence = ocrResult.confidence;
    } catch (ocrErr) {
      console.warn("[OCR] Error extracting text:", ocrErr);
    } finally {
      setActiveToolLabel(null);
    }

    const confidenceLabel = ocrConfidence > 0 ? ` (OCR Confidence: ${Math.round(ocrConfidence)}%)` : "";
    const ocrSnippet = ocrText
      ? `[Uploaded Receipt / Image: ${attachment.fileName}${confidenceLabel}]\nExtracted Text (OCR):\n"""\n${ocrText}\n"""\n\n${
          trimmed
            ? `User Note: ${trimmed}`
            : "Please extract all purchasable line items, quantities, extended line prices, adjustments (taxes, service charges, discounts), receipt total, merchant name, and date. Call propose_add_transactions with source: 'ocr', merchant, receipt_total, ocr_confidence, and all transaction drafts."
        }`
      : (trimmed || `[Uploaded Image: ${attachment.fileName} - No text could be extracted. Please provide transaction details manually.]`);

    updateMessage(model, userMessageId, {
      isOcrProcessing: false,
      content: ocrSnippet,
    });
  } else {
    addMessage(model, {
      id: userMessageId,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    });
  }

  try {
    const systemPrompt = formatContextForPrompt(ctx);
    await runAgentLoop(systemPrompt, currentPath, model);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      // User requested stop
    } else {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setIntelligenceError(message);
      addMessage(model, {
        id: createMessageId(),
        role: "assistant",
        content: `Sorry, I ran into an error: ${message}`,
        createdAt: Date.now(),
      });
    }
  } finally {
    setStreaming(false);
    setActiveToolLabel(null);
    currentAbortController = null;
  }
}

