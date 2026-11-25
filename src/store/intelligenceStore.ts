import { createStore, produce, reconcile } from "solid-js/store";
import { batch, createEffect, createSignal } from "solid-js";
import type { ChatMessage, PendingAction, TransactionDraft } from "../types/intelligence";

const STORAGE_KEY = "finly_zen_hermes_chat_v2";
const [chatOwner, setChatOwner] = createSignal<string | null>(null);
export { chatOwner };
let sessionVersion = 0;
export const chatSessionVersion = () => sessionVersion;

interface IntelligenceState {
  activeProfile: string;
  profileMessages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  pendingAction: PendingAction | null;
  activeToolLabel: string | null;
  error: string | null;
}

const emptyIntelligenceState = (): IntelligenceState => ({
  activeProfile: "finly",
  profileMessages: {
    finly: [],
    market_quant: [],
  },
  isStreaming: false,
  pendingAction: null,
  activeToolLabel: null,
  error: null,
});

export const [intelligenceState, setIntelligenceState] =
  createStore<IntelligenceState>(emptyIntelligenceState());

export function switchIntelligenceUser(userId: string | null) {
  if (chatOwner() === userId) return;
  sessionVersion += 1;
  const next = emptyIntelligenceState();

  try {
    const saved = userId && localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<IntelligenceState>;
      next.activeProfile = parsed.activeProfile || "finly";
      for (const [profile, messages] of Object.entries(parsed.profileMessages ?? {})) {
        if (Array.isArray(messages)) next.profileMessages[profile] = persistableMessages(messages);
      }
    }
  } catch (error) {
    console.error("Failed to load chat history", error);
  }

  batch(() => {
    setIntelligenceState(reconcile(next));
    setChatOwner(userId);
  });
}

function persistableMessages(messages: ChatMessage[]) {
  return messages
    .filter(m => (m.role === "user" || m.role === "assistant") && (m.content?.trim() || m.imageBase64))
    .map(({ tool_calls, isStreaming, isOcrProcessing, ...message }) => message);
}

export function setupIntelligencePersistence() {
  createEffect(() => {
    const userId = chatOwner();
    if (!userId) return;
    const persisted = {
      activeProfile: intelligenceState.activeProfile,
      profileMessages: Object.fromEntries(
        Object.entries(intelligenceState.profileMessages).map(([profile, messages]) => [
          profile, persistableMessages(messages),
        ]),
      ),
    };
    try {
      localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(persisted));
    } catch (error) {
      console.error("Failed to save chat history", error);
    }
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

function patchDrafts(
  matches: (draft: TransactionDraft) => boolean,
  update: (draft: TransactionDraft) => Partial<TransactionDraft>,
) {
  setIntelligenceState("pendingAction", produce(action => {
    if (action?.kind !== "transaction-batch") return;
    for (const draft of action.drafts) {
      if (matches(draft)) Object.assign(draft, update(draft));
    }
  }));
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

  patchDrafts(
    (d: TransactionDraft) => d.id === draftId,
    () => updated,
  );
}

export function toggleDraftSelection(draftId: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const draft = currentAction.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status === "saved") return;

  patchDrafts(
    (d: TransactionDraft) => d.id === draftId,
    draft => ({ selected: !draft.selected }),
  );
}

export function selectAllValidDrafts(select: boolean) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  patchDrafts(
    (d: TransactionDraft) => d.status !== "saved" && d.status !== "excluded",
    (prev: TransactionDraft) => ({
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
    patchDrafts(
      (d: TransactionDraft) => d.id === draftId,
      () => ({
        status: newStatus,
        selected: !hasErrors,
      }),
    );
  } else {
    patchDrafts(
      (d: TransactionDraft) => d.id === draftId,
      () => ({
        status: "excluded",
        selected: false,
      }),
    );
  }
}

export function applyAccountToSelectedDrafts(accountId: string, accountName: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  patchDrafts(
    (d: TransactionDraft) => d.selected && d.status !== "saved" && d.status !== "excluded",
    (prev: TransactionDraft) => {
      const updatedErrors = { ...(prev.errors || {}) };
      delete updatedErrors.accountId;
      const isValid = Object.keys(updatedErrors).length === 0;

      return {
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

  patchDrafts(
    (d: TransactionDraft) => d.selected && d.status !== "saved" && d.status !== "excluded",
    () => ({ date }),
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

  patchDrafts(
    (d: TransactionDraft) => d.id === draftId,
    (prev: TransactionDraft) => ({
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
