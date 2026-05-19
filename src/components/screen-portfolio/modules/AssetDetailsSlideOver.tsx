import { Show, For, createSignal, createEffect } from "solid-js";
import CloseIcon from "@suid/icons-material/Close";
import { formatPortfolioValue } from "../../../utils/format";
import { portfolioState } from "../../../store/portfolioStore";
import type { PortfolioAsset, PortfolioTransaction } from "../../../types";
import { useNavigate } from "@solidjs/router";
import { getAssetThesis, updateAssetThesis } from "../../../data/portfolioData";
import { getAssetColor } from "../../../utils/colors";

interface AssetDetailsSlideOverProps {
  asset: PortfolioAsset | null;
  transactions: PortfolioTransaction[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteAsset: (assetId: string) => void;
  portfolioTotalValue: number;
  portfolioId: string;
}

export const AssetDetailsSlideOver = (props: AssetDetailsSlideOverProps) => {
  const navigate = useNavigate();
  const currency = () => portfolioState.currencyView;

  // Investment Thesis Notes State
  const [thesisNotes, setThesisNotes] = createSignal("");
  const [notesLastUpdated, setNotesLastUpdated] = createSignal<string | null>(null);
  const [loadingNotes, setLoadingNotes] = createSignal(false);
  const [savingNotes, setSavingNotes] = createSignal(false);
  const [activeTxId, setActiveTxId] = createSignal<string | null>(null);
  const [saveStatus, setSaveStatus] = createSignal<string | null>(null);
  const [notesExpanded, setNotesExpanded] = createSignal(false);
  const [exposureExpanded, setExposureExpanded] = createSignal(true);
  const [historyExpanded, setHistoryExpanded] = createSignal(true);

  // Fetch the thesis notes when the asset is opened/changed
  createEffect(() => {
    if (props.isOpen && props.asset && props.portfolioId) {
      setNotesExpanded(false);
      setExposureExpanded(true);
      setHistoryExpanded(true);
      setLoadingNotes(true);
      setSaveStatus(null);
      getAssetThesis(props.portfolioId, props.asset.ticker)
        .then((data) => {
          if (data) {
            setThesisNotes(data.notes || "");
            setNotesLastUpdated(data.updated_at);
            setActiveTxId(data.id);
          } else {
            setThesisNotes("");
            setNotesLastUpdated(null);
            setActiveTxId(null);
          }
        })
        .catch((err) => {
          console.error("Failed to load thesis notes:", err);
        })
        .finally(() => {
          setLoadingNotes(false);
        });
    }
  });

  const handleSaveNotes = async () => {
    const txId = activeTxId();
    if (!txId) return;
    setSavingNotes(true);
    setSaveStatus(null);
    try {
      await updateAssetThesis(txId, thesisNotes());
      setNotesLastUpdated(new Date().toISOString());
      setSaveStatus("Saved ✓");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Failed to save thesis notes:", err);
      setSaveStatus("Error!");
    } finally {
      setSavingNotes(false);
    }
  };

  // Allocation Exposure calculations
  const actualAllocation = () => props.asset ? props.asset.actualAllocation : 0;
  const targetAllocation = () => props.asset ? props.asset.targetAllocation : 0;
  const deviation = () => actualAllocation() - targetAllocation();

  const differenceToTarget = () => {
    if (!props.asset) return 0;
    const targetValue = props.portfolioTotalValue * (targetAllocation() / 100);
    return targetValue - props.asset.currentValue;
  };

  const differenceToTargetInShares = () => {
    if (!props.asset || props.asset.currentPrice === 0) return 0;
    return differenceToTarget() / props.asset.currentPrice;
  };

  const exposureStatus = () => {
    const dev = deviation();
    if (targetAllocation() === 0) return "NO_TARGET";
    if (dev > 1) return "OVER";
    if (dev < -1) return "UNDER";
    return "TARGET";
  };

  const sortedTransactions = () => {
    return [...props.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex justify-end bg-forest/40 transition-opacity duration-300"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div
          class="w-full max-w-md bg-white h-screen shadow-2xl transition-transform duration-500 flex flex-col translate-x-0 slide-over-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <Show when={props.asset}>
            {(asset) => (
              <>
                {/* Header */}
                <div class="p-6 border-b border-forest/10 flex items-center justify-between bg-sage/5">
                  <div class="flex items-center gap-3">
                    <Show
                      when={asset().logoUrl}
                      fallback={
                        <div
                          class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ "background-color": getAssetColor(asset().ticker) }}
                        >
                          {asset().ticker.charAt(0)}
                        </div>
                      }
                    >
                      {(logoUrl) => {
                        const [hasError, setHasError] = createSignal(false);
                        
                        // Reset hasError if the ticker changes
                        createEffect(() => {
                          asset().ticker;
                          setHasError(false);
                        });

                        return (
                          <div
                            class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden"
                            style={{
                              "background-color": hasError()
                                ? getAssetColor(asset().ticker)
                                : "#ffffff",
                            }}
                          >
                            <Show
                              when={!hasError()}
                              fallback={
                                <span>{asset().ticker.charAt(0)}</span>
                              }
                            >
                              <img
                                src={logoUrl()}
                                alt={asset().ticker}
                                class="w-full h-full object-contain p-1 bg-white"
                                onError={() => setHasError(true)}
                              />
                            </Show>
                          </div>
                        );
                      }}
                    </Show>
                    <div>
                      <h3 
                        onClick={() => {
                          navigate(`/stock/${asset().ticker}`);
                          props.onClose();
                        }}
                        class="text-xl font-cormorant text-forest font-bold leading-tight hover:underline cursor-pointer"
                      >
                        {asset().ticker}
                      </h3>
                      <p class="text-[10px] text-earth uppercase tracking-widest">
                        {asset().name}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onClick={() => asset() && props.onDeleteAsset(asset().id)}
                      class="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full cursor-pointer"
                      title="Delete Asset"
                    >
                      <span class="material-icons">delete_outline</span>
                    </button>
                    <button
                      onClick={props.onClose}
                      class="text-earth hover:text-forest transition-colors p-2 hover:bg-forest/5 rounded-full cursor-pointer"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div class="flex-1 overflow-y-auto">
                  {/* Asset Summary */}
                  <div class="p-6 grid grid-cols-2 gap-4 border-b border-forest/5 bg-sage/2">
                    <div class="p-4 bg-sage/10 rounded-2xl">
                      <p class="text-[10px] uppercase tracking-widest text-earth mb-1">
                        Total Holding
                      </p>
                      <p class="text-lg font-outfit font-bold text-forest">
                        {formatPortfolioValue(asset().currentValue, currency())}
                      </p>
                      <p class="text-[10px] text-earth">
                        {asset().totalShares.toFixed(4)} shares
                      </p>
                    </div>
                    <div class="p-4 bg-sage/10 rounded-2xl">
                      <p class="text-[10px] uppercase tracking-widest text-earth mb-1">
                        Total Gain/Loss
                      </p>
                      <p
                        class={`text-lg font-outfit font-bold ${asset().totalGainLoss >= 0 ? "text-spring" : "text-red-500"}`}
                      >
                        {asset().totalGainLoss >= 0 ? "+" : ""}
                        {formatPortfolioValue(asset().totalGainLoss, currency())}
                      </p>
                      <p class="text-[10px] text-earth">
                        Avg.{" "}
                        {formatPortfolioValue(
                          asset().averagePrice,
                          currency(),
                          true,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Allocation Exposure Card */}
                  <div class="p-6 border-b border-forest/5">
                    <div
                      onClick={() => setExposureExpanded(!exposureExpanded())}
                      class="flex items-center justify-between cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
                    >
                      <div class="flex items-center gap-1.5">
                        <span class="material-icons !text-[16px] text-earth">track_changes</span>
                        <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
                          Allocation Target Exposure
                        </h4>
                      </div>
                      <span class="material-icons text-earth transition-transform duration-300 transform" style={{ transform: exposureExpanded() ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </div>

                    {/* Collapsed visual summary */}
                    <Show when={!exposureExpanded()}>
                      <div class="flex items-center gap-2 mt-3 pl-5 text-[11px] font-outfit font-medium text-earth/60">
                        <span>Actual: {actualAllocation().toFixed(1)}%</span>
                        <span>•</span>
                        <span>Target: {targetAllocation().toFixed(1)}%</span>
                        <Show when={targetAllocation() > 0}>
                          <span>•</span>
                          <span class={
                            exposureStatus() === "OVER"
                              ? "text-red-600 font-bold"
                              : exposureStatus() === "UNDER"
                                ? "text-amber-600 font-bold"
                                : "text-emerald-600 font-bold"
                          }>
                            {deviation() >= 0 ? "+" : ""}{deviation().toFixed(1)}% dev
                          </span>
                        </Show>
                      </div>
                    </Show>

                    {/* Expandable Content wrapper */}
                    <div
                      class={`grid transition-all duration-300 ease-in-out ${
                        exposureExpanded()
                          ? "grid-rows-[1fr] opacity-100 mt-4"
                          : "grid-rows-[0fr] opacity-0 overflow-hidden"
                      }`}
                    >
                      <div class="overflow-hidden">
                        <Show
                          when={exposureStatus() !== "NO_TARGET"}
                          fallback={
                            <div class="p-4 rounded-2xl border border-forest/10 bg-sage/5 text-center">
                              <p class="text-xs text-earth italic">
                                No target allocation set for this asset.
                              </p>
                              <p class="text-[10px] text-earth/60 mt-1 uppercase tracking-wider font-semibold">
                                Actual: {actualAllocation().toFixed(1)}%
                              </p>
                            </div>
                          }
                        >
                          <div
                            class={`p-4 rounded-2xl border ${
                              exposureStatus() === "OVER"
                                ? "bg-red-50 border-red-100/50"
                                : exposureStatus() === "UNDER"
                                  ? "bg-amber-50/70 border-amber-100/60"
                                  : "bg-emerald-50 border-emerald-100/50"
                            }`}
                          >
                            <div class="flex justify-between items-center mb-2">
                              <span
                                class={`text-xs font-outfit font-bold uppercase tracking-wider ${
                                  exposureStatus() === "OVER"
                                    ? "text-red-700"
                                    : exposureStatus() === "UNDER"
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                }`}
                              >
                                {exposureStatus() === "OVER"
                                  ? "Overexposed"
                                  : exposureStatus() === "UNDER"
                                    ? "Underexposed"
                                    : "On Target"}
                              </span>
                              <span
                                class={`text-xs font-outfit font-bold ${
                                  exposureStatus() === "OVER"
                                    ? "text-red-700"
                                    : exposureStatus() === "UNDER"
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                }`}
                              >
                                {deviation() >= 0 ? "+" : ""}
                                {deviation().toFixed(1)}% deviation
                              </span>
                            </div>

                            {/* Progress Bar Visualizer */}
                            <div class="w-full bg-forest/5 h-2 rounded-full overflow-hidden mb-3 flex relative">
                              <div
                                class={`h-full rounded-full transition-all duration-500 ${
                                  exposureStatus() === "OVER"
                                    ? "bg-red-500"
                                    : exposureStatus() === "UNDER"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min((actualAllocation() / Math.max(targetAllocation(), actualAllocation())) * 100, 100)}%` }}
                              />
                              {/* Dotted target marker if actual is higher */}
                              <Show when={actualAllocation() > targetAllocation()}>
                                <div
                                  class="absolute top-0 bottom-0 w-0.5 bg-white opacity-80"
                                  style={{ left: `${(targetAllocation() / actualAllocation()) * 100}%` }}
                                  title={`Target: ${targetAllocation().toFixed(1)}%`}
                                />
                              </Show>
                            </div>

                            <div class="flex justify-between text-[10px] text-earth/70 font-outfit font-medium mb-3">
                              <span>Actual: {actualAllocation().toFixed(1)}%</span>
                              <span>Target: {targetAllocation().toFixed(1)}%</span>
                            </div>

                            <p class="text-xs text-forest/90 font-outfit font-medium leading-relaxed">
                              <Show
                                when={differenceToTarget() > 0}
                                fallback={
                                  <span>
                                    Sell{" "}
                                    <span class="font-bold text-red-600">
                                      {formatPortfolioValue(Math.abs(differenceToTarget()), currency())}
                                    </span>{" "}
                                    <span class="text-[11px] text-red-500/85">
                                      ({Math.abs(differenceToTargetInShares()).toFixed(4)} shares)
                                    </span>{" "}
                                    worth of shares to return to target.
                                  </span>
                                }
                              >
                                Buy{" "}
                                <span class="font-bold text-green-600">
                                  {formatPortfolioValue(differenceToTarget(), currency())}
                                </span>{" "}
                                <span class="text-[11px] text-green-500/85">
                                  ({differenceToTargetInShares().toFixed(4)} shares)
                                </span>{" "}
                                more to reach target allocation.
                              </Show>
                            </p>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>

                  {/* Investment Thesis Notes */}
                  <div class="p-6 border-b border-forest/5">
                    <div
                      onClick={() => setNotesExpanded(!notesExpanded())}
                      class="flex items-center justify-between cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
                    >
                      <div class="flex items-center gap-1.5">
                        <span class="material-icons !text-[16px] text-earth">edit</span>
                        <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
                          Investment Thesis / Notes
                        </h4>
                      </div>
                      <div class="flex items-center gap-2">
                        <Show when={saveStatus()}>
                          <span
                            class={`text-[10px] font-outfit font-bold px-2 py-0.5 rounded-full ${
                              saveStatus() === "Saved ✓"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {saveStatus()}
                          </span>
                        </Show>
                        <span class="material-icons text-earth transition-transform duration-300 transform" style={{ transform: notesExpanded() ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Truncated Notes Preview (only visible when closed and notes exist) */}
                    <Show when={!notesExpanded() && thesisNotes().trim()}>
                      <p class="text-xs text-earth/60 italic truncate mt-3 pl-5 border-l-2 border-forest/10">
                        {thesisNotes()}
                      </p>
                    </Show>

                    {/* Expandable Notes Editor Content */}
                    <div
                      class={`grid transition-all duration-300 ease-in-out ${
                        notesExpanded()
                          ? "grid-rows-[1fr] opacity-100 mt-4"
                          : "grid-rows-[0fr] opacity-0 overflow-hidden"
                      }`}
                    >
                      <div class="overflow-hidden space-y-3">
                        <Show
                          when={!loadingNotes()}
                          fallback={
                            <div class="h-32 rounded-2xl bg-sage/5 animate-pulse flex items-center justify-center">
                              <p class="text-xs text-earth/50 font-outfit italic">
                                Loading notes...
                              </p>
                            </div>
                          }
                        >
                          <textarea
                            value={thesisNotes()}
                            onInput={(e) => setThesisNotes(e.currentTarget.value)}
                            placeholder={
                              activeTxId()
                                ? "Write your thesis or notes on why you are holding this asset..."
                                : "No transactions found to save notes onto."
                            }
                            disabled={!activeTxId()}
                            class="w-full h-32 p-4 border border-forest/10 rounded-2xl font-outfit text-sm text-forest placeholder-earth/40 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-sage/5/30 hover:bg-sage/5/50 transition-colors disabled:opacity-50 resize-none"
                          />

                          <div class="flex items-center justify-between">
                            <div class="text-[10px] text-earth/60 font-outfit">
                              <Show when={notesLastUpdated()}>
                                {(updated) => (
                                  <span>
                                    Last updated:{" "}
                                    {new Date(updated()).toLocaleString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </Show>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveNotes();
                              }}
                              disabled={!activeTxId() || savingNotes()}
                              class="flex items-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-outfit font-bold hover:brightness-95 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer"
                            >
                              <Show
                                when={!savingNotes()}
                                fallback={
                                  <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                }
                              >
                                <span class="material-icons !text-[13px] text-white">save</span>
                              </Show>
                              {savingNotes() ? "Saving..." : "Save Thesis"}
                            </button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>

                  {/* Transactions History */}
                  <div class="p-6">
                    <div
                      onClick={() => setHistoryExpanded(!historyExpanded())}
                      class="flex items-center justify-between cursor-pointer hover:bg-sage/5 p-2 -m-2 rounded-xl transition-colors select-none"
                    >
                      <h4 class="font-outfit font-bold text-forest text-xs uppercase tracking-widest">
                        Transaction History
                      </h4>
                      <span class="material-icons text-earth transition-transform duration-300 transform" style={{ transform: historyExpanded() ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </div>

                    {/* Collapsed visual summary */}
                    <Show when={!historyExpanded()}>
                      <p class="text-xs text-earth/60 italic mt-3 pl-5 border-l-2 border-forest/10">
                        {props.transactions.length} transaction{props.transactions.length === 1 ? "" : "s"} recorded.
                      </p>
                    </Show>

                    {/* Expandable Content wrapper */}
                    <div
                      class={`grid transition-all duration-300 ease-in-out ${
                        historyExpanded()
                          ? "grid-rows-[1fr] opacity-100 mt-4"
                          : "grid-rows-[0fr] opacity-0 overflow-hidden"
                      }`}
                    >
                      <div class="overflow-hidden space-y-3">
                        <For
                          each={sortedTransactions()}
                          fallback={
                            <div class="text-center py-10 text-earth/30 italic font-outfit text-sm">
                              No transactions found for this asset.
                            </div>
                          }
                        >
                          {(tx) => (
                            <div class="p-4 rounded-2xl border border-forest/5 hover:border-forest/20 transition-all group">
                              <div class="flex justify-between items-start">
                                <div>
                                  <div class="flex items-center gap-2 mb-1">
                                    <span
                                      class={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${tx.type === "BUY" ? "bg-spring/10 text-spring" : "bg-red-100 text-red-600"}`}
                                    >
                                      {tx.type}
                                    </span>
                                    <span class="text-[10px] text-earth font-outfit">
                                      {new Date(tx.date).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <p class="text-sm font-outfit font-medium text-forest">
                                    {tx.shares.toFixed(4)} @{" "}
                                    {formatPortfolioValue(
                                      tx.pricePerShare,
                                      currency(),
                                      true,
                                    )}
                                  </p>
                                </div>
                                <div class="text-right">
                                  <p class="text-sm font-outfit font-bold text-forest">
                                    {formatPortfolioValue(tx.totalAmount, currency())}
                                  </p>
                                  <Show when={tx.gainLoss !== undefined}>
                                    <p
                                      class={`text-[10px] font-bold ${tx.gainLoss! >= 0 ? "text-spring" : "text-red-500"}`}
                                    >
                                      {tx.gainLoss! >= 0 ? "+" : ""}
                                      {formatPortfolioValue(
                                        tx.gainLoss!,
                                        currency(),
                                        true,
                                      )}
                                    </p>
                                  </Show>
                                </div>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Show>
        </div>
      </div>
      <style>{`
        @starting-style {
          .slide-over-backdrop {
            background-color: rgba(0, 0, 0, 0) !important;
          }
          .slide-over-panel {
            transform: translateX(100%) !important;
          }
        }
      `}</style>
    </Show>
  );
};

