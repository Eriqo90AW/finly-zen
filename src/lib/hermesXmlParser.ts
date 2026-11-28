import type {
  ChatCompletionResponse,
  ChatMessage,
  StreamCallbacks,
} from "../types/intelligence";

export const OPENING_THINK_TAGS = [
  "<think>",
  "<thinking>",
  "<scratchpad>",
  "<reasoning>",
  "<inner_monologue>",
  "<thought>",
];

export const CLOSING_THINK_TAGS = [
  "</think>",
  "</thinking>",
  "</scratchpad>",
  "</reasoning>",
  "</inner_monologue>",
  "</thought>",
];

const OPENING_TOOL_TAGS = ["<tool_call>", "<tool_calls>", "<action>"];
const CLOSING_TOOL_TAGS = ["</tool_call>", "</tool_calls>", "</action>"];

export interface ParsedToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function findEarliestTag(lowerText: string, tags: string[]): { index: number; tag: string } {
  let earliestIndex = -1;
  let matchedTag = "";
  for (const tag of tags) {
    const idx = lowerText.indexOf(tag);
    if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
      earliestIndex = idx;
      matchedTag = tag;
    }
  }
  return { index: earliestIndex, tag: matchedTag };
}

function parseToolCallJson(rawBlock: string): ParsedToolCall | null {
  const rawJson = rawBlock
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(rawJson) as { name?: string; arguments?: unknown };
    if (!parsed.name) return null;
    return {
      id: `call_${crypto.randomUUID().slice(0, 8)}`,
      type: "function",
      function: {
        name: parsed.name,
        arguments:
          typeof parsed.arguments === "string"
            ? parsed.arguments
            : JSON.stringify(parsed.arguments || {}),
      },
    };
  } catch {
    return null;
  }
}

export function extractXmlToolCallsFromResponse(
  response: ChatCompletionResponse,
): ChatCompletionResponse {
  const message = response.choices?.[0]?.message;
  if (!message?.content) return response;

  const content = message.content;
  const toolCallRegex = /<tool_call(?:s)?>([\s\S]*?)<\/tool_call(?:s)?>/gi;
  const extractedCalls: NonNullable<ChatMessage["tool_calls"]> = message.tool_calls
    ? [...message.tool_calls]
    : [];
  let cleanedContent = content;

  let match = toolCallRegex.exec(content);
  while (match !== null) {
    const parsedCall = parseToolCallJson(match[1]);
    if (parsedCall) {
      extractedCalls.push(parsedCall);
      cleanedContent = cleanedContent.replace(match[0], "").trim();
    }
    match = toolCallRegex.exec(content);
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

export function stripStrayReasoningTags(
  initialContent: string,
  initialReasoning: string,
): { content: string; reasoning: string } {
  let content = initialContent;
  let reasoning = initialReasoning;

  for (let i = 0; i < OPENING_THINK_TAGS.length; i++) {
    const openTag = OPENING_THINK_TAGS[i];
    const closeTag = CLOSING_THINK_TAGS[i];
    const regex = new RegExp(`${openTag}([\\s\\S]*?)${closeTag}`, "gi");
    let match = regex.exec(content);
    while (match !== null) {
      const extracted = match[1].trim();
      if (extracted) {
        reasoning = (reasoning ? `${reasoning}\n${extracted}` : extracted).trim();
      }
      content = content.replace(match[0], "").trim();
      match = regex.exec(content);
    }
  }

  return { content, reasoning };
}

export function createStreamTextProcessor(
  callbacks: StreamCallbacks | undefined,
  onXmlToolCall: (call: ParsedToolCall) => void,
) {
  let content = "";
  let reasoning = "";
  let toolCallXmlBuffer = "";
  let insideReasoningTag = false;
  let insideToolCallTag = false;
  let textStreamBuffer = "";

  const processTextChunk = (incomingText: string) => {
    textStreamBuffer += incomingText;

    while (textStreamBuffer.length > 0) {
      const lowerBuf = textStreamBuffer.toLowerCase();

      if (!insideReasoningTag && !insideToolCallTag) {
        const thinkMatch = findEarliestTag(lowerBuf, OPENING_THINK_TAGS);
        const toolMatch = findEarliestTag(lowerBuf, OPENING_TOOL_TAGS);

        if (
          thinkMatch.index !== -1 &&
          (toolMatch.index === -1 || thinkMatch.index < toolMatch.index)
        ) {
          const beforeTag = textStreamBuffer.slice(0, thinkMatch.index);
          if (beforeTag) {
            content += beforeTag;
            callbacks?.onToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(thinkMatch.index + thinkMatch.tag.length);
          insideReasoningTag = true;
        } else if (toolMatch.index !== -1) {
          const beforeTag = textStreamBuffer.slice(0, toolMatch.index);
          if (beforeTag) {
            content += beforeTag;
            callbacks?.onToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(toolMatch.index + toolMatch.tag.length);
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
          }
          content += textStreamBuffer;
          callbacks?.onToken?.(textStreamBuffer);
          textStreamBuffer = "";
        }
      } else if (insideReasoningTag) {
        const closeMatch = findEarliestTag(lowerBuf, CLOSING_THINK_TAGS);
        if (closeMatch.index !== -1) {
          const beforeTag = textStreamBuffer.slice(0, closeMatch.index);
          if (beforeTag) {
            reasoning += beforeTag;
            callbacks?.onReasoningToken?.(beforeTag);
          }
          textStreamBuffer = textStreamBuffer.slice(closeMatch.index + closeMatch.tag.length);
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
          }
          reasoning += textStreamBuffer;
          callbacks?.onReasoningToken?.(textStreamBuffer);
          textStreamBuffer = "";
        }
      } else {
        const closeMatch = findEarliestTag(lowerBuf, CLOSING_TOOL_TAGS);
        if (closeMatch.index !== -1) {
          toolCallXmlBuffer += textStreamBuffer.slice(0, closeMatch.index);
          textStreamBuffer = textStreamBuffer.slice(closeMatch.index + closeMatch.tag.length);
          insideToolCallTag = false;

          const parsedCall = parseToolCallJson(toolCallXmlBuffer);
          if (parsedCall) {
            onXmlToolCall(parsedCall);
          }
          toolCallXmlBuffer = "";
        } else {
          const lastLt = textStreamBuffer.lastIndexOf("<");
          if (lastLt !== -1 && textStreamBuffer.length - lastLt < 20) {
            toolCallXmlBuffer += textStreamBuffer.slice(0, lastLt);
            textStreamBuffer = textStreamBuffer.slice(lastLt);
            break;
          }
          toolCallXmlBuffer += textStreamBuffer;
          textStreamBuffer = "";
        }
      }
    }
  };

  const appendReasoning = (text: string) => {
    reasoning += text;
    callbacks?.onReasoningToken?.(text);
  };

  const flush = () => {
    if (!textStreamBuffer) return;
    if (insideReasoningTag) {
      reasoning += textStreamBuffer;
      callbacks?.onReasoningToken?.(textStreamBuffer);
    } else if (!insideToolCallTag) {
      content += textStreamBuffer;
      callbacks?.onToken?.(textStreamBuffer);
    }
    textStreamBuffer = "";
  };

  return {
    processTextChunk,
    appendReasoning,
    flush,
    getContent: () => content,
    getReasoning: () => reasoning,
  };
}
