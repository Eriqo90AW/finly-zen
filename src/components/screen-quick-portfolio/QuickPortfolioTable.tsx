import { createSignal, createMemo, For, Show } from "solid-js";
import { formatPercent } from "../../utils/format";
import { quickPortfolioSearch, setQuickPortfolioSearch } from "../../store/portfolioStore";
import type { PortfolioAsset } from "../../types";

type SortKey = "asset" | "qty" | "avgPrice" | "fxRate" | "currentPrice" | "value" | "gain" | "allocation";

interface QuickPortfolioTableProps {
  assets: PortfolioAsset[];
  distinctAssetCount?: number;
  cashBalance: number;
  totalValue: number;
  overallPL: number;
  overallPLPercent: number;
  currencyView: "USD" | "IDR";
  isSubmitting: boolean;
  onStartAddHolding: () => void;
  onCopyJson: () => void;
  isCopied: boolean;
  onSaveQty: (ticker: string, qty: number) => Promise<void>;
  onSavePrice: (ticker: string, price: number) => Promise<void>;
  onSaveRate: (ticker: string, rate: number) => Promise<void>;
  onDeleteHolding: (ticker: string) => void;
  onSaveCash: (newCash: number) => Promise<void>;
  onCreateNewHolding: (
    ticker: string,
    qty: number,
    price: number,
    currency: string,
    conversionRate: number
  ) => Promise<void>;
  formatVal: (amount: number, isShort?: boolean) => string;
  formatCash: (amount: number, isShort?: boolean) => string;
  formatPrice: (amount: number) => string;
  getCategory: (ticker: string) => string;
  getCategoryIcon: (category: string) => string;
  getDisplayTicker: (ticker: string) => string;
  getUsdRate: () => number;
}

interface NewRowDraft {
  ticker: string;
  qty: string;
  avgPrice: string;
  currency: string;
  conversionRate: string;
}

const parseLocaleFloat = (valString: string): number => {
  const sanitized = valString.replace(/,/g, ".");
  return parseFloat(sanitized);
};

export const QuickPortfolioTable = (props: QuickPortfolioTableProps) => {
  // Hide FX rate visibility toggle (Requirement 3)
  const [hideFxRate, setHideFxRate] = createSignal<boolean>(
    (() => {
      try {
        return localStorage.getItem("finly_zen_quick_portfolio_hide_fx_rate") === "true";
      } catch (e) {
        return false;
      }
    })()
  );

  const [previousHideFxRateState, setPreviousHideFxRateState] = createSignal<boolean | null>(null);

  const toggleHideFxRate = () => {
    const next = !hideFxRate();
    setHideFxRate(next);
    setPreviousHideFxRateState(null);
    try {
      localStorage.setItem("finly_zen_quick_portfolio_hide_fx_rate", String(next));
    } catch (e) {}
  };

  // Sorting state (Requirement 4)
  const [sortBy, setSortBy] = createSignal<SortKey>(
    (() => {
      try {
        return (localStorage.getItem("finly_zen_quick_portfolio_sort_by") as SortKey) || "value";
      } catch (e) {
        return "value";
      }
    })()
  );
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">(
    (() => {
      try {
        return (localStorage.getItem("finly_zen_quick_portfolio_sort_order") as "asc" | "desc") || "desc";
      } catch (e) {
        return "desc";
      }
    })()
  );

  const handleSort = (key: SortKey) => {
    const nextOrder =
      sortBy() === key
        ? sortOrder() === "asc"
          ? "desc"
          : "asc"
        : key === "asset"
          ? "asc"
          : "desc";

    setSortBy(key);
    setSortOrder(nextOrder);

    try {
      localStorage.setItem("finly_zen_quick_portfolio_sort_by", key);
      localStorage.setItem("finly_zen_quick_portfolio_sort_order", nextOrder);
    } catch (e) {
      console.warn("localStorage sorting persistence failed:", e);
    }
  };

  // Filter Assets by Search
  const filteredAssets = createMemo(() => {
    const query = quickPortfolioSearch().toLowerCase().trim();
    if (!query) return props.assets;
    return props.assets.filter((a) =>
      a.ticker.toLowerCase().includes(query) ||
      (a.name || "").toLowerCase().includes(query)
    );
  });

  // Sort Filtered Assets reactively
  const sortedAssets = createMemo(() => {
    const list = [...filteredAssets()];
    const key = sortBy();
    const order = sortOrder();

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === "asset") {
        valA = (a.name || a.ticker).toLowerCase();
        valB = (b.name || b.ticker).toLowerCase();
      } else if (key === "qty") {
        valA = a.totalShares;
        valB = b.totalShares;
      } else if (key === "avgPrice") {
        valA = a.averagePrice;
        valB = b.averagePrice;
      } else if (key === "fxRate") {
        valA = a.conversionRate ?? 1;
        valB = b.conversionRate ?? 1;
      } else if (key === "currentPrice") {
        valA = a.currentPrice;
        valB = b.currentPrice;
      } else if (key === "value") {
        valA = a.currentValue;
        valB = b.currentValue;
      } else if (key === "gain") {
        valA = a.totalGainLoss;
        valB = b.totalGainLoss;
      } else if (key === "allocation") {
        valA = a.currentValue;
        valB = b.currentValue;
      }

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  });

  // Edit Cell State
  const [editingCell, setEditingCell] = createSignal<{
    ticker: string;
    field: "qty" | "avgPrice" | "conversionRate";
  } | null>(null);
  const [isCashEditing, setIsCashEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal("");

  let qtyInputRef: HTMLInputElement | undefined;
  let priceInputRef: HTMLInputElement | undefined;
  let rateInputRef: HTMLInputElement | undefined;
  let cashInputRef: HTMLInputElement | undefined;

  // New Row Draft State
  const [newRowDraft, setNewRowDraft] = createSignal<NewRowDraft | null>(null);
  let newRowTickerRef: HTMLInputElement | undefined;
  let newRowQtyRef: HTMLInputElement | undefined;
  let newRowPriceRef: HTMLInputElement | undefined;
  let newRowCurrencyRef: HTMLSelectElement | undefined;
  let newRowRateRef: HTMLInputElement | undefined;

  const startEdit = (
    ticker: string,
    field: "qty" | "avgPrice" | "conversionRate",
    currentVal: number
  ) => {
    setEditingCell({ ticker, field });

    let displayVal = currentVal;
    if (field === "avgPrice") {
      const asset = props.assets.find((a) => a.ticker === ticker);
      const assetCurrency = asset?.currency || "USD";
      if (assetCurrency === "USD" && props.currencyView === "IDR") {
        displayVal = currentVal * props.getUsdRate();
      } else if (assetCurrency === "IDR" && props.currencyView === "USD") {
        displayVal = currentVal / props.getUsdRate();
      }
    }

    setEditValue(parseFloat(displayVal.toFixed(8)).toString());
    setTimeout(() => {
      if (field === "qty") {
        qtyInputRef?.focus();
        qtyInputRef?.select();
      } else if (field === "conversionRate") {
        rateInputRef?.focus();
        rateInputRef?.select();
      } else {
        priceInputRef?.focus();
        priceInputRef?.select();
      }
    }, 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const saveEdit = async (
    ticker: string,
    field: "qty" | "avgPrice" | "conversionRate"
  ) => {
    let val = parseLocaleFloat(editValue());
    if (isNaN(val) || val < 0) {
      cancelEdit();
      return;
    }
    if (field === "conversionRate" && val <= 0) {
      cancelEdit();
      return;
    }

    if (field === "avgPrice") {
      const asset = props.assets.find((a) => a.ticker === ticker);
      const assetCurrency = asset?.currency || "USD";
      if (assetCurrency === "USD" && props.currencyView === "IDR") {
        val = val / props.getUsdRate();
      } else if (assetCurrency === "IDR" && props.currencyView === "USD") {
        val = val * props.getUsdRate();
      }
    }

    const currentEditing = editingCell();
    setEditingCell(null);
    if (currentEditing) {
      if (field === "qty") {
        await props.onSaveQty(ticker, val);
      } else if (field === "avgPrice") {
        await props.onSavePrice(ticker, val);
      } else if (field === "conversionRate") {
        await props.onSaveRate(ticker, val);
      }
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent,
    ticker: string,
    field: "qty" | "avgPrice" | "conversionRate"
  ) => {
    if (e.key === "Enter") {
      saveEdit(ticker, field);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const saveCashEdit = async () => {
    let val = parseLocaleFloat(editValue());
    setIsCashEditing(false);
    if (!isNaN(val)) {
      if (props.currencyView === "USD") {
        val = val * props.getUsdRate();
      }
      await props.onSaveCash(val);
    }
  };

  const handleCashKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      saveCashEdit();
    } else if (e.key === "Escape") {
      setIsCashEditing(false);
    }
  };

  const openNewRowDraft = () => {
    if (props.isSubmitting) return;

    setPreviousHideFxRateState(hideFxRate());
    setHideFxRate(false);

    setNewRowDraft({
      ticker: "",
      qty: "",
      avgPrice: "",
      currency: "USD",
      conversionRate: props.getUsdRate().toFixed(2),
    });
    setTimeout(() => {
      newRowTickerRef?.focus();
    }, 50);
  };

  const cancelNewRowDraft = () => {
    if (props.isSubmitting) return;
    setNewRowDraft(null);

    const prev = previousHideFxRateState();
    if (prev !== null) {
      setHideFxRate(prev);
      setPreviousHideFxRateState(null);
    }
  };

  const commitNewRowDraft = async () => {
    const draft = newRowDraft();
    if (!draft) return;

    const symbol = draft.ticker.trim().toUpperCase();
    const qty = parseLocaleFloat(draft.qty);
    const price = parseLocaleFloat(draft.avgPrice);
    const currency = draft.currency;
    const conversionRate = parseLocaleFloat(draft.conversionRate);

    if (!symbol) {
      newRowTickerRef?.focus();
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      newRowQtyRef?.focus();
      return;
    }
    if (isNaN(price) || price <= 0) {
      newRowPriceRef?.focus();
      return;
    }
    if (isNaN(conversionRate) || conversionRate <= 0) {
      newRowRateRef?.focus();
      return;
    }

    await props.onCreateNewHolding(symbol, qty, price, currency, conversionRate);
    setNewRowDraft(null);

    const prev = previousHideFxRateState();
    if (prev !== null) {
      setHideFxRate(prev);
      setPreviousHideFxRateState(null);
    }
  };

  const handleNewRowDraftKeyDown = (
    e: KeyboardEvent,
    field: "ticker" | "qty" | "avgPrice" | "currency" | "conversionRate"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "ticker") {
        newRowQtyRef?.focus();
        newRowQtyRef?.select();
      } else if (field === "qty") {
        newRowPriceRef?.focus();
        newRowPriceRef?.select();
      } else if (field === "avgPrice") {
        if (!hideFxRate()) {
          newRowRateRef?.focus();
          newRowRateRef?.select();
        } else {
          commitNewRowDraft();
        }
      } else if (field === "conversionRate") {
        commitNewRowDraft();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelNewRowDraft();
    }
  };

  return (
    <section class="bg-white rounded-2xl border border-forest/10 shadow-sm flex flex-col overflow-hidden">
      {/* Table Header Control Bar */}
      <div class="p-4 border-b border-forest/5 flex justify-between items-center bg-white/60 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <button 
            onClick={props.onStartAddHolding}
            class="bg-forest text-white font-outfit text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 hover:bg-forest/90 transition-all shadow-sm hover:shadow cursor-pointer border-0 outline-none select-none"
          >
            <span class="material-icons !text-sm">add</span>
            Add Holding
          </button>
          
          <div class="relative w-64">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-earth !text-sm">search</span>
            <input 
              type="text" 
              value={quickPortfolioSearch()}
              onInput={(e) => setQuickPortfolioSearch(e.currentTarget.value)}
              placeholder="Filter holdings..." 
              class="w-full bg-sage/30 border border-transparent rounded-full py-1.5 pl-9 pr-4 font-outfit text-xs text-near-black placeholder:text-earth/60 focus:bg-white focus:border-forest/30 transition-all focus:outline-none"
            />
          </div>

          <Show when={props.distinctAssetCount !== undefined}>
            <span class="px-2.5 py-1 rounded-full bg-forest/10 text-forest font-outfit text-[11px] font-bold flex items-center gap-1 border border-forest/10 select-none">
              <span class="material-icons !text-xs">pie_chart</span>
              {props.distinctAssetCount} Assets Invested
            </span>
          </Show>
        </div>

        <div class="flex items-center gap-2">
          {/* Hide FX rate visibility toggle (Requirement 3) */}
          <button 
            onClick={toggleHideFxRate}
            class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/20 px-3.5 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none bg-white"
          >
            <span class="material-icons !text-sm">
              {hideFxRate() ? "visibility_off" : "visibility"}
            </span>
            {hideFxRate() ? "Show FX Rate" : "Hide FX Rate"}
          </button>

          <button 
            onClick={props.onCopyJson}
            class="text-earth hover:text-forest border border-forest/10 hover:bg-sage/20 px-3.5 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white"
            classList={{ "text-forest border-forest/30 bg-sage/10": props.isCopied }}
          >
            <span class="material-icons !text-sm">
              {props.isCopied ? "check" : "content_copy"}
            </span>
            {props.isCopied ? "Copied!" : "Copy JSON"}
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse whitespace-nowrap">
          <thead class="bg-sage/20 border-b border-forest/5 text-[11px] text-earth">
            <tr class="group/header">
              <th class="px-6 py-3 font-semibold uppercase tracking-wider w-1/3">
                <button 
                  onClick={() => handleSort("asset")} 
                  class="flex items-center gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase text-left bg-transparent border-0 p-0 outline-none select-none"
                >
                  Asset
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "asset", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "asset" 
                    }}
                  >
                    {sortBy() === "asset" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </th>
              
              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[110px]">
                <button 
                  onClick={() => handleSort("qty")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "qty", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "qty" 
                    }}
                  >
                    {sortBy() === "qty" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Quantity
                </button>
              </th>

              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">
                <button 
                  onClick={() => handleSort("avgPrice")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "avgPrice", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "avgPrice" 
                    }}
                  >
                    {sortBy() === "avgPrice" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Avg Price
                </button>
              </th>

              <Show when={!hideFxRate()}>
                <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[150px]">
                  <button 
                    onClick={() => handleSort("fxRate")} 
                    class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                  >
                    <span class="material-icons !text-[14px] transition-all duration-200"
                      classList={{ 
                        "text-forest font-bold": sortBy() === "fxRate", 
                        "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "fxRate" 
                      }}
                    >
                      {sortBy() === "fxRate" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                    </span>
                    FX Rate
                  </button>
                </th>
              </Show>

              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">
                <button 
                  onClick={() => handleSort("currentPrice")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "currentPrice", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "currentPrice" 
                    }}
                  >
                    {sortBy() === "currentPrice" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Current Price
                </button>
              </th>

              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">
                <button 
                  onClick={() => handleSort("value")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "value", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "value" 
                    }}
                  >
                    {sortBy() === "value" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Total Value
                </button>
              </th>

              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-1/6">
                <button 
                  onClick={() => handleSort("gain")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "gain", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "gain" 
                    }}
                  >
                    {sortBy() === "gain" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Gain
                </button>
              </th>

              <th class="px-6 py-3 font-semibold uppercase tracking-wider text-right w-[100px]">
                <button 
                  onClick={() => handleSort("allocation")} 
                  class="flex items-center justify-end gap-1 hover:text-forest transition-colors cursor-pointer font-semibold uppercase w-full bg-transparent border-0 p-0 outline-none select-none"
                >
                  <span class="material-icons !text-[14px] transition-all duration-200"
                    classList={{ 
                      "text-forest font-bold": sortBy() === "allocation", 
                      "text-earth/20 opacity-0 group-hover/header:opacity-100": sortBy() !== "allocation" 
                    }}
                  >
                    {sortBy() === "allocation" && sortOrder() === "asc" ? "expand_less" : "expand_more"}
                  </span>
                  Allocation
                </button>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-forest/5 text-xs bg-white">
            <For each={sortedAssets()}>
              {(asset) => {
                const cat = props.getCategory(asset.ticker);
                const isQtyEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "qty";
                const isPriceEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "avgPrice";
                const isRateEditing = () => editingCell()?.ticker === asset.ticker && editingCell()?.field === "conversionRate";

                return (
                  <tr class="hover:bg-sage/10 transition-colors group">
                    {/* Asset Column */}
                    <td class="px-6 py-4 border-r border-transparent group-hover:border-forest/5 transition-colors overflow-hidden max-w-[320px]">
                      <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-lg bg-sage flex items-center justify-center text-forest overflow-hidden shrink-0">
                          <Show 
                            when={asset.logoUrl} 
                            fallback={<span class="material-icons !text-sm">{props.getCategoryIcon(cat)}</span>}
                          >
                            <img src={asset.logoUrl} alt={asset.ticker} class="w-full h-full object-cover animate-fade-in" />
                          </Show>
                        </div>
                        <div class="min-w-0">
                          <div class="font-bold text-near-black truncate">{asset.name || asset.ticker}</div>
                          <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-[10px] text-earth uppercase font-semibold">{props.getDisplayTicker(asset.ticker)}</span>
                            <span class="px-1.5 py-0.25 rounded bg-sage/50 text-forest text-[8px] font-bold uppercase tracking-wider">
                              {cat}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantity Column (Editable) */}
                    <Show 
                      when={isQtyEditing()} 
                      fallback={
                        <td 
                          onClick={() => startEdit(asset.ticker, "qty", asset.totalShares)}
                          class="px-6 py-4 text-right font-mono text-near-black font-semibold hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                        >
                          {parseFloat(asset.totalShares.toFixed(8)).toString()}
                        </td>
                      }
                    >
                      <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                        <div class="flex items-center justify-end">
                          <input
                            ref={qtyInputRef}
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            value={editValue()}
                            onInput={(e) => setEditValue(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
                            onBlur={() => saveEdit(asset.ticker, "qty")}
                            onKeyDown={(e) => handleKeyDown(e, asset.ticker, "qty")}
                            class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                          />
                        </div>
                        <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                      </td>
                    </Show>

                    {/* Avg Buy Price Column (Editable) */}
                    <Show
                      when={isPriceEditing()}
                      fallback={
                        <td
                          onClick={() => startEdit(asset.ticker, "avgPrice", asset.averagePrice)}
                          class="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                        >
                          {props.formatPrice(asset.averagePrice)}
                        </td>
                      }
                    >
                      <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                        <div class="flex items-center justify-end">
                          <input
                            ref={priceInputRef}
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            value={editValue()}
                            onInput={(e) => setEditValue(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
                            onBlur={() => saveEdit(asset.ticker, "avgPrice")}
                            onKeyDown={(e) => handleKeyDown(e, asset.ticker, "avgPrice")}
                            class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                          />
                        </div>
                        <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                      </td>
                    </Show>

                    {/* Conversion Rate & Currency Column (Editable) */}
                    <Show when={!hideFxRate()}>
                      <Show
                        when={isRateEditing()}
                        fallback={
                          <td
                            onClick={() => startEdit(asset.ticker, "conversionRate", asset.conversionRate ?? 1)}
                            class="px-6 py-4 text-right font-mono text-earth hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                          >
                            <span class="font-bold">{(asset.conversionRate ?? 1).toFixed(2)}</span>
                            <span class="text-[9px] text-earth/50 font-bold ml-1.5 uppercase tracking-wider">{asset.currency || "USD"}</span>
                          </td>
                        }
                      >
                        <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner">
                          <div class="flex items-center justify-end gap-1.5">
                            <input
                              ref={rateInputRef}
                              type="text"
                              inputmode="decimal"
                              autocomplete="off"
                              value={editValue()}
                              onInput={(e) => setEditValue(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
                              onBlur={() => saveEdit(asset.ticker, "conversionRate")}
                              onKeyDown={(e) => handleKeyDown(e, asset.ticker, "conversionRate")}
                              class="w-16 bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                            />
                            <span class="text-[9px] text-earth/50 font-bold uppercase tracking-wider shrink-0">{asset.currency || "USD"}</span>
                          </div>
                          <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                        </td>
                      </Show>
                    </Show>

                    {/* Current Price Column */}
                    <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
                      {props.formatPrice(asset.currentPrice)}
                    </td>

                    {/* Total Value Column */}
                    <td class="px-6 py-4 text-right font-mono text-near-black font-bold border-r border-transparent group-hover:border-forest/5 transition-colors">
                      {props.formatVal(asset.currentValue)}
                    </td>

                    {/* P/L ($/%) Column */}
                    <td class="px-6 py-4 text-right border-r border-transparent group-hover:border-forest/5 transition-colors">
                      <div class="flex flex-col items-end">
                        <span class="font-mono font-bold" classList={{ "text-forest": asset.totalGainLoss >= 0, "text-red-600": asset.totalGainLoss < 0 }}>
                          {asset.totalGainLoss >= 0 ? "+" : ""}{props.formatVal(asset.totalGainLoss)}
                        </span>
                        <span class="text-[10px] font-mono font-bold" classList={{ "text-forest": asset.totalGainLoss >= 0, "text-red-600": asset.totalGainLoss < 0 }}>
                          {asset.averagePrice > 0 ? formatPercent(asset.totalGainLoss / (asset.totalShares * asset.averagePrice)) : "0.00%"}
                        </span>
                      </div>
                    </td>

                    {/* Allocation Column */}
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <div class="flex-1 max-w-[80px]">
                          {(() => {
                            const alloc = (asset.currentValue / (props.totalValue || 1)) * 100;
                            return (
                              <>
                                <div class="w-full bg-sage/60 rounded-full h-1.5 mb-1 overflow-hidden border border-forest/30">
                                  <div class="bg-forest h-1.5 rounded-full" style={{ width: `${alloc}%` }} />
                                </div>
                                <div class="text-right text-[10px] text-earth font-mono">{alloc.toFixed(1)}%</div>
                              </>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => props.onDeleteHolding(asset.ticker)}
                          disabled={props.isSubmitting}
                          class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/40 hover:text-red-500 cursor-pointer disabled:cursor-not-allowed shrink-0 border-0 bg-transparent"
                          title="Remove holding"
                        >
                          <span class="material-icons !text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }}
            </For>

            {/* New Row Template */}
            <Show
              when={newRowDraft()}
              fallback={
                <tr class="hover:bg-sage/10 transition-colors group opacity-75 hover:opacity-100">
                  <td
                    colspan={hideFxRate() ? "9" : "10"}
                    class="px-6 py-3 cursor-pointer"
                    classList={{ "cursor-not-allowed": props.isSubmitting }}
                    onClick={() => openNewRowDraft()}
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-lg bg-sage/50 flex items-center justify-center text-forest/40 shrink-0">
                        <span class="material-icons !text-sm">add</span>
                      </div>
                      <span class="font-bold text-earth/50 italic hover:text-forest text-[11px]">
                        + Add Asset (fill ticker, quantity, buy price, currency & conversion rate)
                      </span>
                    </div>
                  </td>
                </tr>
              }
            >
              {(draft) => {
                const update = (patch: Partial<NewRowDraft>) =>
                  setNewRowDraft({ ...draft(), ...patch });
                return (
                  <tr class="bg-sage/15 border-y-2 border-dashed border-forest/30">
                    {/* Asset / Ticker */}
                    <td class="px-4 py-2 border-r border-forest/5 max-w-[320px]">
                      <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center shrink-0">
                          <span class="material-icons !text-sm">
                            {draft().ticker ? props.getCategoryIcon(props.getCategory(draft().ticker)) : "edit"}
                          </span>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5">
                            <input
                              ref={newRowTickerRef}
                              type="text"
                              placeholder="TICKER"
                              autocomplete="off"
                              autocapitalize="characters"
                              spellcheck={false}
                              disabled={props.isSubmitting}
                              value={draft().ticker}
                              onInput={(e) => update({ ticker: e.currentTarget.value.toUpperCase() })}
                              onKeyDown={(e) => handleNewRowDraftKeyDown(e, "ticker")}
                              class="bg-white border border-forest/30 rounded px-2 py-1 font-bold text-near-black text-xs w-20 uppercase focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                            />
                            <Show when={draft().ticker}>
                              <span class="px-1.5 py-0.5 rounded bg-sage/50 text-forest text-[8px] font-bold uppercase tracking-wider shrink-0">
                                {props.getCategory(draft().ticker)}
                              </span>
                            </Show>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td class="px-4 py-2 text-right border-r border-forest/5">
                      <input
                        ref={newRowQtyRef}
                        type="text"
                        inputmode="decimal"
                        placeholder="0.00"
                        autocomplete="off"
                        disabled={props.isSubmitting}
                        value={draft().qty}
                        onInput={(e) => update({ qty: e.currentTarget.value.replace(/[^0-9.,]/g, "") })}
                        onKeyDown={(e) => handleNewRowDraftKeyDown(e, "qty")}
                        class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                      />
                    </td>

                    {/* Avg Buy Price */}
                    <td class="px-4 py-2 text-right border-r border-forest/5">
                      <input
                        ref={newRowPriceRef}
                        type="text"
                        inputmode="decimal"
                        placeholder="0.00"
                        autocomplete="off"
                        disabled={props.isSubmitting}
                        value={draft().avgPrice}
                        onInput={(e) => update({ avgPrice: e.currentTarget.value.replace(/[^0-9.,]/g, "") })}
                        onKeyDown={(e) => handleNewRowDraftKeyDown(e, "avgPrice")}
                        class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                      />
                    </td>

                    {/* Currency & Conversion Rate */}
                    <Show when={!hideFxRate()}>
                      <td class="px-4 py-2 text-right border-r border-forest/5">
                        <div class="flex items-center justify-end gap-1.5">
                          <select
                            ref={newRowCurrencyRef}
                            disabled={props.isSubmitting}
                            value={draft().currency}
                            onChange={(e) => {
                              const c = e.currentTarget.value;
                              update({
                                currency: c,
                                conversionRate: c === "IDR" ? "1" : props.getUsdRate().toFixed(2),
                              });
                            }}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "currency")}
                            class="bg-white border border-forest/30 rounded px-1 py-0.5 font-mono text-near-black text-xs w-12 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                          >
                            <option value="USD">USD</option>
                            <option value="IDR">IDR</option>
                          </select>
                          <input
                            ref={newRowRateRef}
                            type="text"
                            inputmode="decimal"
                            placeholder={draft().currency === "IDR" ? "1" : props.getUsdRate().toFixed(2)}
                            autocomplete="off"
                            disabled={props.isSubmitting || draft().currency === "IDR"}
                            value={draft().conversionRate}
                            onInput={(e) => update({ conversionRate: e.currentTarget.value.replace(/[^0-9.,]/g, "") })}
                            onKeyDown={(e) => handleNewRowDraftKeyDown(e, "conversionRate")}
                            class="bg-white border border-forest/30 rounded px-2 py-1 text-right font-mono text-near-black text-xs w-20 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:bg-sage/30 disabled:text-earth/60"
                          />
                        </div>
                      </td>
                    </Show>

                    {/* Placeholders */}
                    <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
                    <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>
                    <td class="px-4 py-2 text-right font-mono text-earth/30 border-r border-forest/5">—</td>

                    {/* Save / Cancel */}
                    <td class="px-4 py-2 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <Show
                          when={!props.isSubmitting}
                          fallback={
                            <span class="flex items-center gap-1 text-[9px] text-forest font-outfit font-bold uppercase tracking-wider">
                              <span class="w-3 h-3 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                              Saving…
                            </span>
                          }
                        >
                          <button
                            type="button"
                            onClick={commitNewRowDraft}
                            class="bg-forest text-white rounded-lg p-1.5 hover:bg-forest/90 transition-colors shadow-sm cursor-pointer border-0"
                            title="Save holding (Enter)"
                          >
                            <span class="material-icons !text-sm leading-none">check</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelNewRowDraft}
                            class="bg-earth/15 text-earth rounded-lg p-1.5 hover:bg-earth/25 transition-colors cursor-pointer border-0"
                            title="Cancel (Esc)"
                          >
                            <span class="material-icons !text-sm leading-none">close</span>
                          </button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                );
              }}
            </Show>
          </tbody>

          {/* Total Row */}
          <tfoot class="bg-sage/10 border-t-2 border-forest/10 font-outfit text-xs font-bold text-near-black">
            <tr>
              <td class="px-6 py-4">Cash Balance</td>
              <Show
                when={isCashEditing()}
                fallback={
                  <td
                    onClick={() => {
                      setIsCashEditing(true);
                      const val = props.currencyView === "IDR"
                        ? props.cashBalance
                        : props.cashBalance / props.getUsdRate();
                      setEditValue(val.toFixed(2));
                      setTimeout(() => {
                        cashInputRef?.focus();
                        cashInputRef?.select();
                      }, 50);
                    }}
                    class="px-6 py-4 text-right font-mono hover:bg-forest/5 cursor-pointer border-r border-transparent group-hover:border-forest/5 transition-colors"
                    colspan={hideFxRate() ? 5 : 6}
                  >
                    {props.formatCash(props.cashBalance)}
                  </td>
                }
              >
                <td class="px-4 py-3 border-2 border-forest bg-sage/20 relative shadow-inner" colspan={hideFxRate() ? 4 : 5}>
                  <div class="flex items-center justify-end">
                    <input
                      ref={cashInputRef}
                      type="text"
                      inputmode="decimal"
                      autocomplete="off"
                      value={editValue()}
                      onInput={(e) => setEditValue(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
                      onBlur={saveCashEdit}
                      onKeyDown={handleCashKeyDown}
                      class="w-full bg-transparent border-none text-right font-mono text-near-black font-bold focus:ring-0 focus:outline-none p-0"
                    />
                  </div>
                  <div class="absolute -top-1.5 -right-1.5 bg-forest text-white text-[8px] font-bold px-1 rounded shadow-sm z-10">Edit</div>
                </td>
              </Show>
              <td class="px-6 py-4 text-right font-mono" colspan="2">
                {((props.cashBalance / (props.totalValue || 1)) * 100).toFixed(1)}% of total
              </td>
            </tr>
            <tr class="bg-sage/20 border-t border-forest/10 text-sm">
              <td class="px-6 py-4 font-bold" colspan={hideFxRate() ? 4 : 5}>Total Holdings Value</td>
              <td class="px-6 py-4 text-right font-mono font-extrabold">{props.formatVal(props.totalValue)}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="font-mono font-extrabold" classList={{ "text-forest": props.overallPL >= 0, "text-red-600": props.overallPL < 0 }}>
                    {props.overallPL >= 0 ? "+" : ""}{props.formatVal(props.overallPL)}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-right font-mono text-xs">
                {formatPercent(props.overallPLPercent)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="h-2 bg-transparent" />
    </section>
  );
};
