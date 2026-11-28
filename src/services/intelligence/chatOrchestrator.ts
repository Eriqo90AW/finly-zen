import { isHermesConfigured } from "../../lib/hermesClient";
import { buildUserContext, formatContextForPrompt } from "../../lib/userContext";
import {
  addMessage,
  clearIntelligenceChat as rawClearIntelligenceChat,
  createMessageId,
  setActiveProfile,
  setActiveToolLabel,
  setIntelligenceError,
  setStreaming,
} from "../../store/intelligenceStore";
import {
  cancelPendingAction,
  confirmTransferAction,
  finishBatchAction,
  saveBatchTransactions,
} from "./batchActionRunner";
import {
  type ImageAttachment,
  appendUserMessageWithOptionalOcr,
} from "./ocrMessageBuilder";
import {
  clearStreamAbortController,
  createStreamAbortController,
  hasPendingActionResolver,
  resolvePendingAction,
  stopIntelligenceStream,
} from "./orchestratorState";
import { runAgentLoop } from "./toolLoopRunner";

export type { ImageAttachment };
export {
  cancelPendingAction,
  confirmTransferAction,
  finishBatchAction,
  saveBatchTransactions,
  stopIntelligenceStream,
};

export function resetConversation(profile?: string): void {
  if (hasPendingActionResolver()) {
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
  createStreamAbortController();

  await appendUserMessageWithOptionalOcr(model, trimmed, attachment);

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
    clearStreamAbortController();
  }
}
