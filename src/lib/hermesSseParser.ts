import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  StreamCallbacks,
} from "../types/intelligence";
import {
  type ParsedToolCall,
  createStreamTextProcessor,
  extractXmlToolCallsFromResponse,
  stripStrayReasoningTags,
} from "./hermesXmlParser";

export async function parseStreamingResponse(
  body: ReadableStream<Uint8Array>,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal,
): Promise<ChatCompletionResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCalls = new Map<number, ParsedToolCall>();

  const textProcessor = createStreamTextProcessor(callbacks, (parsedCall) => {
    toolCalls.set(toolCalls.size, parsedCall);
  });

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
            textProcessor.appendReasoning(rawReasoning);
          }

          // 2. Incremental content with multi-tag reasoning extraction
          if (delta.content) {
            textProcessor.processTextChunk(delta.content);
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
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }

    textProcessor.flush();
  } catch (err: unknown) {
    if (!signal?.aborted) {
      throw err;
    }
  } finally {
    callbacks?.onDone?.();
  }

  const cleaned = stripStrayReasoningTags(
    textProcessor.getContent(),
    textProcessor.getReasoning(),
  );

  const toolCallsArray = Array.from(toolCalls.values())
    .filter((tc) => Boolean(tc.function?.name?.trim()))
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
          content: cleaned.content || null,
          reasoning: cleaned.reasoning || null,
          tool_calls: toolCallsArray.length ? toolCallsArray : undefined,
        },
        finish_reason: toolCallsArray.length ? "tool_calls" : "stop",
      },
    ],
  };

  return extractXmlToolCallsFromResponse(initialResponse);
}
