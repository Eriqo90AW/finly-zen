import SearchBar from "./SearchBar";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { state, setState, nextMonth, prevMonth } from "../../store";
import {
  portfolioState,
  setCurrencyView,
  refreshPortfolio,
  loadPortfolios,
} from "../../store/portfolioStore";
import {
  formatUSD,
  formatUSDCompact,
  getUsdRate,
  formatRupiah,
} from "../../utils/format";
import { Show, createSignal, For } from "solid-js";
import { currentStockData, isStockLoading } from "../../store/stockContext";
import { getMarketStatus } from "../../utils/marketTime";
import { onCleanup, onMount } from "solid-js";
import type { MarketStatus } from "../../types";
import { getPortfolioColor } from "../../utils/colors";

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isStockPage = () => location.pathname.startsWith("/stock");
  const isPortfolioPage = () => location.pathname.startsWith("/portfolio");

  const [marketStatus, setMarketStatus] =
    createSignal<MarketStatus>(getMarketStatus());

  // Real-time WIB clock helper
  const getWibDateTime = () => {
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
  };

  const [wibTime, setWibTime] = createSignal(getWibDateTime());
  const [isSwitcherOpen, setIsSwitcherOpen] = createSignal(false);

  let timer: any;
  onMount(() => {
    timer = setInterval(() => {
      setMarketStatus(getMarketStatus());
      setWibTime(getWibDateTime());
    }, 1000);
    window.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    clearInterval(timer);
    window.removeEventListener("click", handleClickOutside);
  });

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".portfolio-switcher-container")) {
      setIsSwitcherOpen(false);
    }
  };

  const activePortfolioName = () => {
    if (!params.id) return "Overview";
    const found = portfolioState.portfolios.find((p) => p.id === params.id);
    return found ? found.name : "Portfolio";
  };

  const handleSwitchPortfolio = (id: string) => {
    setIsSwitcherOpen(false);
    if (id) {
      navigate(`/portfolio/${id}`);
    } else {
      navigate("/portfolio");
    }
  };

  const formattedDate = () => {
    const d = new Date(state.ui.currentMonth);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <header class="h-20 bg-white border-b border-forest/10 flex items-center justify-between px-8 shrink-0">
      {/* Left Section: Adaptive Header */}
      <div class="flex items-center gap-6">
        <Show
          when={!isStockPage()}
          fallback={
            <div class="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer"
              >
                <ChevronLeftIcon />
              </button>
              <div class="h-8 w-px bg-forest/10 mx-1" />

              <Show
                when={currentStockData()}
                fallback={
                  <div class="flex items-center gap-2">
                    <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                      {params.ticker}
                    </span>
                    <span class="text-xs text-earth font-medium animate-ellipsis">
                      Loading data
                    </span>
                  </div>
                }
              >
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <h2 class="text-xl font-cormorant font-bold text-forest leading-none">
                      {currentStockData()?.company_name}
                    </h2>
                    <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider">
                      {currentStockData()?.ticker}
                    </span>
                    <span class="bg-sage text-forest text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {currentStockData()?.exchange}
                    </span>
                  </div>
                  <div class="flex items-center gap-3 mt-1">
                    <span class="text-sm font-outfit font-bold text-forest">
                      {formatUSD(
                        currentStockData()?.valuation.extended_hours_price || 0,
                      )}
                    </span>
                    <span class="text-[10px] text-earth font-medium">
                      Mkt Cap:{" "}
                      {formatUSDCompact(
                        currentStockData()?.valuation.market_cap || 0,
                      )}
                    </span>
                    <span class="text-[9px] text-earth/60 uppercase tracking-widest">
                      As of:{" "}
                      {new Date(
                        currentStockData()?.as_of || "",
                      ).toLocaleDateString()}
                    </span>

                    {/* Market Timing Indicator */}
                    <div class="flex items-center gap-2 px-2 py-0.5 bg-sage/30 rounded-full border border-forest/5">
                      <div
                        class={`w-2 h-2 rounded-full ${marketStatus().color} animate-pulse-soft`}
                      ></div>
                      <span class="text-[10px] font-bold text-forest uppercase tracking-tight">
                        {marketStatus().session}
                      </span>
                    </div>

                    <Show when={isStockLoading()}>
                      <div class="flex items-center gap-1.5">
                        <span class="text-[9px] text-forest font-bold uppercase tracking-widest animate-ellipsis">
                          Loading
                        </span>
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>
            </div>
          }
        >
          <Show
            when={isPortfolioPage()}
            fallback={
              <>
                {/* Month Navigator (Expense Routes) */}
                <div class="flex items-center gap-3">
                  <button
                    onClick={prevMonth}
                    class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 hover:cursor-pointer"
                  >
                    <ChevronLeftIcon />
                  </button>
                  <h2 class="text-lg font-outfit font-bold text-forest min-w-[140px] text-center">
                    {formattedDate()}
                  </h2>
                  <button
                    onClick={nextMonth}
                    class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 hover:cursor-pointer"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>

                {/* Date Period Selector */}
                <div class="relative group">
                  <select
                    value={state.ui.datePeriod}
                    onInput={(e) =>
                      setState("ui", "datePeriod", e.currentTarget.value as any)
                    }
                    class="appearance-none bg-sage/20 border border-forest/10 rounded-xl px-4 py-2 pr-10 font-outfit text-xs font-bold text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all cursor-pointer hover:bg-sage/30"
                  >
                    <option value="1-30">1 - 30</option>
                    <option value="21-20">21 - 20</option>
                    <option value="25-25">25 - 25</option>
                  </select>
                  <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </>
            }
          >
            <div class="flex items-center gap-2">
              {/* Ticking WIB Clock */}
              <div class="flex items-center justify-between px-3 py-2.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[11px] font-bold w-[11.5rem] overflow-hidden text-nowrap shrink-0">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="material-icons !text-[16.5px] text-forest/50 shrink-0">
                    schedule
                  </span>
                  <span class="truncate">{wibTime()}</span>
                </div>
                <span class="text-forest/80 uppercase text-[11px] shrink-0">
                  WIB
                </span>
              </div>

              {/* Active Portfolio Quick Switcher Dropdown */}
              <div class="relative portfolio-switcher-container shrink-0">
                <button
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen())}
                  class="flex items-center gap-2 px-3 py-1.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[10px] font-bold hover:bg-sage/30 hover:border-forest/10 transition-all cursor-pointer"
                >
                  <span class="material-icons !text-[14px] text-forest/60">
                    account_balance_wallet
                  </span>
                  <span class="truncate max-w-[120px]">
                    {activePortfolioName()}
                  </span>
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
                      onClick={() => handleSwitchPortfolio("")}
                      class="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                      classList={{
                        "bg-sage/40 text-forest": !params.id,
                        "text-forest/70 hover:bg-sage/30 hover:text-forest":
                          !!params.id,
                      }}
                    >
                      <span class="material-icons !text-[14px] text-forest/50">
                        grid_view
                      </span>
                      <span>All Portfolios (Overview)</span>
                    </button>

                    <div class="h-px bg-forest/5 my-1" />

                    <div class="max-h-48 overflow-y-auto">
                      <For each={portfolioState.portfolios}>
                        {(p) => {
                          const pColor = getPortfolioColor(p.name);
                          const isActive = () => p.id === params.id;
                          return (
                            <button
                              onClick={() => handleSwitchPortfolio(p.id)}
                              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                              classList={{
                                "bg-sage/40 text-forest": isActive(),
                                "text-forest/70 hover:bg-sage/30 hover:text-forest":
                                  !isActive(),
                              }}
                            >
                              <div class="flex items-center gap-2 min-w-0">
                                <div
                                  class="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ "background-color": pColor }}
                                />
                                <span class="truncate max-w-[130px]">
                                  {p.name}
                                </span>
                              </div>
                              <Show when={isActive()}>
                                <span class="material-icons !text-[12px] text-forest">
                                  check
                                </span>
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
              <div class="flex items-center gap-2 px-3 py-2.5 bg-sage/30 rounded-xl border border-forest/5 w-[14.75rem]">
                <div
                  class={`w-2 h-2 rounded-full ${marketStatus().color} animate-pulse-soft`}
                ></div>
                <span class="text-[10px] font-bold text-forest uppercase tracking-tight">
                  US Market: {marketStatus().session}
                </span>
                <span class="text-[9px] text-forest/60 font-semibold lowercase">
                  ({marketStatus().timeRemaining} left)
                </span>
              </div>

              {/* Unified Exchange Rate & Currency Toggle Capsule */}
              <div class="flex items-center gap-3 pl-3 pr-1 py-1 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[10px] font-bold shrink-0">
                <div class="flex items-center gap-1.5">
                  <span class="material-icons !text-[14px] text-forest/50">
                    currency_exchange
                  </span>
                  <span>1 USD = {formatRupiah(getUsdRate())}</span>
                </div>

                <div class="w-px h-4 bg-forest/10" />

                <div class="flex bg-sage/10 p-[0.125rem] rounded-lg border border-forest/5 shrink-0">
                  <button
                    onClick={() => setCurrencyView("IDR")}
                    class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === "IDR" ? "bg-forest text-white shadow-sm" : "text-forest/60 hover:text-forest"}`}
                  >
                    IDR
                  </button>
                  <button
                    onClick={() => setCurrencyView("USD")}
                    class={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === "USD" ? "bg-forest text-white shadow-sm" : "text-forest/60 hover:text-forest"}`}
                  >
                    USD
                  </button>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  if (params.id) {
                    refreshPortfolio(params.id);
                  } else {
                    loadPortfolios();
                  }
                }}
                disabled={
                  portfolioState.isRefreshing || portfolioState.isLoading
                }
                class="w-10 h-[2.15rem] rounded-xl flex items-center justify-center bg-sage/20 border border-forest/5 text-forest/80 hover:bg-sage/30 hover:border-forest/10 hover:text-forest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/refresh"
                title="Refresh Portfolio Data"
              >
                <span
                  class="material-icons !text-[18px] group-hover/refresh:rotate-180 transition-transform duration-500"
                  classList={{
                    "animate-spin":
                      portfolioState.isRefreshing || portfolioState.isLoading,
                  }}
                >
                  sync
                </span>
              </button>
            </div>
          </Show>
        </Show>
      </div>

      {/* Search & User */}
      <div class="flex items-center gap-6">
        <Show when={!isPortfolioPage()}>
          <SearchBar />
        </Show>

        <button
          onClick={() => setState("ui", "insightsOpen", !state.ui.insightsOpen)}
          class={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            state.ui.insightsOpen
              ? "bg-forest text-white"
              : "bg-sage/50 text-forest hover:bg-sage"
          }`}
        >
          <span class="material-icons text-2xl">eco</span>
        </button>

        <div class="flex items-center gap-3 pl-4 border-l border-forest/10">
          <div class="text-right">
            <p class="text-sm font-outfit font-semibold text-forest">
              Hello, {state.settings.userName}
            </p>
            <p class="text-[10px] text-earth uppercase tracking-widest">
              Master Gardener
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center overflow-hidden border border-forest/5">
            <img
              src={`https://ui-avatars.com/api/?name=${state.settings.userName}&background=1A4D2E&color=fff`}
              alt="Avatar"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
