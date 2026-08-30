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
  const isProxyConfigured =
    typeof import.meta !== "undefined" &&
    Boolean(import.meta.env?.HERMES_PROXY_CONFIGURED);
  return Boolean(apiKey || baseUrl || isProxyConfigured);
}

// Backwards compatibility alias
export const isOpenCodeConfigured = isHermesConfigured;

function buildHeaders(): HeadersInit {
  const { apiKey } = getConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildUrl(): string {
  const { baseUrl } = getConfig();
  let normalizedBase = (baseUrl || "").trim().replace(/\/+$/, "");

  // If in browser, route through proxy to bypass CORS (works in dev and vite preview)
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

  // If baseUrl already ends with /v1, append /chat/completions -> /v1/chat/completions
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
  signal?: AbortSignal;
}

export async function createChatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResponse> {
  const { messages, systemPrompt, tools, stream, callbacks, signal } = options;
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
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(buildUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
    signal,
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
    return parseStreamingResponse(response.body, callbacks, signal);
  }

  const result = (await response.json()) as ChatCompletionResponse;
  return extractXmlToolCallsFromResponse(result);
}

const OPENING_THINK_TAGS = [
  "<think>",
  "<thinking>",
  "<scratchpad>",
  "<reasoning>",
  "<inner_monologue>",
  "<thought>",
];

const CLOSING_THINK_TAGS = [
  "</think>",
  "</thinking>",
  "</scratchpad>",
  "</reasoning>",
  "</inner_monologue>",
  "</thought>",
];

function extractXmlToolCallsFromResponse(
  response: ChatCompletionResponse,
): ChatCompletionResponse {
  const message = response.choices?.[0]?.message;
  if (!message?.content) return response;

  const content = message.content;
  const toolCallRegex = /<tool_call(?:s)?>([\s\S]*?)<\/tool_call(?:s)?>/gi;
  let match: RegExpExecArray | null;
  const extractedCalls: NonNullable<ChatMessage["tool_calls"]> = message.tool_calls ? [...message.tool_calls] : [];
  let cleanedContent = content;

  while ((match = toolCallRegex.exec(content)) !== null) {
    let rawJson = match[1].trim();
    // Strip optional markdown code fence if present inside XML
    rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      const parsed = JSON.parse(rawJson) as { name?: string; arguments?: unknown };
      if (parsed.name) {
        extractedCalls.push({
          id: `call_${crypto.randomUUID().slice(0, 8)}`,
          type: "function",
          function: {
            name: parsed.name,
            arguments:
              typeof parsed.arguments === "string"
                ? parsed.arguments
                : JSON.stringify(parsed.arguments || {}),
          },
        });
        cleanedContent = cleanedContent.replace(match[0], "").trim();
      }
    } catch {
      // Malformed JSON inside tool_call tag, leave as is
    }
  }

  if (extractedCalls.length > 0) {
    message.tool_calls = extractedCalls;
    message.content = cleanedContent || null;
    if (response.choices?.[0]) {
      response.choices[0].finish_reason = "tool_calls";
    }
  }

  return response;
}

const OPENING_TOOL_TAGS = ["<tool_call>", "<tool_calls>", "<action>"];
const CLOSING_TOOL_TAGS = ["</tool_call>", "</tool_calls>", "</action>"];

async function parseStreamingResponse(
  body: ReadableStream<Uint8Array>,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let toolCallXmlBuffer = "";
  let insideReasoningTag = false;
  let insideToolCallTag = false;
  let textStreamBuffer = "";
  const toolCalls = new Map<
    number,
    { id: string; type: "function"; function: { name: string; arguments: string } }
  >();

  const processTextChunk = (incomingText: string) => {
    textStreamBuffer += incomingText;

    while (textStreamBuffer.length > 0) {
      if (!insideReasoningTag && !insideToolCallTag) {
        const lowerBuf = textStreamBuffer.toLowerCase();
        let earliestThinkIndex = -1;
        let matchedThinkTag = "";
        for (const tag of OPENING_THINK_TAGS) {
          const idx = lowerBuf.indexOf(tag);
          if (idx !== -1 && (earliestThinkIndex === -1 || idx < earliestThinkIndex)) {
            earliestThinkIndex = idx;
            matchedThinkTag = tag;
          }
        }

        let earliestToolIndex = -1;
        let matchedToolTag = "";
        for (const tag of OPENING_TOOL_TAGS) {
          const idx = lowerBuf.indexOf(tag);
          if (idx !== -1 && (earliestToolIndex === -1 || idx < earliestToolIndex)) {
            earliestToolIndex = idx;
            matchedToolTag = tag;
          }
        }

        if (earliestThinkIndex !== -1 && (earliestToolIndex === -1 || earliestThinkIndex < earliestToolIndex)) {
          const beforeTag = textStreamBuffer.slice(0, earliestThinkIndex);
          if (beforeTag) {
            content += beforeTag;
            callbacks?.onToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(earliestThinkIndex + matchedThinkTag.length);
          insideReasoningTag = true;
        } else if (earliestToolIndex !== -1) {
          const beforeTag = textStreamBuffer.slice(0, earliestToolIndex);
          if (beforeTag) {
            content += beforeTag;
            callbacks?.onToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(earliestToolIndex + matchedToolTag.length);
          insideToolCallTag = true;
          callbacks?.onToolCallStart?.("Preparing action");
        } else {
          const lastLt = textStreamBuffer.lastIndexOf("<");
          if (lastLt !== -1 && textStreamBuffer.length - lastLt < 20) {
            const safeText = textStreamBuffer.slice(0, lastLt);
            if (safeText) {
              content += safeText;
              callbacks?.onToken?.(safeText);
            }
            textStreamBuffer = textStreamBuffer.slice(lastLt);
            break;
          } else {
            content += textStreamBuffer;
            callbacks?.onToken?.(textStreamBuffer);
            textStreamBuffer = "";
          }
        }
      } else if (insideReasoningTag) {
        const lowerBuf = textStreamBuffer.toLowerCase();
        let earliestTagIndex = -1;
        let matchedTag = "";

        for (const tag of CLOSING_THINK_TAGS) {
          const idx = lowerBuf.indexOf(tag);
          if (idx !== -1 && (earliestTagIndex === -1 || idx < earliestTagIndex)) {
            earliestTagIndex = idx;
            matchedTag = tag;
          }
        }

        if (earliestTagIndex !== -1) {
          const beforeTag = textStreamBuffer.slice(0, earliestTagIndex);
          if (beforeTag) {
            reasoning += beforeTag;
            callbacks?.onReasoningToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(earliestTagIndex + matchedTag.length);
          insideReasoningTag = false;
        } else {
          const lastLt = textStreamBuffer.lastIndexOf("<");
          if (lastLt !== -1 && textStreamBuffer.length - lastLt < 20) {
            const safeText = textStreamBuffer.slice(0, lastLt);
            if (safeText) {
              reasoning += safeText;
              callbacks?.onReasoningToken?.(safeText);
            }
            textStreamBuffer = textStreamBuffer.slice(lastLt);
            break;
          } else {
            reasoning += textStreamBuffer;
            callbacks?.onReasoningToken?.(textStreamBuffer);
            textStreamBuffer = "";
          }
        }
      } else if (insideToolCallTag) {
        const lowerBuf = textStreamBuffer.toLowerCase();
        let earliestTagIndex = -1;
        let matchedTag = "";

        for (const tag of CLOSING_TOOL_TAGS) {
          const idx = lowerBuf.indexOf(tag);
          if (idx !== -1 && (earliestTagIndex === -1 || idx < earliestTagIndex)) {
            earliestTagIndex = idx;
            matchedTag = tag;
          }
        }

        if (earliestTagIndex !== -1) {
          const beforeTag = textStreamBuffer.slice(0, earliestTagIndex);
          toolCallXmlBuffer += beforeTag;
          textStreamBuffer = textStreamBuffer.slice(earliestTagIndex + matchedTag.length);
          insideToolCallTag = false;

          // Parse captured tool call XML
          let rawJson = toolCallXmlBuffer.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          try {
            const parsed = JSON.parse(rawJson) as { name?: string; arguments?: unknown };
            if (parsed.name) {
              const idx = toolCalls.size;
              toolCalls.set(idx, {
                id: `call_${crypto.randomUUID().slice(0, 8)}`,
                type: "function",
                function: {
                  name: parsed.name,
                  arguments:
                    typeof parsed.arguments === "string"
                      ? parsed.arguments
                      : JSON.stringify(parsed.arguments || {}),
                },
              });
            }
          } catch {
            // keep raw
          }
          toolCallXmlBuffer = "";
        } else {
          const lastLt = textStreamBuffer.lastIndexOf("<");
          if (lastLt !== -1 && textStreamBuffer.length - lastLt < 20) {
            const safeText = textStreamBuffer.slice(0, lastLt);
            toolCallXmlBuffer += safeText;
            textStreamBuffer = textStreamBuffer.slice(lastLt);
            break;
          } else {
            toolCallXmlBuffer += textStreamBuffer;
            textStreamBuffer = "";
          }
        }
      }
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

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

          // 1. Dedicated reasoning field from OpenAI-compatible gateways
          const rawReasoning =
            delta.reasoning_content ||
            delta.reasoning ||
            (delta as { thought?: string }).thought;
          if (rawReasoning) {
            reasoning += rawReasoning;
            callbacks?.onReasoningToken?.(rawReasoning);
          }

          // 2. Incremental content with multi-tag reasoning extraction
          if (delta.content) {
            processTextChunk(delta.content);
          }

          // 3. Structured tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.get(tc.index);
              if (!existing) {
                toolCalls.set(tc.index, {
                  id: tc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
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

    // Flush any remaining buffered stream text
    if (textStreamBuffer) {
      if (insideReasoningTag) {
        reasoning += textStreamBuffer;
        callbacks?.onReasoningToken?.(textStreamBuffer);
      } else if (!insideToolCallTag) {
        content += textStreamBuffer;
        callbacks?.onToken?.(textStreamBuffer);
      }
      textStreamBuffer = "";
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      // Gracefully handle user abortion
    } else {
      throw err;
    }
  } finally {
    callbacks?.onDone?.();
  }

  // Clean up any stray XML reasoning tags that might remain in final content
  for (let i = 0; i < OPENING_THINK_TAGS.length; i++) {
    const openTag = OPENING_THINK_TAGS[i];
    const closeTag = CLOSING_THINK_TAGS[i];
    const regex = new RegExp(`${openTag}([\\s\\S]*?)${closeTag}`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const extracted = match[1].trim();
      if (extracted) {
        reasoning = (reasoning ? reasoning + "\n" + extracted : extracted).trim();
      }
      content = content.replace(match[0], "").trim();
    }
  }

  const toolCallsArray = Array.from(toolCalls.values())
    .filter((tc) => Boolean(tc.function?.name && tc.function.name.trim()))
    .map((tc) => ({
      ...tc,
      id: tc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
    }));

  if (import.meta.env.DEV && toolCallsArray.length > 0) {
    console.debug("[HermesClient] Parsed streaming tool calls:", toolCallsArray);
  }

  const initialResponse: ChatCompletionResponse = {
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

  // Extract any XML <tool_call> tags that may have been sent inside content
  return extractXmlToolCallsFromResponse(initialResponse);
}
