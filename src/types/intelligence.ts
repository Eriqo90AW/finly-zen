export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  reasoning?: string;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
  name?: string;
  createdAt: number;
  isStreaming?: boolean;
  imageBase64?: string;
  imageFileName?: string;
  isOcrProcessing?: boolean;
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface PendingAction {
  id: string;
  toolCallId: string;
  toolName: string;
  title: string;
  description: string;
  args: Record<string, unknown>;
  execute: () => Promise<unknown>;
}

export interface ToolExecutionResult {
  kind: "result";
  data: unknown;
}

export interface ToolExecutionPending {
  kind: "pending";
  pendingAction: PendingAction;
}

export type ToolExecutionOutcome = ToolExecutionResult | ToolExecutionPending;

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onReasoningToken?: (token: string) => void;
  onToolCallStart?: (toolName: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      reasoning?: string | null;
      tool_calls?: ChatToolCall[];
    };
    finish_reason: string | null;
  }>;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
}
