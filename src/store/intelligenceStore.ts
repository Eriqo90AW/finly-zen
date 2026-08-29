import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { ChatMessage, PendingAction } from "../types/intelligence";

const STORAGE_KEY = "finly_zen_hermes_chat_v2";
const LEGACY_STORAGE_KEY = "finly_zen_intelligence_chat_v1";

interface IntelligenceState {
  activeProfile: string;
  profileMessages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  pendingAction: PendingAction | null;
  activeToolLabel: string | null;
  error: string | null;
}

const DEFAULT_STATE: IntelligenceState = {
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

export const [intelligenceState, setIntelligenceState] =
  createStore<IntelligenceState>(DEFAULT_STATE);

export function setupIntelligencePersistence() {
  onMount(() => {
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
                  .map((m) => {
                    const { tool_calls, isStreaming, isOcrProcessing, ...rest } = m;
                    return rest as ChatMessage;
                  })
              : [];
          }
          setIntelligenceState(
            reconcile({
              ...DEFAULT_STATE,
              activeProfile: parsed.activeProfile || "finly",
              profileMessages: {
                finly: cleaned.finly || [],
                market_quant: cleaned.market_quant || [],
                ...cleaned,
              },
            }),
          );
          return;
        }
      }

      // Check legacy single-thread storage
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacySaved) {
        const legacyParsed = JSON.parse(legacySaved) as { messages?: ChatMessage[] };
        if (Array.isArray(legacyParsed.messages)) {
          setIntelligenceState(
            "profileMessages",
            "finly",
            legacyParsed.messages.filter((m) => m.role === "user" || m.role === "assistant"),
          );
        }
      }
    } catch (e) {
      console.error("Failed to load Hermes chat history", e);
    }
  });

  createEffect(() => {
    const sanitizeForPersistence = (m: ChatMessage): ChatMessage => {
      const { tool_calls, isStreaming, isOcrProcessing, ...rest } = m;
      return rest as ChatMessage;
    };

    const persistable = {
      activeProfile: intelligenceState.activeProfile,
      profileMessages: Object.fromEntries(
        Object.entries(intelligenceState.profileMessages).map(([p, msgs]) => [
          p,
          msgs
            .filter((m) => (m.role === "user" || m.role === "assistant") && Boolean(m.content?.trim() || m.imageBase64))
            .map(sanitizeForPersistence),
        ]),
      ),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  });
}

export function setActiveProfile(profile: string) {
  if (intelligenceState.activeProfile !== profile) {
    setIntelligenceState("activeProfile", profile);
    if (!intelligenceState.profileMessages[profile]) {
      setIntelligenceState("profileMessages", profile, []);
    }
  }
}

export function getActiveMessages(): ChatMessage[] {
  const profile = intelligenceState.activeProfile || "finly";
  return intelligenceState.profileMessages[profile] || [];
}

export function addMessage(profile: string, message: ChatMessage) {
  if (!intelligenceState.profileMessages[profile]) {
    setIntelligenceState("profileMessages", profile, []);
  }
  setIntelligenceState("profileMessages", profile, (prev = []) => [...prev, message]);
}

export function updateMessage(profile: string, id: string, patch: Partial<ChatMessage>) {
  setIntelligenceState(
    "profileMessages",
    profile,
    (m) => m.id === id,
    (prev) => ({ ...prev, ...patch }),
  );
}

export function appendToMessage(profile: string, id: string, token: string) {
  setIntelligenceState(
    "profileMessages",
    profile,
    (m) => m.id === id,
    "content",
    (c) => (c || "") + token,
  );
}

export function appendToReasoning(profile: string, id: string, token: string) {
  setIntelligenceState(
    "profileMessages",
    profile,
    (m) => m.id === id,
    "reasoning",
    (r) => (r || "") + token,
  );
}

export function setStreaming(isStreaming: boolean) {
  setIntelligenceState("isStreaming", isStreaming);
}

export function setPendingAction(action: PendingAction | null) {
  setIntelligenceState("pendingAction", action);
}

export function setActiveToolLabel(label: string | null) {
  setIntelligenceState("activeToolLabel", label);
}

export function setIntelligenceError(error: string | null) {
  setIntelligenceState("error", error);
}

export function clearIntelligenceChat(profile?: string) {
  const targetProfile = profile || intelligenceState.activeProfile || "finly";
  setIntelligenceState("profileMessages", targetProfile, []);
  setIntelligenceState({
    isStreaming: false,
    pendingAction: null,
    activeToolLabel: null,
    error: null,
  });
}

export function updateBatchDraft(
  draftId: string,
  patch: Partial<TransactionDraft>,
  userAccounts?: Array<{ id: string; name: string }>,
  userCategories?: Array<{ id: string; name: string }>,
) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const targetIndex = currentAction.drafts.findIndex((d) => d.id === draftId);
  if (targetIndex === -1) return;

  const currentDraft = currentAction.drafts[targetIndex];
  if (currentDraft.status === "saved") return; // Cannot edit already saved drafts

  const updated: TransactionDraft = {
    ...currentDraft,
    ...patch,
  };

  // Re-sync accountName or categoryName if IDs changed
  if (patch.accountId !== undefined && userAccounts) {
    const acc = userAccounts.find((a) => a.id === patch.accountId);
    updated.accountName = acc?.name || updated.accountName;
  }
  if (patch.categoryId !== undefined && userCategories) {
    const cat = userCategories.find((c) => c.id === patch.categoryId);
    updated.categoryName = cat?.name || updated.categoryName;
  }

  // Re-validate draft fields if not excluded
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
    // Auto-select if becoming valid and was previously invalid
    if (isValid && currentDraft.status === "invalid" && !updated.selected) {
      updated.selected = true;
    }
  }

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.id === draftId,
    updated,
  );
}

export function toggleDraftSelection(draftId: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const draft = currentAction.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status === "saved") return;

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.id === draftId,
    "selected",
    (s: boolean) => !s,
  );
}

export function selectAllValidDrafts(select: boolean) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.status !== "saved" && d.status !== "excluded",
    (prev: TransactionDraft) => ({
      ...prev,
      selected: select ? (prev.status === "ready" || prev.status === "failed") : false,
    }),
  );
}


export function toggleExcludeDraft(draftId: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const draft = currentAction.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status === "saved") return;

  const isExcluded = draft.status === "excluded";
  if (isExcluded) {
    const hasErrors = draft.errors && Object.keys(draft.errors).length > 0;
    const newStatus = hasErrors ? "invalid" : "ready";
    setIntelligenceState(
      "pendingAction",
      "drafts",
      (d: TransactionDraft) => d.id === draftId,
      (prev: TransactionDraft) => ({
        ...prev,
        status: newStatus,
        selected: !hasErrors,
      }),
    );
  } else {
    setIntelligenceState(
      "pendingAction",
      "drafts",
      (d: TransactionDraft) => d.id === draftId,
      (prev: TransactionDraft) => ({
        ...prev,
        status: "excluded",
        selected: false,
      }),
    );
  }
}

export function applyAccountToSelectedDrafts(accountId: string, accountName: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.selected && d.status !== "saved" && d.status !== "excluded",
    (prev: TransactionDraft) => {
      const updatedErrors = { ...(prev.errors || {}) };
      delete updatedErrors.accountId;
      const isValid = Object.keys(updatedErrors).length === 0;

      return {
        ...prev,
        accountId,
        accountName,
        errors: isValid ? undefined : updatedErrors,
        status: isValid ? "ready" : "invalid",
      };
    },
  );
}

export function applyDateToSelectedDrafts(date: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.selected && d.status !== "saved" && d.status !== "excluded",
    "date",
    date,
  );
}

export function updateDraftStatus(
  draftId: string,
  status: TransactionDraft["status"],
  errorMessage?: string,
  savedTransactionId?: string,
) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    "drafts",
    (d: TransactionDraft) => d.id === draftId,
    (prev: TransactionDraft) => ({
      ...prev,
      status,
      errorMessage: errorMessage || undefined,
      savedTransactionId: savedTransactionId || prev.savedTransactionId,
      selected: status === "saved" ? false : prev.selected,
    }),
  );
}

export function createMessageId(): string {
  return crypto.randomUUID();
}


export function getApiMessages(profile?: string): ChatMessage[] {
  const targetProfile = profile || intelligenceState.activeProfile || "finly";
  const messages = intelligenceState.profileMessages[targetProfile] || [];
  return messages.filter((m) => m.role !== "system");
}
