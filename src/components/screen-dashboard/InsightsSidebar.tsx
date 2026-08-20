import { useLocation } from "@solidjs/router";
import { state } from "../../store";
import { clearIntelligenceChat } from "../../store/intelligenceStore";
import { getPageInfo } from "../../lib/pageContext";
import ChatPanel from "./intelligence/ChatPanel";

const InsightsSidebar = () => {
  const location = useLocation();
  const pageInfo = () => getPageInfo(location.pathname);

  const getAssistantIcon = () => {
    return pageInfo().assistantName === "Market Quant" ? "trending_up" : "eco";
  };

  return (
    <aside
      class={`h-screen bg-page-bg border-l border-forest/10 flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
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
          onClick={() => clearIntelligenceChat(pageInfo().model)}
          class="w-8 h-8 rounded-lg flex items-center justify-center text-earth/50 hover:text-forest hover:bg-sage/50 transition-colors cursor-pointer"
          title={`Clear ${pageInfo().assistantName} chat`}
          aria-label={`Clear ${pageInfo().assistantName} chat`}
        >
          <span class="material-icons text-lg">delete_outline</span>
        </button>
      </div>

      <ChatPanel />
    </aside>
  );
};

export default InsightsSidebar;
