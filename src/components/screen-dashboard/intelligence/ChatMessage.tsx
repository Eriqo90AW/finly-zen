import { createSignal, createEffect, Show } from "solid-js";
import type { ChatMessage as ChatMessageType } from "../../../types/intelligence";

interface Props {
  message: ChatMessageType;
}

const ChatMessage = (props: Props) => {
  const isUser = () => props.message.role === "user";
  const [isReasoningOpen, setIsReasoningOpen] = createSignal(false);

  // Auto-expand reasoning while it is actively streaming if no content yet
  createEffect(() => {
    if (props.message.isStreaming && props.message.reasoning && !props.message.content) {
      setIsReasoningOpen(true);
    }
  });

  const sanitizedContent = () => {
    const raw = props.message.content || "";
    // Strip markdown image tags to prevent tracking-pixel / image-based exfiltration
    return raw.replace(/!\[.*?\]\(.*?\)/g, "[Image removed for security]");
  };

  return (
    <Show when={props.message.role === "user" || props.message.role === "assistant"}>
      <div class={`flex ${isUser() ? "justify-end" : "justify-start"}`}>
        <div
          class={`max-w-[92%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap space-y-2 ${
            isUser()
              ? "bg-forest text-white rounded-br-md"
              : "bg-white border border-forest/10 text-forest rounded-bl-md shadow-premium"
          }`}
        >
          {/* Collapsible Reasoning Trace */}
          <Show when={props.message.reasoning}>
            <div class="rounded-xl border border-forest/10 bg-forest/[0.03] overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setIsReasoningOpen(!isReasoningOpen())}
                class="w-full px-2.5 py-1.5 flex items-center justify-between text-earth/70 hover:text-forest transition-colors cursor-pointer bg-forest/[0.02]"
              >
                <div class="flex items-center gap-1.5 font-medium">
                  <span class="material-icons text-sm text-forest/60">psychology</span>
                  <span>Thought process</span>
                  <Show when={props.message.isStreaming && !props.message.content}>
                    <span class="w-1.5 h-1.5 rounded-full bg-forest animate-ping ml-1" />
                  </Show>
                </div>
                <span class="material-icons text-xs transition-transform duration-200" classList={{ "rotate-180": isReasoningOpen() }}>
                  expand_more
                </span>
              </button>

              <Show when={isReasoningOpen()}>
                <div class="px-2.5 py-2 text-earth/80 font-mono text-[10px] leading-relaxed border-t border-forest/5 whitespace-pre-wrap bg-white/40 max-h-48 overflow-y-auto custom-scrollbar">
                  {props.message.reasoning}
                </div>
              </Show>
            </div>
          </Show>

          {/* Main Message Content */}
          <Show
            when={props.message.content}
            fallback={
              <Show when={props.message.isStreaming && !props.message.reasoning}>
                <div class="flex items-center gap-1.5 text-earth/70 font-medium">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
                  <span>Thinking…</span>
                </div>
              </Show>
            }
          >
            <div>
              {sanitizedContent()}
              <Show when={props.message.isStreaming}>
                <span class="inline-block w-1.5 h-3 ml-0.5 bg-current opacity-60 animate-pulse" />
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default ChatMessage;
