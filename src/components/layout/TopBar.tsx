import SearchBar from "./SearchBar";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import { useLocation, A, useNavigate, useParams } from "@solidjs/router";
import { state, setState, nextMonth, prevMonth } from "../../store";
import { portfolioState, setCurrencyView } from "../../store/portfolioStore";
import { formatUSD, formatUSDCompact } from "../../utils/format";
import { Show, createSignal } from "solid-js";
import { currentStockData, isStockLoading } from "../../store/stockContext";
import { getMarketStatus } from "../../utils/marketTime";
import { onCleanup, onMount } from "solid-js";
import type { MarketStatus } from "../../types";


const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isStockPage = () => location.pathname.startsWith("/stock");
  const isPortfolioPage = () => location.pathname.startsWith("/portfolio");

  const [marketStatus, setMarketStatus] = createSignal<MarketStatus>(getMarketStatus());

  let timer: any;
  onMount(() => {
    timer = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });


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
              <A href="/" class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5">
                <ChevronLeftIcon />
              </A>
              <div class="h-8 w-px bg-forest/10 mx-1" />
              
              <Show when={currentStockData()} fallback={
                <div class="flex items-center gap-2">
                  <span class="bg-forest text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                    {params.ticker}
                  </span>
                  <span class="text-xs text-earth font-medium animate-ellipsis">Loading data</span>
                </div>
              }>
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
                      {formatUSD(currentStockData()?.valuation.extended_hours_price || 0)}
                    </span>
                    <span class="text-[10px] text-earth font-medium">
                      Mkt Cap: {formatUSDCompact(currentStockData()?.valuation.market_cap || 0)}
                    </span>
                    <span class="text-[9px] text-earth/60 uppercase tracking-widest">
                      As of: {new Date(currentStockData()?.as_of || "").toLocaleDateString()}
                    </span>
                                      
                    {/* Market Timing Indicator */}
                    <div class="flex items-center gap-2 px-2 py-0.5 bg-sage/30 rounded-full border border-forest/5">
                      <div class={`w-2 h-2 rounded-full ${marketStatus().color} animate-pulse-soft`}></div>
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
          <Show when={isPortfolioPage()} fallback={
            <>
              {/* Month Navigator (Expense Routes) */}
              <div class="flex items-center gap-3">
                <button 
                  onClick={prevMonth}
                  class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5"
                >
                  <ChevronLeftIcon />
                </button>
                <h2 class="text-lg font-outfit font-bold text-forest min-w-[140px] text-center">
                  {formattedDate()}
                </h2>
                <button 
                  onClick={nextMonth}
                  class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5"
                >
                  <ChevronLeftIcon />
                </button>
              </div>

              {/* Date Period Selector */}
              <div class="relative group">
                <select 
                  value={state.ui.datePeriod}
                  onInput={(e) => setState("ui", "datePeriod", e.currentTarget.value as any)}
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
          }>
            {/* Portfolio Currency Toggle */}
            <div class="flex bg-sage/10 p-1 rounded-xl border border-forest/5">
              <button 
                onClick={() => setCurrencyView('IDR')}
                class={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === 'IDR' ? 'bg-forest text-white shadow-md' : 'text-forest/60 hover:text-forest'}`}
              >
                IDR
              </button>
              <button 
                onClick={() => setCurrencyView('USD')}
                class={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${portfolioState.currencyView === 'USD' ? 'bg-forest text-white shadow-md' : 'text-forest/60 hover:text-forest'}`}
              >
                USD
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
            state.ui.insightsOpen ? "bg-forest text-white" : "bg-sage/50 text-forest hover:bg-sage"
          }`}
        >
          <span class="material-icons text-2xl">eco</span>
        </button>

        <div class="flex items-center gap-3 pl-4 border-l border-forest/10">
          <div class="text-right">
            <p class="text-sm font-outfit font-semibold text-forest">Hello, {state.settings.userName}</p>
            <p class="text-[10px] text-earth uppercase tracking-widest">Master Gardener</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center overflow-hidden border border-forest/5">
             <img src={`https://ui-avatars.com/api/?name=${state.settings.userName}&background=1A4D2E&color=fff`} alt="Avatar" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
