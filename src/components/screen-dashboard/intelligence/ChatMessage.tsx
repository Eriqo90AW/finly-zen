import { createSignal, createEffect, Show } from "solid-js";
import type { ChatMessage as ChatMessageType } from "../../../types/intelligence";

interface Props {
  message: ChatMessageType;
}

const ChatMessage = (props: Props) => {
  const isUser = () => props.message.role === "user";
  const [isReasoningOpen, setIsReasoningOpen] = createSignal(false);
  const [isOcrOpen, setIsOcrOpen] = createSignal(false);

  // Auto-expand reasoning while it is actively streaming if no content yet
  createEffect(() => {
    if (props.message.isStreaming && props.message.reasoning && !props.message.content) {
      setIsReasoningOpen(true);
    }
  });

  const parsedUserMessage = () => {
    const raw = props.message.content || "";
    const ocrMatch = raw.match(/Extracted Text \(OCR\):\n"""\n([\s\S]*?)\n"""/);
    const userNoteMatch = raw.match(/User Note:\s*([\s\S]*)$/);

    if (ocrMatch) {
      return {
        hasOcr: true,
        ocrText: ocrMatch[1].trim(),
        userNote: userNoteMatch ? userNoteMatch[1].trim() : "",
      };
    }

    return {
      hasOcr: false,
      ocrText: "",
      userNote: raw,
    };
  };

  const sanitizedContent = () => {
    let text = props.message.content || "";
    // Strip XML tool call tags and action blocks so raw function calling is invisible to users
    text = text.replace(/<tool_call(?:s)?>[\s\S]*?<\/tool_call(?:s)?>/gi, "");
    text = text.replace(/<action>[\s\S]*?<\/action>/gi, "");
    // Strip unclosed tool_call tag if currently streaming
    text = text.replace(/<tool_call(?:s)?>[\s\S]*$/gi, "");
    text = text.replace(/<action>[\s\S]*$/gi, "");
    // Strip markdown image tags to prevent tracking-pixel / image-based exfiltration
    text = text.replace(/!\[.*?\]\(.*?\)/g, "[Image removed for security]");
    return text.trim();
  };

  const shouldRender = () => {
    if (props.message.role === "user") return true;
    if (props.message.role === "assistant") {
      // If streaming, always show thinking or tokens
      if (props.message.isStreaming) return true;
      // If completed, only show if there is reasoning or text content
      return Boolean(props.message.reasoning || sanitizedContent());
    }
    return false;
  };

  return (
    <Show when={shouldRender()}>
      <div class={`flex ${isUser() ? "justify-end" : "justify-start"}`}>
        <div
          class={`max-w-[92%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap space-y-2 ${
            isUser()
              ? "bg-forest text-white rounded-br-md"
              : "bg-white border border-forest/10 text-forest rounded-bl-md shadow-premium"
          }`}
        >
          {/* User Image Attachment */}
          <Show when={isUser() && props.message.imageBase64}>
            <div class="space-y-1.5">
              <div class="rounded-xl overflow-hidden border border-white/20 max-w-[220px] max-h-48 bg-black/10">
                <img
                  src={props.message.imageBase64}
                  alt={props.message.imageFileName || "Uploaded receipt"}
                  class="w-full h-full object-cover"
                />
              </div>

              {/* OCR Scanning Progress Indicator */}
              <Show when={props.message.isOcrProcessing}>
                <div class="flex items-center gap-1.5 text-[11px] text-white/90 bg-white/15 px-2.5 py-1 rounded-lg w-fit">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                  <span>Scanning receipt text…</span>
                </div>
              </Show>

              {/* Collapsible Extracted OCR Text for User */}
              <Show when={!props.message.isOcrProcessing && parsedUserMessage().hasOcr}>
                <div class="rounded-xl border border-white/20 bg-white/10 overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsOcrOpen(!isOcrOpen())}
                    class="w-full px-2.5 py-1 flex items-center justify-between text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <div class="flex items-center gap-1 font-medium text-[10px]">
                      <span class="material-icons text-xs text-white/70">receipt_long</span>
                      <span>Extracted Receipt Text</span>
                    </div>
                    <span
                      class="material-icons text-xs transition-transform duration-200"
                      classList={{ "rotate-180": isOcrOpen() }}
                    >
                      expand_more
                    </span>
                  </button>

                  <Show when={isOcrOpen()}>
                    <div class="px-2.5 py-1.5 text-white/90 font-mono text-[10px] leading-tight border-t border-white/10 whitespace-pre-wrap bg-black/20 max-h-36 overflow-y-auto custom-scrollbar">
                      {parsedUserMessage().ocrText}
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>

          {/* Collapsible Reasoning Trace (Assistant) */}
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
                <span
                  class="material-icons text-xs transition-transform duration-200"
                  classList={{ "rotate-180": isReasoningOpen() }}
                >
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
            when={sanitizedContent()}
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
              {isUser() && parsedUserMessage().hasOcr
                ? (parsedUserMessage().userNote || "Analyze receipt")
                : sanitizedContent()}
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
