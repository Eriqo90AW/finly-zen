import { useNavigate } from "@solidjs/router";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import type { Accessor } from "solid-js";
import { isDividendsRefreshing, refreshDividends } from "../../data/dividendData";
import type { IDXMarketStatus, MarketStatus } from "../../types";

interface TopBarJournalProps {
  wibTime: Accessor<string>;
  marketStatus: Accessor<MarketStatus>;
}

interface TopBarDividendProps {
  wibTime: Accessor<string>;
  idxMarketStatus: Accessor<IDXMarketStatus>;
}

export const TopBarJournalHeaderDesktop = (props: TopBarJournalProps) => {
  return (
    <div class="flex items-center gap-4 flex-nowrap shrink-0">
      <h2 class="text-xl font-cormorant font-bold text-forest leading-none whitespace-nowrap">
        Trading Journal
      </h2>
      <div class="h-6 w-px bg-forest/10 mx-1 shrink-0" />

      <nav class="flex items-center gap-2">
        <a
          href="/trading-journal"
          class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-forest/5"
        >
          Overview
        </a>
        <button
          type="button"
          onClick={() => alert("Analytics feature coming soon!")}
          class="px-3 py-1.5 text-earth hover:text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => alert("Watchlists feature coming soon!")}
          class="px-3 py-1.5 text-earth hover:text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          Watchlist
        </button>
      </nav>

      {/* Clock & Market status indicator */}
      <div class="flex items-center gap-3 ml-4 shrink-0">
        <div class="flex items-center justify-between px-3 py-1.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[10px] font-bold w-[10.5rem] overflow-hidden text-nowrap">
          <div class="flex items-center gap-1 truncate">
            <span class="material-icons !text-[14px] text-forest/50 shrink-0">schedule</span>
            <span class="truncate">{props.wibTime()}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-sage/30 rounded-xl border border-forest/5">
          <div class={`w-1.5 h-1.5 rounded-full ${props.marketStatus().color} animate-pulse-soft`} />
          <span class="text-[9px] font-bold text-forest uppercase tracking-tight">
            US: {props.marketStatus().session}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TopBarJournalHeaderMobile = (props: { wibTime: Accessor<string> }) => {
  return (
    <div class="flex items-center gap-2 shrink-0 py-1">
      <a
        href="/trading-journal"
        class="px-2.5 py-1 bg-sage text-forest text-[9px] font-bold uppercase rounded-lg shrink-0"
      >
        Overview
      </a>
      <div class="flex items-center gap-1 px-2 py-1 bg-sage/20 rounded-lg text-[9px] font-bold text-forest/80 shrink-0">
        <span class="material-icons !text-[12px] text-forest/50">schedule</span>
        <span>{props.wibTime()}</span>
      </div>
    </div>
  );
};

export const TopBarDividendHeaderDesktop = (props: TopBarDividendProps) => {
  const navigate = useNavigate();

  return (
    <div class="flex items-center gap-4 flex-nowrap shrink-0">
      <button
        type="button"
        onClick={() => navigate(-1)}
        class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5 cursor-pointer shrink-0"
      >
        <ChevronLeftIcon />
      </button>
      <div class="h-8 w-px bg-forest/10 mx-1 shrink-0" />

      <div class="flex flex-col shrink-0 min-w-0">
        <h2 class="text-xl font-cormorant font-bold text-forest leading-none whitespace-nowrap">
          IDX Dividend Calendar
        </h2>
        <div class="flex items-center gap-3 mt-1 whitespace-nowrap">
          <span class="text-[10px] text-earth font-medium">Indonesia Stock Exchange</span>
          <div class="w-px h-3 bg-forest/10" />
          <span class="text-[10px] text-earth font-medium">2025 - 2026</span>
        </div>
      </div>

      {/* WIB Clock */}
      <div class="flex items-center justify-between px-3 py-2.5 bg-sage/20 rounded-xl border border-forest/5 text-forest/80 text-[11px] font-bold w-[11.6rem] overflow-hidden text-nowrap shrink-0 ml-4">
        <div class="flex items-center gap-1.5 truncate">
          <span class="material-icons !text-[16.5px] text-forest/50 shrink-0">schedule</span>
          <span class="truncate">{props.wibTime()}</span>
        </div>
        <span class="text-forest/80 uppercase text-[11px] shrink-0">WIB</span>
      </div>

      {/* IDX Market Status */}
      <div class="flex items-center gap-2 px-3 py-2.5 bg-sage/30 rounded-xl border border-forest/5 shrink-0 whitespace-nowrap">
        <div
          class={`w-2 h-2 rounded-full ${props.idxMarketStatus().color} animate-pulse-soft`}
        />
        <span class="text-[10px] font-bold text-forest uppercase tracking-tight">
          IDX: {props.idxMarketStatus().session}
        </span>
        <span class="text-[9px] text-forest/60 font-semibold lowercase">
          ({props.idxMarketStatus().timeRemaining} left)
        </span>
      </div>

      {/* Manual Sync Button */}
      <button
        type="button"
        onClick={() => refreshDividends(true)}
        disabled={isDividendsRefreshing()}
        title="Sync Dividends"
        class="flex items-center gap-1.5 px-3 py-2 bg-sage/40 hover:bg-sage/70 active:scale-95 transition-all rounded-xl border border-forest/10 text-forest text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
      >
        <span
          class={`material-icons !text-sm ${isDividendsRefreshing() ? "animate-spin" : ""}`}
        >
          sync
        </span>
        <span>{isDividendsRefreshing() ? "Syncing..." : "Sync"}</span>
      </button>
    </div>
  );
};

export const TopBarDividendHeaderMobile = (props: TopBarDividendProps) => {
  const navigate = useNavigate();

  return (
    <div class="flex items-center gap-2 shrink-0 py-1">
      <button
        type="button"
        onClick={() => navigate(-1)}
        class="w-7 h-7 rounded-lg bg-sage/50 flex items-center justify-center text-forest shrink-0"
      >
        <ChevronLeftIcon class="w-4 h-4" />
      </button>
      <div class="flex items-center gap-1 px-2 py-1 bg-sage/20 rounded-lg text-[9px] font-bold text-forest/80 shrink-0">
        <span class="material-icons !text-[12px] text-forest/50">schedule</span>
        <span>{props.wibTime()}</span>
      </div>
      <div class="flex items-center gap-1 px-2 py-1 bg-sage/30 rounded-lg text-[9px] font-bold text-forest shrink-0">
        <div class={`w-1.5 h-1.5 rounded-full ${props.idxMarketStatus().color}`} />
        <span>IDX: {props.idxMarketStatus().session}</span>
      </div>
      <button
        type="button"
        onClick={() => refreshDividends(true)}
        disabled={isDividendsRefreshing()}
        class="flex items-center gap-1 px-2 py-1 bg-sage/40 rounded-lg text-[9px] font-bold text-forest shrink-0"
      >
        <span
          class={`material-icons !text-[11px] ${isDividendsRefreshing() ? "animate-spin" : ""}`}
        >
          sync
        </span>
        <span>Sync</span>
      </button>
    </div>
  );
};
