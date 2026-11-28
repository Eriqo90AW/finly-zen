import { createStore, produce, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { ChatMessage, PendingAction, TransactionDraft } from "../types/intelligence";
import {
  DEFAULT_INTELLIGENCE_STATE,
  type IntelligenceState,
  loadPersistedIntelligenceState,
  savePersistedIntelligenceState,
  computeUpdatedBatchDraft,
  applySelectAllDrafts,
  applyAccountToDrafts,
  applyDateToDrafts,
} from "./intelligencePersistence";

export const [intelligenceState, setIntelligenceState] =
  createStore<IntelligenceState>(DEFAULT_INTELLIGENCE_STATE);

export function setupIntelligencePersistence() {
  onMount(() => {
    const hydrated = loadPersistedIntelligenceState();
    if (!hydrated) return;

    if (hydrated.kind === "v2") {
      setIntelligenceState(reconcile(hydrated.state));
    } else if (hydrated.kind === "legacy") {
      setIntelligenceState("profileMessages", "finly", hydrated.finlyMessages);
    }
  });

  createEffect(() => {
    savePersistedIntelligenceState(
      intelligenceState.activeProfile,
      intelligenceState.profileMessages,
    );
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

  const currentDraft = currentAction.drafts.find((d) => d.id === draftId);
  if (!currentDraft || currentDraft.status === "saved") return;

  const updated = computeUpdatedBatchDraft(currentDraft, patch, userAccounts, userCategories);

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      const target = action.drafts.find((d) => d.id === draftId);
      if (target) {
        Object.assign(target, updated);
      }
    }),
  );
}

export function toggleDraftSelection(draftId: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const draft = currentAction.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status === "saved") return;

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      const target = action.drafts.find((d) => d.id === draftId);
      if (target && target.status !== "saved") {
        target.selected = !target.selected;
      }
    }),
  );
}

export function selectAllValidDrafts(select: boolean) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      applySelectAllDrafts(action.drafts, select);
    }),
  );
}

export function toggleExcludeDraft(draftId: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  const draft = currentAction.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status === "saved") return;

  const isExcluded = draft.status === "excluded";
  const hasErrors = Boolean(draft.errors && Object.keys(draft.errors).length > 0);

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      const target = action.drafts.find((d) => d.id === draftId);
      if (!target || target.status === "saved") return;
      if (isExcluded) {
        target.status = hasErrors ? "invalid" : "ready";
        target.selected = !hasErrors;
      } else {
        target.status = "excluded";
        target.selected = false;
      }
    }),
  );
}

export function applyAccountToSelectedDrafts(accountId: string, accountName: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      applyAccountToDrafts(action.drafts, accountId, accountName);
    }),
  );
}

export function applyDateToSelectedDrafts(date: string) {
  const currentAction = intelligenceState.pendingAction;
  if (!currentAction || currentAction.kind !== "transaction-batch") return;

  setIntelligenceState(
    "pendingAction",
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      applyDateToDrafts(action.drafts, date);
    }),
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
    produce((action) => {
      if (!action || action.kind !== "transaction-batch") return;
      const target = action.drafts.find((d) => d.id === draftId);
      if (target) {
        target.status = status;
        target.errorMessage = errorMessage || undefined;
        target.savedTransactionId = savedTransactionId || target.savedTransactionId;
        target.selected = status === "saved" ? false : target.selected;
      }
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
