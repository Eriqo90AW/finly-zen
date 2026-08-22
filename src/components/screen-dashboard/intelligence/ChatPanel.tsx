import { createEffect, For, onMount, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import {
  intelligenceState,
  setActiveProfile,
} from "../../../store/intelligenceStore";
import {
  sendIntelligenceMessage,
  confirmPendingAction,
  cancelPendingAction,
} from "../../../services/intelligence/chatOrchestrator";
import { getPageInfo } from "../../../lib/pageContext";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import PendingActionCard from "./PendingActionCard";

const ChatPanel = () => {
  const location = useLocation();
  const pageInfo = () => getPageInfo(location.pathname);
  const currentMessages = () =>
    intelligenceState.profileMessages[pageInfo().model] || [];

  let scrollRef: HTMLDivElement | undefined;

  const scrollToBottom = () => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  };

  onMount(scrollToBottom);

  createEffect(() => {
    setActiveProfile(pageInfo().model);
  });

  createEffect(() => {
    currentMessages().length;
    intelligenceState.activeToolLabel;
    intelligenceState.pendingAction;
    queueMicrotask(scrollToBottom);
  });

  const handleSend = (text: string, attachment?: { base64: string; fileName: string }) => {
    sendIntelligenceMessage(text, location.pathname, attachment);
  };

  return (
    <div class="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        class="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-3"
      >
        <Show
          when={currentMessages().length > 0}
          fallback={
            <div class="px-2 space-y-4">
              <div class="p-3.5 rounded-2xl bg-forest/5 border border-forest/10 space-y-2">
                <div class="flex items-center gap-2 text-xs font-semibold text-forest">
                  <span class="material-icons text-base text-forest/70">
                    {pageInfo().assistantName === "Market Quant"
                      ? "insights"
                      : "account_balance_wallet"}
                  </span>
                  <span>{pageInfo().assistantName}</span>
                  <span class="text-[10px] font-normal text-earth/60">
                    · {pageInfo().name}
                  </span>
                </div>
                <p class="text-xs text-earth leading-relaxed">
                  {pageInfo().focus}
                </p>
              </div>

              <div>
                <p class="text-[10px] font-bold text-earth/60 uppercase tracking-wider mb-2">
                  Suggested for {pageInfo().assistantName}
                </p>
                <div class="space-y-2">
                  <For each={pageInfo().suggestedQuestions}>
                    {(suggestion) => (
                      <button
                        onClick={() => handleSend(suggestion)}
                        disabled={intelligenceState.isStreaming}
                        class="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-forest/10 text-xs text-forest hover:border-forest/30 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          }
        >
          <For each={currentMessages()}>
            {(message) => <ChatMessage message={message} />}
          </For>
        </Show>

        <Show when={intelligenceState.activeToolLabel}>
          <div class="flex justify-start">
            <div class="px-3 py-1.5 rounded-full bg-sage/60 text-[10px] font-semibold text-forest/70 uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-forest/60 animate-ping" />
              {intelligenceState.activeToolLabel}…
            </div>
          </div>
        </Show>

        <Show when={intelligenceState.error}>
          <div class="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {intelligenceState.error}
          </div>
        </Show>
      </div>

      <Show when={intelligenceState.pendingAction}>
        {(action) => (
          <PendingActionCard
            action={action()}
            onConfirm={confirmPendingAction}
            onCancel={cancelPendingAction}
          />
        )}
      </Show>

      <ChatInput
        onSend={handleSend}
        placeholder={`Ask ${pageInfo().assistantName} about ${pageInfo().name.toLowerCase()}…`}
        disabled={intelligenceState.isStreaming || !!intelligenceState.pendingAction}
      />
    </div>
  );
};

export default ChatPanel;
