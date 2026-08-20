import { createChatCompletion, isHermesConfigured } from "../../lib/hermesClient";
import { buildUserContext, formatContextForPrompt } from "../../lib/userContext";
import {
  TOOL_LABELS,
  executeTool,
  getToolsForProfile,
} from "./tools";
import {
  addMessage,
  appendToMessage,
  appendToReasoning,
  createMessageId,
  getApiMessages,
  intelligenceState,
  setActiveProfile,
  setActiveToolLabel,
  setIntelligenceError,
  setPendingAction,
  setStreaming,
  updateMessage,
} from "../../store/intelligenceStore";
import type { ChatCompletionResponse, ChatToolCall } from "../../types/intelligence";

const MAX_TOOL_ROUNDS = 5;

let pendingActionResolver: ((result: string) => void) | null = null;

function waitForPendingActionDecision(): Promise<string> {
  return new Promise((resolve) => {
    pendingActionResolver = resolve;
  });
}

function resolvePendingAction(result: string) {
  pendingActionResolver?.(result);
  pendingActionResolver = null;
}

export async function confirmPendingAction(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action) return;

  setPendingAction(null);
  try {
    const result = await action.execute();
    resolvePendingAction(JSON.stringify({ success: true, data: result }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    resolvePendingAction(JSON.stringify({ success: false, error: message }));
  }
}

export async function cancelPendingAction(): Promise<void> {
  setPendingAction(null);
  resolvePendingAction(JSON.stringify({ success: false, cancelled: true }));
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
    callbacks: {
      onToken: (token) => appendToMessage(model, assistantId, token),
      onReasoningToken: (token) => appendToReasoning(model, assistantId, token),
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

async function executeToolCall(
  toolCall: ChatToolCall,
  ctx: Awaited<ReturnType<typeof buildUserContext>>,
  model: string,
): Promise<void> {
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
    for (const toolCall of toolCalls) {
      await executeToolCall(toolCall, ctx, model);
    }
  }
}

export async function sendIntelligenceMessage(
  text: string,
  pathname?: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const ctx = await buildUserContext(currentPath);
  const model = ctx.currentPage.model || "finly";

  setActiveProfile(model);

  if (!isHermesConfigured()) {
    setIntelligenceError(
      "Hermes Agent is not configured. Add VITE_AI_API_KEY to your .env file.",
    );
    return;
  }

  setIntelligenceError(null);
  setStreaming(true);

  addMessage(model, {
    id: createMessageId(),
    role: "user",
    content: trimmed,
    createdAt: Date.now(),
  });

  try {
    const systemPrompt = formatContextForPrompt(ctx);
    await runAgentLoop(systemPrompt, currentPath, model);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    setIntelligenceError(message);
    addMessage(model, {
      id: createMessageId(),
      role: "assistant",
      content: `Sorry, I ran into an error: ${message}`,
      createdAt: Date.now(),
    });
  } finally {
    setStreaming(false);
    setActiveToolLabel(null);
  }
}
