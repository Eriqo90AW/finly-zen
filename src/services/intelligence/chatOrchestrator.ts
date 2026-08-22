import { createChatCompletion, isHermesConfigured } from "../../lib/hermesClient";
import { buildUserContext, formatContextForPrompt } from "../../lib/userContext";
import { extractTextFromImage } from "../../lib/ocrService";
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

export async function confirmPendingAction(): Promise<void> {
  const action = intelligenceState.pendingAction;
  if (!action) return;

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
      content: "Done — confirmed",
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
    const message = e instanceof Error ? e.message : "Action failed";
    setIntelligenceError(message);
    addMessage(model, {
      id: createMessageId(),
      role: "assistant",
      content: `Failed to confirm action: ${message}`,
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

  stopIntelligenceStream();
  setPendingAction(null);

  const model = intelligenceState.activeProfile || "finly";

  addMessage(model, {
    id: createMessageId(),
    role: "assistant",
    content: "Done — cancelled",
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

async function executeToolCall(
  toolCall: ChatToolCall,
  ctx: Awaited<ReturnType<typeof buildUserContext>>,
  model: string,
): Promise<boolean> {
  const toolName = toolCall.function.name;
  setActiveToolLabel(TOOL_LABELS[toolName] || toolName);

  const outcome = await executeTool(
    toolCall.function.name,
    toolCall.function.arguments,
    ctx,
    toolCall.id,
  );

  let toolContent: string;
  let isPending = false;

  if (outcome.kind === "pending") {
    isPending = true;
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
  return isPending;
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
    let hadPendingAction = false;

    for (const toolCall of toolCalls) {
      const isPending = await executeToolCall(toolCall, ctx, model);
      if (isPending) {
        hadPendingAction = true;
      }
    }

    if (hadPendingAction) {
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
      "Hermes Agent is not configured. Add VITE_AI_API_KEY to your .env file.",
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
    try {
      const ocrResult = await extractTextFromImage(attachment.base64);
      ocrText = ocrResult.rawText;
    } catch (ocrErr) {
      console.warn("[OCR] Error extracting text:", ocrErr);
    } finally {
      setActiveToolLabel(null);
    }

    const ocrSnippet = ocrText
      ? `[Uploaded Receipt / Image: ${attachment.fileName}]\nExtracted Text (OCR):\n"""\n${ocrText}\n"""\n\n${trimmed ? `User Note: ${trimmed}` : "Please parse this receipt and propose adding the transaction if valid details (merchant, amount, etc.) are present."}`
      : (trimmed || `[Uploaded Image: ${attachment.fileName} - No text could be extracted]`);

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
