import { useLocation, useParams } from "@solidjs/router";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { setState, state } from "../../store";
import { portfolioState } from "../../store/portfolioStore";
import { currentStockData } from "../../store/stockContext";
import type { MarketStatus } from "../../types";
import { getMarketStatus } from "../../utils/marketTime";
import SearchBar from "./SearchBar";
import { TopBarDateControlsDesktop, TopBarDateControlsMobile } from "./TopBarDateControls";
import {
  TopBarPortfolioControlsDesktop,
  TopBarPortfolioControlsMobile,
} from "./TopBarPortfolioControls";
import TopBarProfileMenu from "./TopBarProfileMenu";
import { TopBarStockHeaderDesktop, TopBarStockHeaderMobile } from "./TopBarStockHeader";

interface TopBarProps {
  onToggleSidebar?: () => void;
}

function getWibDateTime(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const dateStr = wibDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const timeStr = wibDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return `${dateStr} • ${timeStr}`;
}

const TopBar = (props: TopBarProps) => {
  const location = useLocation();
  const params = useParams();

  const isStockPage = () => location.pathname.startsWith("/stock");
  const isPortfolioPage = () =>
    location.pathname.startsWith("/portfolio") || location.pathname === "/quick-portfolio";

  const [marketStatus, setMarketStatus] = createSignal<MarketStatus>(getMarketStatus());
  const [wibTime, setWibTime] = createSignal(getWibDateTime());

  let timer: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    timer = setInterval(() => {
      setMarketStatus(getMarketStatus());
      setWibTime(getWibDateTime());
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });

  const activePortfolioName = () => {
    if (location.pathname === "/quick-portfolio") return "Quick Portfolio";
    if (!params.id) return "Overview";
    const found = portfolioState.portfolios.find((p) => p.id === params.id);
    return found ? found.name : "Portfolio";
  };

  const formattedDate = () => {
    const d = new Date(state.ui.currentMonth);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getMobileTitle = () => {
    const p = location.pathname;
    if (p === "/") return "Dashboard";
    if (p === "/budgets") return "Budgets";
    if (p === "/goals") return "Goals";
    if (p === "/reports") return "Reports";
    if (p.startsWith("/stock")) return currentStockData()?.ticker || params.ticker || "Markets";
    if (p === "/markets/list") return "Market Cap List";
    if (p === "/quick-portfolio") return "Quick Portfolio";
    if (p.startsWith("/portfolio")) return activePortfolioName();
    return "Finly Zen";
  };

  return (
    <header class="bg-white border-b border-forest/10 flex flex-col shrink-0">
      {/* Row 1: Primary Header Bar */}
      <div class="h-16 lg:h-20 flex items-center justify-between px-3 sm:px-4 lg:px-8">
        {/* Left Section: Mobile Hamburger + Desktop Left Header Content */}
        <div class="flex items-center gap-3 lg:gap-6 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => props.onToggleSidebar?.()}
            class="lg:hidden w-10 h-10 rounded-xl bg-sage/40 flex items-center justify-center text-forest hover:bg-sage transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            <span class="material-icons text-2xl">menu</span>
          </button>

          {/* Mobile Page Title */}
          <div class="lg:hidden flex items-center gap-2 min-w-0">
            <h1 class="text-lg font-cormorant font-bold text-forest truncate">
              {getMobileTitle()}
            </h1>
          </div>

          {/* Desktop Left Section */}
          <div class="hidden lg:flex items-center gap-6">
            <Show
              when={!isStockPage()}
              fallback={<TopBarStockHeaderDesktop marketStatus={marketStatus} />}
            >
              <Show
                when={isPortfolioPage()}
                fallback={<TopBarDateControlsDesktop formattedDate={formattedDate} />}
              >
                <TopBarPortfolioControlsDesktop
                  wibTime={wibTime}
                  marketStatus={marketStatus}
                  activePortfolioName={activePortfolioName}
                />
              </Show>
            </Show>
          </div>
        </div>

        {/* Right Section: SearchBar (desktop) + Insights Toggle + User Profile */}
        <div class="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <div class="hidden lg:block">
            <Show when={!isPortfolioPage()}>
              <SearchBar />
            </Show>
          </div>

          <button
            type="button"
            onClick={() => setState("ui", "insightsOpen", !state.ui.insightsOpen)}
            class={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              state.ui.insightsOpen
                ? "bg-forest text-white"
                : "bg-sage/50 text-forest hover:bg-sage"
            }`}
            title="Assistant / Insights"
            aria-label="Assistant / Insights"
          >
            <span class="material-icons text-xl sm:text-2xl">eco</span>
          </button>

          <TopBarProfileMenu />
        </div>
      </div>

      {/* Row 2 (Mobile only): Horizontally Scrollable Contextual Controls Strip */}
      <div class="lg:hidden px-3 pb-2 pt-0 overflow-x-auto custom-scrollbar-thin flex items-center gap-2 border-t border-forest/5">
        <Show
          when={!isStockPage()}
          fallback={<TopBarStockHeaderMobile marketStatus={marketStatus} />}
        >
          <Show
            when={isPortfolioPage()}
            fallback={<TopBarDateControlsMobile formattedDate={formattedDate} />}
          >
            <TopBarPortfolioControlsMobile wibTime={wibTime} />
          </Show>
        </Show>
      </div>
    </header>
  );
};

export default TopBar;
