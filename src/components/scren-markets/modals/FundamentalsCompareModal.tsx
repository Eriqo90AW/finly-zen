import { Show, For, createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import CloseRoundedIcon from "@suid/icons-material/CloseRounded";
import SearchIcon from "@suid/icons-material/SearchOutlined";
import { fetchStockData, searchTickers } from "../../../data/marketData";
import { debounce } from "../../../utils/debounce";
import { evaluateMetric } from "../../../utils/metricEvaluator";
import { Tooltip } from "../../modules/Tooltip";
import { formatUSD, formatUSDCompact, formatPercent, formatMultiple } from "../../../utils/format";
import type { StockData, TickerSearchResult } from "../../../types";

export interface FundamentalsCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCompany: StockData;
}

interface MetricDefinition {
  label: string;
  category: string;
  getValue: (d: StockData) => { rawValue: number | null | undefined; formatted: string };
  better: "lower" | "higher" | "closer_to_range" | "none";
  range?: [number, number];
  color: string;
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Valuation
  {
    label: "P/E (TTM)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.pe_ttm, formatted: formatMultiple(d.valuation.pe_ttm) }),
    better: "lower",
    color: "var(--color-fin-blue)"
  },
  {
    label: "P/E (Forward)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.pe_forward, formatted: formatMultiple(d.valuation.pe_forward) }),
    better: "lower",
    color: "var(--color-fin-blue)"
  },
  {
    label: "PEG Ratio",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.advanced_ratios.peg_ratio, formatted: d.advanced_ratios.peg_ratio?.toFixed(2) || "N/A" }),
    better: "lower",
    color: "var(--color-fin-purple)"
  },
  {
    label: "P/S (TTM)",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.price_to_sales_ttm, formatted: formatMultiple(d.valuation.price_to_sales_ttm) }),
    better: "lower",
    color: "var(--color-fin-blue)"
  },
  {
    label: "P/B",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.price_to_book, formatted: formatMultiple(d.valuation.price_to_book) }),
    better: "lower",
    color: "var(--color-fin-blue)"
  },
  {
    label: "EV / Revenue",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.advanced_ratios.ev_to_revenue, formatted: formatMultiple(d.advanced_ratios.ev_to_revenue) }),
    better: "lower",
    color: "var(--color-fin-purple)"
  },
  {
    label: "EV / EBITDA",
    category: "Valuation",
    getValue: (d) => ({ rawValue: d.valuation.ev_to_ebitda, formatted: formatMultiple(d.valuation.ev_to_ebitda) }),
    better: "lower",
    color: "var(--color-fin-purple)"
  },
  // Profitability
  {
    label: "Gross Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.gross_margin, formatted: formatPercent(d.advanced_ratios.gross_margin) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "Operating Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.operating_margin, formatted: formatPercent(d.advanced_ratios.operating_margin) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "Net Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.net_margin, formatted: formatPercent(d.advanced_ratios.net_margin) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "Profit Margin",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.valuation.profit_margin, formatted: formatPercent(d.valuation.profit_margin) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "ROE",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.roe, formatted: formatPercent(d.advanced_ratios.roe) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "ROA",
    category: "Profitability",
    getValue: (d) => ({ rawValue: d.advanced_ratios.roa, formatted: formatPercent(d.advanced_ratios.roa) }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  // Health & Risk
  {
    label: "Current Ratio",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.current_ratio, formatted: d.advanced_ratios.current_ratio?.toFixed(2) || "N/A" }),
    better: "closer_to_range",
    range: [1.5, 3.0],
    color: "var(--color-fin-amber)"
  },
  {
    label: "Debt / Equity",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.debt_to_equity, formatted: d.advanced_ratios.debt_to_equity?.toFixed(2) || "N/A" }),
    better: "lower",
    color: "var(--color-fin-amber)"
  },
  {
    label: "Beta",
    category: "Health & Risk",
    getValue: (d) => ({ rawValue: d.advanced_ratios.beta, formatted: d.advanced_ratios.beta?.toFixed(2) || "N/A" }),
    better: "closer_to_range",
    range: [0.8, 1.2],
    color: "var(--color-earth)"
  },
  {
    label: "Short % of Float",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.short_percent_of_float,
      formatted: d.advanced_ratios.short_percent_of_float != null ? (d.advanced_ratios.short_percent_of_float * 100).toFixed(2) + "%" : "N/A"
    }),
    better: "lower",
    color: "var(--color-earth)"
  },
  {
    label: "Dividend Yield",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.dividend_yield,
      formatted: d.advanced_ratios.dividend_yield != null ? (d.advanced_ratios.dividend_yield * 100).toFixed(2) + "%" : "N/A"
    }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  {
    label: "Dividend Rate",
    category: "Health & Risk",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.dividend_rate,
      formatted: d.advanced_ratios.dividend_rate != null ? formatUSD(d.advanced_ratios.dividend_rate) : "N/A"
    }),
    better: "higher",
    color: "var(--color-fin-green)"
  },
  // Market Data
  {
    label: "Shares Float",
    category: "Market Data",
    getValue: (d) => ({
      rawValue: d.advanced_ratios.float_shares,
      formatted: formatUSDCompact(d.advanced_ratios.float_shares).replace("$", "")
    }),
    better: "none",
    color: "var(--color-earth)"
  }
];

const categories = [
  { title: "Valuation", icon: "bar_chart" },
  { title: "Profitability", icon: "payments" },
  { title: "Health & Risk", icon: "health_and_safety" },
  { title: "Market Data", icon: "public" }
];

function getWinnerIndex(metricDef: MetricDefinition, companies: StockData[]): number | null {
  if (companies.length < 2) return null;
  
  const values = companies.map(c => metricDef.getValue(c).rawValue);
  
  const validEntries = values
    .map((v, idx) => ({ v, idx }))
    .filter((entry): entry is { v: number; idx: number } => entry.v !== null && entry.v !== undefined && !isNaN(entry.v));
    
  if (validEntries.length === 0) return null;
  
  if (metricDef.better === "lower") {
    let best = validEntries[0];
    for (let i = 1; i < validEntries.length; i++) {
      if (validEntries[i].v < best.v) {
        best = validEntries[i];
      }
    }
    return best.idx;
  }
  
  if (metricDef.better === "higher") {
    let best = validEntries[0];
    for (let i = 1; i < validEntries.length; i++) {
      if (validEntries[i].v > best.v) {
        best = validEntries[i];
      }
    }
    return best.idx;
  }
  
  if (metricDef.better === "closer_to_range" && metricDef.range) {
    const [min, max] = metricDef.range;
    let bestIdx = validEntries[0].idx;
    let bestDist = Math.max(0, min - validEntries[0].v) + Math.max(0, validEntries[0].v - max);
    
    for (let i = 1; i < validEntries.length; i++) {
      const entry = validEntries[i];
      const dist = Math.max(0, min - entry.v) + Math.max(0, entry.v - max);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = entry.idx;
      }
    }
    return bestIdx;
  }
  
  return null;
}

export const FundamentalsCompareModal = (props: FundamentalsCompareModalProps) => {
  const [compareCompanies, setCompareCompanies] = createSignal<StockData[]>([props.baseCompany]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<TickerSearchResult[]>([]);
  const [searchActive, setSearchActive] = createSignal(false);
  const [isSearching, setIsSearching] = createSignal(false);
  const [isFetchingColumn, setIsFetchingColumn] = createSignal(false);

  // Sync / Reset on open
  createEffect(() => {
    if (props.isOpen) {
      setCompareCompanies([props.baseCompany]);
      setSearchQuery("");
      setSearchResults([]);
      setSearchActive(false);
    }
  });

  const performSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchTickers(query);
      setSearchResults(data);
    } catch (err) {
      console.error("Error searching tickers in compare modal:", err);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  createEffect(() => {
    const query = searchQuery();
    if (query) {
      performSearch(query);
    } else {
      setSearchResults([]);
    }
  });

  const handleSelectTicker = async (ticker: string) => {
    setIsFetchingColumn(true);
    setSearchActive(false);
    setSearchQuery("");
    setSearchResults([]);
    try {
      // Check if already in list
      if (compareCompanies().some(c => c.ticker.toUpperCase() === ticker.toUpperCase())) {
        return;
      }
      const data = await fetchStockData(ticker);
      setCompareCompanies(prev => [...prev, data]);
    } catch (err) {
      console.error("Error adding ticker to comparison:", err);
    } finally {
      setIsFetchingColumn(false);
    }
  };

  const handleRemoveCompany = (idx: number) => {
    setCompareCompanies(prev => prev.filter((_, i) => i !== idx));
  };

  // Close search dropdown on click outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".search-slot-container")) {
      setSearchResults([]);
    }
  };

  window.addEventListener("click", handleClickOutside);
  onCleanup(() => window.removeEventListener("click", handleClickOutside));

  return (
    <Portal>
      <Show when={props.isOpen}>
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 backdrop-blur-sm transition-opacity duration-300 p-6"
          onClick={props.onClose}
        >
          <div 
            class="bg-white rounded-3xl py-8 px-10 w-[95vw] max-w-[70rem] h-[85vh] shadow-2xl relative flex flex-col border border-forest/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="flex items-center justify-between mb-3 border-b border-forest/5 pb-2">
              <div>
                <h4 class="font-outfit font-bold text-forest text-xl flex items-center gap-2 leading-none">
                  <span class="material-icons text-forest text-xl">compare_arrows</span>
                  <span>Fundamentals Comparison</span>
                </h4>
                <p class="text-[11px] text-earth/60 mt-0.5">Compare up to 4 companies side-by-side with real-time metrics and dynamic strength analysis.</p>
              </div>
              
              <button 
                onClick={props.onClose}
                class="p-2 rounded-xl text-earth/40 hover:text-forest hover:bg-sage/15 border border-transparent hover:border-forest/10 transition-all cursor-pointer flex items-center justify-center"
                title="Close"
              >
                <CloseRoundedIcon style={{ "font-size": "24px" }} />
              </button>
            </div>

            {/* Table Scrollable Container */}
            <div class="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-forest/10 bg-white custom-scrollbar">
              <table class="w-full border-collapse text-left table-fixed">
                <thead>
                  <tr class="border-b border-forest/20">
                    {/* Top-Left Cell */}
                    <th class="sticky top-0 left-0 z-30 bg-sage backdrop-blur-md py-2 px-3 w-[150px] border-r border-b border-forest/10">
                      <span class="text-[9px] font-black uppercase tracking-[0.12em] text-forest/70">
                        Metric Description
                      </span>
                    </th>
                    
                    {/* Company Headers (4 columns) */}
                    <For each={[0, 1, 2, 3]}>
                      {(i) => {
                        const company = () => compareCompanies()[i];
                        
                        return (
                          <th class="sticky top-0 z-20 bg-sage backdrop-blur-md py-2 px-3 w-[190px] border-r border-b border-forest/10 last:border-r-0">
                            <Show when={company()} fallback={
                              <Show when={i === compareCompanies().length} fallback={
                                // Empty Column Placeholder
                                <div class="h-12 flex flex-col items-center justify-center border border-dashed border-forest/10 rounded-xl bg-sage/[0.02] opacity-20">
                                  <span class="text-[8px] font-black text-earth uppercase tracking-[0.12em]">Locked Slot</span>
                                </div>
                              }>
                                {/* Add Company Active Slot */}
                                <div class="relative min-h-12 flex flex-col justify-center">
                                  <Show when={isFetchingColumn()} fallback={
                                    <Show when={searchActive()} fallback={
                                      <button 
                                        onClick={() => setSearchActive(true)}
                                        class="w-full h-9 flex items-center justify-center gap-1 border border-dashed border-forest/25 hover:border-forest/40 rounded-xl bg-sage/5 hover:bg-sage/10 text-forest font-bold text-[10px] tracking-wider transition-all cursor-pointer"
                                      >
                                        <span class="material-icons text-xs">add</span>
                                        <span>ADD TICKER</span>
                                      </button>
                                    }>
                                      <div class="relative search-slot-container">
                                        <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-earth w-3.5 h-3.5" />
                                        <input 
                                          type="text"
                                          value={searchQuery()}
                                          onInput={(e) => setSearchQuery(e.currentTarget.value)}
                                          placeholder="Search Ticker..."
                                          autofocus
                                          class="w-full h-8 bg-page-bg rounded-lg pl-7 pr-6 font-outfit text-[11px] focus:outline-none focus:ring-1 focus:ring-forest/20 transition-all text-forest font-bold uppercase"
                                          onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                              setSearchActive(false);
                                              setSearchQuery("");
                                              setSearchResults([]);
                                            }
                                          }}
                                        />
                                        <button 
                                          onClick={() => {
                                            setSearchActive(false);
                                            setSearchQuery("");
                                            setSearchResults([]);
                                          }}
                                          class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-earth/50 hover:text-forest flex items-center justify-center cursor-pointer"
                                        >
                                          <span class="material-icons text-base">close</span>
                                        </button>
                                        
                                        {/* Search Dropdown */}
                                        <Show when={searchResults().length > 0}>
                                          <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-forest/10 overflow-hidden z-50">
                                            <div class="max-h-40 overflow-y-auto custom-scrollbar">
                                              <For each={searchResults()}>
                                                {(ticker) => (
                                                  <button
                                                    onClick={() => handleSelectTicker(ticker.symbol)}
                                                    class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-sage/40 transition-colors border-b border-forest/5 last:border-0 text-left cursor-pointer"
                                                  >
                                                    <div class="flex flex-col">
                                                      <span class="font-outfit font-bold text-forest text-xs">{ticker.symbol}</span>
                                                      <span class="text-[9px] text-earth truncate max-w-[100px]">{ticker.name}</span>
                                                    </div>
                                                    <span class="text-[8px] bg-forest/5 text-forest/60 px-1 py-0.5 rounded uppercase font-black">{ticker.exchange}</span>
                                                  </button>
                                                )}
                                              </For>
                                            </div>
                                          </div>
                                        </Show>
                                        
                                        <Show when={isSearching()}>
                                          <div class="absolute right-6 top-1/2 -translate-y-1/2">
                                            <div class="w-3 h-3 border border-forest/20 border-t-forest rounded-full animate-spin" />
                                          </div>
                                        </Show>
                                      </div>
                                    </Show>
                                  }>
                                    <div class="flex flex-col items-center justify-center gap-1 h-9 bg-sage/5 border border-forest/5 rounded-xl">
                                      <div class="w-3.5 h-3.5 border border-forest/20 border-t-forest rounded-full animate-spin"></div>
                                      <span class="text-[8px] text-earth font-black uppercase tracking-wider">Fetching...</span>
                                    </div>
                                  </Show>
                                </div>
                              </Show>
                            }>
                              {/* Active Company Column Details */}
                              <div class="flex flex-col gap-1 relative">
                                <div class="flex items-center justify-between gap-1">
                                  <div class="flex items-center gap-1">
                                    <span class="bg-forest text-white text-[9px] px-1.5 py-0.2 rounded-md font-black tracking-widest shadow-sm">
                                      {company()?.ticker}
                                    </span>
                                    <Show when={i === 0}>
                                      <span class="text-[8px] bg-forest/5 text-forest/60 px-1 py-0.2 rounded-md font-black uppercase tracking-widest border border-forest/10">Base</span>
                                    </Show>
                                  </div>
                                  
                                  <Show when={i > 0}>
                                    <button 
                                      onClick={() => handleRemoveCompany(i)}
                                      class="p-0.5 rounded-md text-earth/50 hover:text-fin-red hover:bg-rose-50 border border-transparent hover:border-rose-500/10 transition-colors flex items-center justify-center cursor-pointer"
                                      title="Remove Ticker"
                                    >
                                      <span class="material-icons text-sm">delete</span>
                                    </button>
                                  </Show>
                                </div>
                                
                                <h5 class="text-[11px] font-bold font-outfit text-forest truncate leading-none mt-0.5">
                                  {company()?.company_name}
                                </h5>
                                
                                <div class="flex gap-1">
                                  <span class="bg-white/80 backdrop-blur-sm text-forest/60 text-[8px] px-1 py-0.2 rounded font-bold border border-forest/10 uppercase tracking-widest leading-none">
                                    {company()?.exchange}
                                  </span>
                                  <Show when={company()?.sector}>
                                    <span class="bg-fin-blue/5 text-fin-blue text-[8px] px-1.5 py-0.2 rounded font-bold border border-fin-blue/10 uppercase tracking-wide truncate max-w-[95px] leading-none">
                                      {company()?.sector}
                                    </span>
                                  </Show>
                                </div>
                              </div>
                            </Show>
                          </th>
                        );
                      }}
                    </For>
                  </tr>
                </thead>
                
                <tbody class="divide-y divide-forest/5">
                  <For each={categories}>
                    {(category) => (
                      <>
                        {/* Group Category Divider */}
                        <tr class="bg-sage/60 font-bold text-forest">
                          <td colspan="5" class="sticky left-0 z-10 bg-sage/[0.08] backdrop-blur-sm py-1.5 px-3 border-b border-forest/10 text-left">
                            <div class="flex items-center gap-1 opacity-90">
                              <span class="material-icons text-xs text-forest">{category.icon}</span>
                              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-earth">
                                {category.title}
                              </span>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Metrics inside Category */}
                        <For each={METRIC_DEFINITIONS.filter(m => m.category === category.title)}>
                          {(metricDef) => {
                            const winnerIdx = createMemo(() => getWinnerIndex(metricDef, compareCompanies()));
                            
                            return (
                              <tr class="hover:bg-sage/5 transition-colors">
                                {/* Metric Label (Sticky Left) */}
                                <td class="sticky left-0 z-10 bg-sage/30 py-1.5 px-3 font-outfit text-xs font-semibold text-earth border-r border-t border-forest/20">
                                  <div class="flex items-center gap-1">
                                    <div class="w-1.5 h-1.5 rounded-full" style={{ "background-color": metricDef.color }} />
                                    <span>{metricDef.label}</span>
                                  </div>
                                </td>
                                
                                {/* Metrics columns for compared stocks */}
                                <For each={[0, 1, 2, 3]}>
                                  {(i) => {
                                    const company = () => compareCompanies()[i];
                                    
                                    return (
                                      <td class="py-1 px-1.5 border-r border-forest/10 last:border-r-0 text-center">
                                        <Show when={company()}>
                                          {(() => {
                                            const { rawValue, formatted } = metricDef.getValue(company()!);
                                            const evalResult = createMemo(() => evaluateMetric(metricDef.label, rawValue));
                                            const isWinner = () => winnerIdx() === i;
                                            
                                            const cellBg = createMemo(() => {
                                              if (formatted === "N/A" || rawValue == null) return "bg-white/40 border-forest/5 hover:border-forest/20";
                                              if (isWinner()) return "bg-amber-500/[0.03] border-amber-500/20";
                                              
                                              switch (evalResult().signal) {
                                                case 'good':
                                                  return "bg-emerald-500/[0.01] border-emerald-500/5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]";
                                                case 'bad':
                                                  return "bg-rose-500/[0.01] border-rose-500/5 hover:border-rose-500/20 hover:bg-rose-500/[0.03]";
                                                case 'neutral':
                                                default:
                                                  return "bg-amber-500/[0.01] border-amber-500/5 hover:border-amber-500/20 hover:bg-amber-500/[0.03]";
                                              }
                                            });
                                            
                                            const badgeStyles = createMemo(() => {
                                              if (formatted === "N/A" || rawValue == null) return "bg-neutral-100 text-neutral-500 border-neutral-200/50";
                                              
                                              switch (evalResult().signal) {
                                                case 'good':
                                                  return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
                                                case 'bad':
                                                  return "bg-rose-500/15 text-rose-700 border-rose-500/20";
                                                case 'neutral':
                                                default:
                                                  return "bg-amber-500/15 text-amber-700 border-amber-500/20";
                                              }
                                            });
                                            
                                            const signalIcon = createMemo(() => {
                                              if (formatted === "N/A" || rawValue == null) return "-";
                                              switch (evalResult().signal) {
                                                case 'good': return "✅";
                                                case 'bad': return "🔴";
                                                case 'neutral': default: return "⚠️";
                                              }
                                            });

                                            const tooltipOverlayColor = createMemo(() => {
                                              if (formatted === "N/A" || rawValue == null) return "bg-neutral-500";
                                              switch (evalResult().signal) {
                                                case 'good': return "bg-emerald-500";
                                                case 'bad': return "bg-rose-500";
                                                case 'neutral': default: return "bg-amber-500";
                                              }
                                            });

                                            const tooltipContent = (
                                              <div class="space-y-1.5 text-left">
                                                <div class="flex items-center gap-1.5 font-bold text-white text-xs border-b border-white/10 pb-1">
                                                  <span>{signalIcon()}</span>
                                                  <span>{metricDef.label} Verdict</span>
                                                </div>
                                                <p class="text-[11px] text-white/90 leading-relaxed font-outfit">
                                                  {evalResult().tooltip}
                                                </p>
                                                <div class="text-[10px] text-white/60 font-semibold pt-0.5">
                                                  {evalResult().thresholdContext}
                                                </div>
                                                <Show when={isWinner()}>
                                                  <div class="text-[10px] text-amber-300 font-bold border-t border-white/10 pt-1 flex items-center gap-1">
                                                    <span>👑</span>
                                                    <span>This is the best value in this row!</span>
                                                  </div>
                                                </Show>
                                              </div>
                                            );
                                            
                                            return (
                                              <Tooltip class="w-full block rounded-xl" position="bottom" content={tooltipContent} overlayBgClass={tooltipOverlayColor()}>
                                                <div class={`flex flex-col items-center justify-center py-1 px-2 rounded-lg border transition-all ${cellBg()}`}>
                                                  <div class="flex items-center gap-1 justify-center">
                                                    <span class="text-xs font-outfit font-black text-forest">
                                                      {formatted}
                                                    </span>
                                                    <Show when={isWinner()}>
                                                      <span class="text-[7px] bg-amber-500/10 text-amber-700 px-1 py-0.2 rounded font-black uppercase tracking-wider flex items-center gap-0.5">
                                                        👑 BEST
                                                      </span>
                                                    </Show>
                                                  </div>
                                                  
                                                  <Show when={formatted !== "N/A"}>
                                                    <span class={`text-[8px] font-bold px-1 py-0.2 rounded-full border mt-0.5 select-none ${badgeStyles()}`}>
                                                      {evalResult().badgeText}
                                                    </span>
                                                  </Show>
                                                </div>
                                              </Tooltip>
                                            );
                                          })()}
                                        </Show>
                                      </td>
                                    );
                                  }}
                                </For>
                              </tr>
                            );
                          }}
                        </For>
                      </>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};
