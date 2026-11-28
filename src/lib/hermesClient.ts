import { DEFAULT_CONFIG } from "../config/defaults";
import type {
  ChatCompletionResponse,
  ChatMessage,
  OpenAIToolDefinition,
  StreamCallbacks,
} from "../types/intelligence";
import { parseStreamingResponse } from "./hermesSseParser";
import { extractXmlToolCallsFromResponse } from "./hermesXmlParser";

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
    headers.Authorization = `Bearer ${apiKey}`;
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
