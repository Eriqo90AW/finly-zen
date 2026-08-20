import { DEFAULT_CONFIG } from "../config/defaults";
import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatMessage,
  OpenAIToolDefinition,
  StreamCallbacks,
} from "../types/intelligence";

function getConfig() {
  return DEFAULT_CONFIG.ai;
}

export function isHermesConfigured(): boolean {
  const { apiKey, baseUrl } = getConfig();
  return Boolean(apiKey && baseUrl);
}

// Backwards compatibility alias
export const isOpenCodeConfigured = isHermesConfigured;

function buildHeaders(): HeadersInit {
  const { apiKey } = getConfig();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function buildUrl(): string {
  const { baseUrl } = getConfig();
  let normalizedBase = (baseUrl || "").trim().replace(/\/+$/, "");

  // If in browser and pointing to remote domains directly, route through Vite proxy to bypass CORS
  if (typeof window !== "undefined") {
    if (
      normalizedBase.startsWith("https://openagent.ercloud.site") ||
      normalizedBase.startsWith("http://openagent.ercloud.site")
    ) {
      normalizedBase = normalizedBase.replace(
        /^https?:\/\/openagent\.ercloud\.site/,
        "/openagent-proxy",
      );
    } else if (
      normalizedBase.startsWith("https://opencode.ai") ||
      normalizedBase.startsWith("http://opencode.ai")
    ) {
      normalizedBase = normalizedBase.replace(
        /^https?:\/\/opencode\.ai/,
        "/opencode-proxy",
      );
    }
  }

  if (normalizedBase.endsWith("/chat/completions")) {
    return normalizedBase;
  }

  return `${normalizedBase}/chat/completions`;
}

type ApiMessage = {
  role: string;
  content: string | null;
  tool_calls?: ChatMessage["tool_calls"];
  tool_call_id?: string;
  name?: string;
};

function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter((m) => m.role !== "system" || Boolean(m.content?.trim()))
    .map((m) => {
      const base: ApiMessage = {
        role: m.role,
        content: m.content || null,
      };
      if (m.tool_calls?.length) base.tool_calls = m.tool_calls;
      if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
      if (m.name) base.name = m.name;
      return base;
    });
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  tools?: OpenAIToolDefinition[];
  stream?: boolean;
  callbacks?: StreamCallbacks;
}

export async function createChatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResponse> {
  const { messages, systemPrompt, tools, stream, callbacks } = options;
  const config = getConfig();
  const model = options.model || config.defaultModel || "finly";

  const apiMessages: ApiMessage[] = [];
  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }
  apiMessages.push(...toApiMessages(messages));

  const body: Record<string, unknown> = {
    model,
    messages: apiMessages,
    stream: Boolean(stream),
  };
  if (tools?.length) body.tools = tools;

  const response = await fetch(buildUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } | string };
      if (typeof parsed.error === "string") {
        parsedMessage = parsed.error;
      } else if (parsed.error?.message) {
        parsedMessage = parsed.error.message;
      }
    } catch {
      // keep raw error text
    }
    const details = parsedMessage.trim() || response.statusText || "Request failed";
    throw new Error(`Hermes API error (${response.status}): ${details}`);
  }

  if (stream && response.body) {
    return parseStreamingResponse(response.body, callbacks);
  }

  return response.json() as Promise<ChatCompletionResponse>;
}

async function parseStreamingResponse(
  body: ReadableStream<Uint8Array>,
  callbacks?: StreamCallbacks,
): Promise<ChatCompletionResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let insideThinkTag = false;
  const toolCalls = new Map<
    number,
    { id: string; type: "function"; function: { name: string; arguments: string } }
  >();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const chunk = JSON.parse(data) as ChatCompletionChunk;
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // 1. Dedicated reasoning field (DeepSeek / Hermes)
          const rawReasoning = delta.reasoning_content || delta.reasoning;
          if (rawReasoning) {
            reasoning += rawReasoning;
            callbacks?.onReasoningToken?.(rawReasoning);
          }

          // 2. Main content (with inline <think> tags fallback parsing)
          if (delta.content) {
            let chunkText = delta.content;

            if (chunkText.includes("<think>")) {
              insideThinkTag = true;
              chunkText = chunkText.replace("<think>", "");
            }

            if (insideThinkTag) {
              if (chunkText.includes("</think>")) {
                const parts = chunkText.split("</think>");
                reasoning += parts[0];
                callbacks?.onReasoningToken?.(parts[0]);
                insideThinkTag = false;
                const rest = parts[1] || "";
                if (rest) {
                  content += rest;
                  callbacks?.onToken?.(rest);
                }
              } else {
                reasoning += chunkText;
                callbacks?.onReasoningToken?.(chunkText);
              }
            } else {
              content += chunkText;
              callbacks?.onToken?.(chunkText);
            }
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.get(tc.index);
              if (!existing) {
                toolCalls.set(tc.index, {
                  id: tc.id || "",
                  type: "function",
                  function: {
                    name: tc.function?.name || "",
                    arguments: tc.function?.arguments || "",
                  },
                });
              } else {
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.function.name += tc.function.name;
                if (tc.function?.arguments)
                  existing.function.arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    callbacks?.onDone?.();
  }

  // Clean up any inline think/thought tags that were not caught during incremental streaming
  if (content.includes("<think>") && content.includes("</think>")) {
    const match = content.match(/<think>([\s\S]*?)<\/think>/);
    if (match) {
      reasoning = (reasoning ? reasoning + "\n" + match[1] : match[1]).trim();
      content = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    }
  } else if (content.includes("<thought>") && content.includes("</thought>")) {
    const match = content.match(/<thought>([\s\S]*?)<\/thought>/);
    if (match) {
      reasoning = (reasoning ? reasoning + "\n" + match[1] : match[1]).trim();
      content = content.replace(/<thought>[\s\S]*?<\/thought>/, "").trim();
    }
  }

  const toolCallsArray = Array.from(toolCalls.values()).filter((tc) => tc.id);
  return {
    id: "stream",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: content || null,
          reasoning: reasoning || null,
          tool_calls: toolCallsArray.length ? toolCallsArray : undefined,
        },
        finish_reason: toolCallsArray.length ? "tool_calls" : "stop",
      },
    ],
  };
}
