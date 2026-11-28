import { createChatCompletion } from "../../lib/hermesClient";
import { buildUserContext } from "../../lib/userContext";
import {
  addMessage,
  appendToMessage,
  appendToReasoning,
  createMessageId,
  getApiMessages,
  setActiveToolLabel,
  setPendingAction,
  updateMessage,
} from "../../store/intelligenceStore";
import type {
  ChatCompletionResponse,
  ChatToolCall,
  PendingBatchTransactionAction,
} from "../../types/intelligence";
import {
  getStreamAbortSignal,
  waitForPendingActionDecision,
} from "./orchestratorState";
import { TOOL_LABELS, executeTool, getToolsForProfile } from "./tools";

const MAX_TOOL_ROUNDS = 5;

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
    signal: getStreamAbortSignal(),
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

async function handleTransactionToolCalls(
  transactionToolCalls: ChatToolCall[],
  ctx: Awaited<ReturnType<typeof buildUserContext>>,
  pathname: string,
  model: string,
): Promise<void> {
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
    return;
  }

  // Multiple transaction proposals in one response: consolidate them
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

  if (consolidatedDrafts.length === 0) return;

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

export async function runAgentLoop(
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

    if (transactionToolCalls.length > 0) {
      await handleTransactionToolCalls(transactionToolCalls, ctx, pathname, model);
      break;
    }
  }
}
