import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { type Accessor, For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { fetchUsdRate } from "../../data/portfolioData";
import {
  loadPortfolios,
  portfolioState,
  refreshPortfolio,
  setCurrencyView,
} from "../../store/portfolioStore";
import type { MarketStatus } from "../../types";
import { getPortfolioColor } from "../../utils/colors";
import { formatRupiah, getUsdRate, setUsdExchangeRate } from "../../utils/format";

interface TopBarPortfolioDesktopProps {
  wibTime: Accessor<string>;
  marketStatus: Accessor<MarketStatus>;
  activePortfolioName: Accessor<string>;
}

interface TopBarPortfolioMobileProps {
  wibTime: Accessor<string>;
}

function triggerPortfolioRefresh(pathname: string, paramId?: string) {
  if (pathname === "/quick-portfolio") {
    const qp = portfolioState.portfolios.find((p) => p.name === "Quick Portfolio");
    if (qp) refreshPortfolio(qp.id);
  } else if (paramId) {
    refreshPortfolio(paramId);
  } else {
    loadPortfolios();
  }
}

export const TopBarPortfolioControlsDesktop = (props: TopBarPortfolioDesktopProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [isSwitcherOpen, setIsSwitcherOpen] = createSignal(false);
  const [isRefreshingUsd, setIsRefreshingUsd] = createSignal(false);

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".portfolio-switcher-container")) {
      setIsSwitcherOpen(false);
    }
  };

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("click", handleClickOutside);
  });

  const handleSwitchPortfolio = (id: string) => {
    setIsSwitcherOpen(false);
    if (id) {
      const found = portfolioState.portfolios.find((p) => p.id === id);
      if (found && found.name === "Quick Portfolio") {
        navigate("/quick-portfolio");
      } else {
        navigate(`/portfolio/${id}`);
      }
    } else {
      navigate("/portfolio");
    }
  };

  const handleRefreshUsd = async () => {
    if (isRefreshingUsd()) return;
    setIsRefreshingUsd(true);
    try {
      const rate = await fetchUsdRate();
      setUsdExchangeRate(rate);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingUsd(false);
    }
  };

  return (
    <div class="flex items-center gap-2">
      {/* Ticking WIB Clock */}
      <div class="flex items-center justify-between px-3 py-2.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[11px] font-bold w-[11.6rem] overflow-hidden text-nowrap shrink-0">
        <div class="flex items-center gap-1.5 truncate">
          <span class="material-icons !text-[16.5px] text-forest/50 shrink-0">schedule</span>
          <span class="truncate">{props.wibTime()}</span>
        </div>
        <span class="text-forest/80 uppercase text-[11px] shrink-0">WIB</span>
      </div>

      {/* Active Portfolio Quick Switcher Dropdown */}
      <div class="relative portfolio-switcher-container shrink-0">
        <button
          type="button"
          onClick={() => setIsSwitcherOpen(!isSwitcherOpen())}
          class="flex items-center gap-2 px-3 py-1.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[10px] font-bold hover:bg-sage/30 hover:border-forest/10 transition-all cursor-pointer"
        >
          <span class="material-icons !text-[14px] text-forest/60">account_balance_wallet</span>
          <span class="truncate max-w-[120px]">{props.activePortfolioName()}</span>
          <span
            class="material-icons text-[14px] text-forest/60 transition-transform duration-200"
            classList={{ "rotate-180": isSwitcherOpen() }}
          >
            expand_more
          </span>
        </button>

        <Show when={isSwitcherOpen()}>
          <div class="absolute top-[calc(100%+6px)] left-0 min-w-[200px] bg-white border border-forest/10 rounded-xl shadow-premium z-50 p-1 flex flex-col gap-0.5 animate-slide-down">
            <button
              type="button"
              onClick={() => handleSwitchPortfolio("")}
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
              classList={{
                "bg-sage/40 text-forest": !params.id && location.pathname === "/portfolio",
                "text-forest/70 hover:bg-sage/30 hover:text-forest":
                  !!params.id || location.pathname === "/quick-portfolio",
              }}
            >
              <span class="material-icons !text-[14px] text-forest/50">grid_view</span>
              <span>All Portfolios (Overview)</span>
            </button>

            <div class="h-px bg-forest/5 my-1" />

            <div class="max-h-48 overflow-y-auto">
              <For each={portfolioState.portfolios}>
                {(p) => {
                  const pColor = getPortfolioColor(p.name);
                  const isActive = () => {
                    if (location.pathname === "/quick-portfolio") {
                      return p.name === "Quick Portfolio";
                    }
                    return p.id === params.id;
                  };
                  return (
                    <button
                      type="button"
                      onClick={() => handleSwitchPortfolio(p.id)}
                      class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                      classList={{
                        "bg-sage/40 text-forest": isActive(),
                        "text-forest/70 hover:bg-sage/30 hover:text-forest": !isActive(),
                      }}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <div
                          class="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ "background-color": pColor }}
                        />
                        <span class="truncate max-w-[130px]">{p.name}</span>
                      </div>
                      <Show when={isActive()}>
                        <span class="material-icons !text-[12px] text-forest">check</span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Vertical Divider */}
      <div class="w-px h-6 mx-2 bg-forest/10" />

      {/* Market Session Indicator */}
      <div class="flex items-center gap-2 px-3 py-2.5 bg-sage/30 rounded-xl border border-forest/5 min-w-[13rem] whitespace-nowrap shrink-0">
        <div class={`w-2 h-2 rounded-full ${props.marketStatus().color} animate-pulse-soft`} />
        <span class="text-[10px] font-bold text-forest uppercase tracking-tight">
          US: {props.marketStatus().session}
        </span>
        <span class="text-[9px] text-forest/60 font-semibold lowercase">
          ({props.marketStatus().timeRemaining} left)
        </span>
      </div>

      {/* Unified Exchange Rate & Currency Toggle Capsule */}
      <div class="flex items-center gap-3 pl-3 pr-1 py-1 bg-sage/30 rounded-xl border border-forest/5 text-forest/80 text-[10px] font-bold shrink-0">
        <div class="flex items-center gap-1.5">
          <span class="material-icons !text-[14px] text-forest/50">currency_exchange</span>
          <span>1 USD = {formatRupiah(getUsdRate())}</span>
          <button
            type="button"
            onClick={handleRefreshUsd}
            class="ml-1 flex items-center justify-center p-0.5 rounded hover:bg-forest/10 transition-colors text-forest/60 hover:text-forest cursor-pointer"
            classList={{ "animate-spin": isRefreshingUsd() }}
            title="Refresh Exchange Rate"
          >
            <span class="material-icons !text-[12px]">sync</span>
          </button>
        </div>

        <div class="w-px h-4 bg-forest/10" />

        <div class="flex bg-sage/10 p-[0.125rem] rounded-lg border border-forest/5 shrink-0">
          <button
            type="button"
            onClick={() => setCurrencyView("IDR")}
            class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === "IDR" ? "bg-forest text-white shadow-sm" : "text-forest/60 hover:text-forest"}`}
          >
            IDR
          </button>
          <button
            type="button"
            onClick={() => setCurrencyView("USD")}
            class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === "USD" ? "bg-forest text-white shadow-sm" : "text-forest/60 hover:text-forest"}`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={() => triggerPortfolioRefresh(location.pathname, params.id)}
        disabled={portfolioState.isRefreshing || portfolioState.isLoading}
        class="w-10 h-[2.15rem] rounded-xl flex items-center justify-center bg-sage/30 border border-forest/6 text-forest/80 hover:bg-sage/30 hover:border-forest/10 hover:text-forest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/refresh"
        title="Refresh Portfolio Data"
      >
        <span
          class="material-icons !text-[18px] group-hover/refresh:rotate-180 transition-transform duration-500"
          classList={{
            "animate-spin": portfolioState.isRefreshing || portfolioState.isLoading,
          }}
        >
          sync
        </span>
      </button>
    </div>
  );
};

export const TopBarPortfolioControlsMobile = (props: TopBarPortfolioMobileProps) => {
  const location = useLocation();
  const params = useParams();

  return (
    <div class="flex items-center gap-2 shrink-0 py-1">
      <div class="flex items-center gap-1 px-2 py-1 bg-sage/20 rounded-lg text-[9px] font-bold text-forest/80 shrink-0">
        <span class="material-icons !text-[12px] text-forest/50">schedule</span>
        <span>{props.wibTime()}</span>
      </div>

      <div class="flex items-center gap-1 px-2 py-1 bg-sage/30 rounded-lg text-[9px] font-bold text-forest/80 shrink-0">
        <span>1 USD = {formatRupiah(getUsdRate())}</span>
      </div>

      <div class="flex bg-sage/20 p-0.5 rounded-lg border border-forest/5 shrink-0">
        <button
          type="button"
          onClick={() => setCurrencyView("IDR")}
          class={`px-2 py-0.5 rounded text-[8px] font-bold ${portfolioState.currencyView === "IDR" ? "bg-forest text-white" : "text-forest/60"}`}
        >
          IDR
        </button>
        <button
          type="button"
          onClick={() => setCurrencyView("USD")}
          class={`px-2 py-0.5 rounded text-[8px] font-bold ${portfolioState.currencyView === "USD" ? "bg-forest text-white" : "text-forest/60"}`}
        >
          USD
        </button>
      </div>

      <button
        type="button"
        onClick={() => triggerPortfolioRefresh(location.pathname, params.id)}
        class="w-7 h-7 rounded-lg bg-sage/40 flex items-center justify-center text-forest shrink-0"
      >
        <span class="material-icons !text-[14px]">sync</span>
      </button>
    </div>
  );
};
