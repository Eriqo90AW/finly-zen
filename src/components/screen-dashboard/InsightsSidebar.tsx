import { useLocation } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { state, setState } from "../../store";
import { resetConversation } from "../../services/intelligence/chatOrchestrator";
import { getPageInfo } from "../../lib/pageContext";
import ChatPanel from "./intelligence/ChatPanel";
import CloseIcon from "@suid/icons-material/Close";

const InsightsSidebar = () => {
  const location = useLocation();
  const pageInfo = () => getPageInfo(location.pathname);

  const [viewportHeight, setViewportHeight] = createSignal<number | null>(null);

  onMount(() => {
    if (typeof window !== "undefined" && window.visualViewport) {
      const updateHeight = () => {
        if (window.visualViewport) {
          setViewportHeight(window.visualViewport.height);
        }
      };
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
      updateHeight();
    }
  });

  const getAssistantIcon = () => {
    return pageInfo().assistantName === "Market Quant" ? "trending_up" : "eco";
  };

  return (
    <>
      {/* Desktop Sidebar (lg+) */}
      <aside
        class={`hidden lg:flex h-dvh bg-page-bg border-l border-forest/10 flex-col shrink-0 transition-all duration-300 overflow-hidden ${
          state.ui.insightsOpen ? "w-[360px]" : "w-0 border-none"
        }`}
      >
        <div class="px-5 h-20 flex items-center justify-between border-b border-forest/10 shrink-0 bg-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-forest/10 text-forest flex items-center justify-center">
              <span class="material-icons text-xl">{getAssistantIcon()}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-outfit font-bold text-forest">{pageInfo().assistantName}</h3>
                <span class="px-2 py-0.5 rounded-full bg-forest/5 text-forest/80 text-[10px] font-medium border border-forest/10">
                  {pageInfo().name}
                </span>
              </div>
              <p class="text-[10px] text-earth/60 uppercase tracking-widest">{pageInfo().assistantRole}</p>
            </div>
          </div>

          <button
            onClick={() => resetConversation(pageInfo().model)}
            class="w-8 h-8 rounded-lg flex items-center justify-center text-earth/50 hover:text-forest hover:bg-sage/50 transition-colors cursor-pointer"
            title={`New chat / Reset conversation`}
            aria-label={`New chat / Reset conversation`}
          >
            <span class="material-icons text-lg">restart_alt</span>
          </button>
        </div>

        <ChatPanel />
      </aside>

      {/* Mobile Fullscreen Modal (< lg) */}
      <Show when={state.ui.insightsOpen}>
        <Portal>
          <div
            class="lg:hidden fixed inset-x-0 top-0 z-50 flex flex-col w-screen max-w-full bg-page-bg animate-fade-in overflow-hidden"
            style={{
              height: viewportHeight() ? `${viewportHeight()}px` : "100dvh",
              "max-height": viewportHeight() ? `${viewportHeight()}px` : "100dvh",
            }}
          >
            <div class="px-4 py-3 h-16 flex items-center justify-between border-b border-forest/10 shrink-0 bg-white shadow-xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                  <span class="material-icons text-lg">{getAssistantIcon()}</span>
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-outfit font-bold text-forest leading-none truncate">{pageInfo().assistantName}</h3>
                  <p class="text-[9px] text-earth/60 uppercase tracking-widest mt-0.5 truncate">{pageInfo().assistantRole}</p>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => resetConversation(pageInfo().model)}
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-earth/50 hover:text-forest hover:bg-sage/50 transition-colors cursor-pointer"
                  title="New chat"
                  aria-label="New chat"
                >
                  <span class="material-icons text-lg">restart_alt</span>
                </button>
                <button
                  onClick={() => setState("ui", "insightsOpen", false)}
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-earth/60 hover:text-forest hover:bg-sage/50 transition-colors cursor-pointer"
                  aria-label="Close assistant"
                >
                  <CloseIcon class="w-5 h-5" />
                </button>
              </div>
            </div>


            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ChatPanel />
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};

export default InsightsSidebar;
