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
              ? msgs.filter((m) => m.role !== "tool")
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
          setIntelligenceState("profileMessages", "finly", legacyParsed.messages);
        }
      }
    } catch (e) {
      console.error("Failed to load Hermes chat history", e);
    }
  });

  createEffect(() => {
    const persistable = {
      activeProfile: intelligenceState.activeProfile,
      profileMessages: Object.fromEntries(
        Object.entries(intelligenceState.profileMessages).map(([p, msgs]) => [
          p,
          msgs.filter((m) => m.role === "user" || m.role === "assistant"),
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

export function createMessageId(): string {
  return crypto.randomUUID();
}

export function getApiMessages(profile?: string): ChatMessage[] {
  const targetProfile = profile || intelligenceState.activeProfile || "finly";
  const messages = intelligenceState.profileMessages[targetProfile] || [];
  return messages.filter((m) => m.role !== "system");
}
