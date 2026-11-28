import type { ChatMessage, PendingAction, TransactionDraft } from "../types/intelligence";

const STORAGE_KEY = "finly_zen_hermes_chat_v2";
const LEGACY_STORAGE_KEY = "finly_zen_intelligence_chat_v1";

export interface IntelligenceState {
  activeProfile: string;
  profileMessages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  pendingAction: PendingAction | null;
  activeToolLabel: string | null;
  error: string | null;
}

export const DEFAULT_INTELLIGENCE_STATE: IntelligenceState = {
  activeProfile: "finly",
  profileMessages: {
    finly: [],
    market_quant: [],
  },
  isStreaming: false,
  pendingAction: null,
  activeToolLabel: null,
  error: null,
};

function sanitizeMessageForPersistence(message: ChatMessage): ChatMessage {
  const { tool_calls, isStreaming, isOcrProcessing, ...rest } = message;
  return rest as ChatMessage;
}

export type HydratedIntelligenceData =
  | { kind: "v2"; state: IntelligenceState }
  | { kind: "legacy"; finlyMessages: ChatMessage[] }
  | null;

export function loadPersistedIntelligenceState(): HydratedIntelligenceData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as {
        activeProfile?: string;
        profileMessages?: Record<string, ChatMessage[]>;
      };
      if (parsed.profileMessages) {
        const cleaned: Record<string, ChatMessage[]> = {};
        for (const [k, msgs] of Object.entries(parsed.profileMessages)) {
          cleaned[k] = Array.isArray(msgs)
            ? msgs
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map(sanitizeMessageForPersistence)
            : [];
        }
        return {
          kind: "v2",
          state: {
            ...DEFAULT_INTELLIGENCE_STATE,
            activeProfile: parsed.activeProfile || "finly",
            profileMessages: {
              finly: cleaned.finly || [],
              market_quant: cleaned.market_quant || [],
              ...cleaned,
            },
          },
        };
      }
    }

    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySaved) {
      const legacyParsed = JSON.parse(legacySaved) as { messages?: ChatMessage[] };
      if (Array.isArray(legacyParsed.messages)) {
        return {
          kind: "legacy",
          finlyMessages: legacyParsed.messages.filter(
            (m) => m.role === "user" || m.role === "assistant",
          ),
        };
      }
    }
  } catch (e) {
    console.error("Failed to load Hermes chat history", e);
  }
  return null;
}

export function savePersistedIntelligenceState(
  activeProfile: string,
  profileMessages: Record<string, ChatMessage[]>,
): void {
  const persistable = {
    activeProfile,
    profileMessages: Object.fromEntries(
      Object.entries(profileMessages).map(([p, msgs]) => [
        p,
        msgs
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              Boolean(m.content?.trim() || m.imageBase64),
          )
          .map(sanitizeMessageForPersistence),
      ]),
    ),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
}

export function computeUpdatedBatchDraft(
  currentDraft: TransactionDraft,
  patch: Partial<TransactionDraft>,
  userAccounts?: Array<{ id: string; name: string }>,
  userCategories?: Array<{ id: string; name: string }>,
): TransactionDraft {
  const updated: TransactionDraft = {
    ...currentDraft,
    ...patch,
  };

  if (patch.accountId !== undefined && userAccounts) {
    const acc = userAccounts.find((a) => a.id === patch.accountId);
    updated.accountName = acc?.name || updated.accountName;
  }
  if (patch.categoryId !== undefined && userCategories) {
    const cat = userCategories.find((c) => c.id === patch.categoryId);
    updated.categoryName = cat?.name || updated.categoryName;
  }

  if (updated.status !== "excluded") {
    const errors: Record<string, string> = {};
    if (!updated.name || updated.name.trim().length < 1) {
      errors.name = "Description is required";
    }
    if (!updated.amount || updated.amount <= 0 || !Number.isFinite(updated.amount)) {
      errors.amount = "Valid positive amount is required";
    }
    if (!updated.accountId) {
      errors.accountId = "Account must be selected";
    }
    if (!updated.categoryId) {
      errors.categoryId = "Category must be selected";
    }

    const isValid = Object.keys(errors).length === 0;
    updated.errors = isValid ? undefined : errors;
    if (updated.status !== "saving") {
      updated.status = isValid ? "ready" : "invalid";
    }
    if (isValid && currentDraft.status === "invalid" && !updated.selected) {
      updated.selected = true;
    }
  }

  return updated;
}

export function applySelectAllDrafts(drafts: TransactionDraft[], select: boolean): void {
  for (const draft of drafts) {
    if (draft.status !== "saved" && draft.status !== "excluded") {
      draft.selected = select
        ? draft.status === "ready" || draft.status === "failed"
        : false;
    }
  }
}

export function applyAccountToDrafts(
  drafts: TransactionDraft[],
  accountId: string,
  accountName: string,
): void {
  for (const draft of drafts) {
    if (draft.selected && draft.status !== "saved" && draft.status !== "excluded") {
      const updatedErrors = { ...(draft.errors || {}) };
      delete updatedErrors.accountId;
      const isValid = Object.keys(updatedErrors).length === 0;

      draft.accountId = accountId;
      draft.accountName = accountName;
      draft.errors = isValid ? undefined : updatedErrors;
      draft.status = isValid ? "ready" : "invalid";
    }
  }
}

export function applyDateToDrafts(drafts: TransactionDraft[], date: string): void {
  for (const draft of drafts) {
    if (draft.selected && draft.status !== "saved" && draft.status !== "excluded") {
      draft.date = date;
    }
  }
}
