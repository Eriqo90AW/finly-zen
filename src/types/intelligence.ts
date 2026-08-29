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

export type EntryKind = "item" | "tax" | "service" | "discount" | "adjustment";
export type DraftStatus = "ready" | "invalid" | "saving" | "saved" | "failed" | "excluded";

export interface TransactionDraft {
  id: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  entryKind: EntryKind;
  accountId: string | null;
  accountName?: string;
  categoryId: string | null;
  categoryName?: string;
  note?: string;
  isRecurring?: boolean;
  date?: string;
  status: DraftStatus;
  selected: boolean;
  errors?: Record<string, string>;
  errorMessage?: string;
  savedTransactionId?: string;
  toolCallId?: string;
}

export interface BatchSaveResult {
  saved: Array<{ draftId: string; transactionId: string }>;
  failed: Array<{ draftId: string; error: string }>;
  excluded: Array<{ draftId: string }>;
  savedCount: number;
  failedCount: number;
  skippedCount: number;
  savedNetAmount: number;
}

export interface PendingBatchTransactionAction {
  id: string;
  kind: "transaction-batch";
  toolCallId: string;
  toolCallIds?: string[];
  toolName: string;
  source: "chat" | "ocr";
  merchant?: string;
  receiptTotal?: number;
  ocrConfidence?: number;
  drafts: TransactionDraft[];
  originatingProfile: string;
  originatingPath: string;
  createdAt: number;
}

export interface PendingTransferAction {
  id: string;
  kind: "transfer";
  toolCallId: string;
  toolName: string;
  title: string;
  description: string;
  args: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note?: string;
  };
  execute: () => Promise<unknown>;
}

export type PendingAction = PendingBatchTransactionAction | PendingTransferAction;


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
