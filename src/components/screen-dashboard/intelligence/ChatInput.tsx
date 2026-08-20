import { createSignal } from "solid-js";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = (props: Props) => {
  const [input, setInput] = createSignal("");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const text = input().trim();
    if (!text || props.disabled) return;
    props.onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="p-3 bg-white border-t border-forest/10">
      <div class="flex gap-2 items-center">
        <textarea
          rows={2}
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={props.disabled}
          placeholder={props.placeholder || "Ask about spending, budgets, portfolios…"}
          class="flex-1 resize-none px-3 py-2 text-xs rounded-xl border border-forest/15 bg-page-bg text-forest placeholder:text-earth/50 focus:outline-none focus:border-forest/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={props.disabled || !input().trim()}
          class="shrink-0 w-9 h-9 rounded-xl bg-forest text-white flex items-center justify-center disabled:opacity-40 hover:bg-forest/90 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Send message"
        >
          <span class="material-icons text-lg">send</span>
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
