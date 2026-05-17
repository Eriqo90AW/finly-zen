import { createSignal, For, Show, createMemo } from "solid-js";
import {
  portfolioState,
  setActivePortfolioId,
  deletePortfolio,
} from "../../store/portfolioStore";
import { formatPortfolioValue } from "../../utils/format";
import AddIcon from "@suid/icons-material/Add";
import { CreatePortfolioModal } from "./modals/CreatePortfolioModal";
import { ConfirmDeleteModal } from "./modals/ConfirmDeleteModal";

// Helper to generate a deterministic color from a string (the portfolio name)
const getPortfolioColor = (name: string) => {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#14B8A6",
    "#6366F1",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper to generate a deterministic color from a string (the ticker)
const getAssetColor = (ticker: string) => {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#14B8A6",
    "#6366F1",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PortfolioMiniDonut = (props: { portfolio: any }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;

  const segments = createMemo(() => {
    const total = props.portfolio.totalValue;
    if (total === 0) return [];

    const list: {
      name: string;
      percentage: number;
      color: string;
      offset: number;
    }[] = [];
    let accumulated = 0;

    props.portfolio.assets.forEach((asset: any) => {
      if (asset.actualAllocation > 0) {
        list.push({
          name: asset.ticker,
          percentage: asset.actualAllocation,
          color: getAssetColor(asset.ticker),
          offset: accumulated,
        });
        accumulated += asset.actualAllocation;
      }
    });

    const cashPercent = (props.portfolio.cash / total) * 100;
    if (cashPercent > 0) {
      list.push({
        name: "Cash",
        percentage: cashPercent,
        color: "#2D7D46", // mid-green for cash
        offset: accumulated,
      });
    }

    return list;
  });

  const top3Allocations = createMemo(() => {
    const list = segments().map((s) => ({
      name: s.name,
      percentage: s.percentage,
      color: s.color,
    }));
    return list.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  });

  return (
    <div class="flex items-center gap-1.5">
      <Show
        when={props.portfolio.totalValue > 0}
        fallback={
          <div class="flex items-center gap-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              class="transform -rotate-90"
            >
              <circle
                cx="12"
                cy="12"
                r={radius}
                stroke="currentColor"
                stroke-width="3.5"
                fill="transparent"
                class="text-forest/10"
              />
            </svg>
            <span class="text-[10px] text-earth/40 italic font-outfit">
              Empty
            </span>
          </div>
        }
      >
        <div class="flex flex-col gap-0.5 min-w-0">
          <For each={top3Allocations()}>
            {(item) => (
              <div class="flex items-center gap-1 text-[9px] font-outfit font-bold uppercase tracking-wider text-earth/80">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ "background-color": item.color }}
                />
                <span
                  class="truncate max-w-[45px] leading-none"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span class="text-earth/40 text-[8px] font-medium leading-none">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </For>
        </div>

        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          class="transform -rotate-90 drop-shadow-sm flex-shrink-0"
        >
          <circle
            cx="12"
            cy="12"
            r={radius}
            stroke="currentColor"
            stroke-width="3.5"
            fill="transparent"
            class="text-forest/10"
          />
          <For each={segments()}>
            {(segment) => {
              const strokeLength = (segment.percentage / 100) * circumference;
              const strokeOffset = -((segment.offset / 100) * circumference);

              return (
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  stroke={segment.color}
                  stroke-width="3.5"
                  fill="transparent"
                  stroke-dasharray={`${strokeLength} ${circumference}`}
                  stroke-dashoffset={`${strokeOffset}`}
                  class="transition-all duration-1000 ease-out"
                />
              );
            }}
          </For>
        </svg>
      </Show>
    </div>
  );
};

export const PortfolioOverview = () => {
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false);
  const [portfolioToDelete, setPortfolioToDelete] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const currency = () => portfolioState.currencyView;

  return (
    <>
      <div class="flex justify-between items-center mb-10">
        <div class="pl-2">
          <h1 class="text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
            My Portfolios
          </h1>
          <p class="text-earth font-outfit tracking-wide uppercase text-[10px] font-bold">
            Select or create a portfolio to begin
          </p>
        </div>
      </div>

      <div class="premium-card overflow-hidden">
        <div class="px-8 py-6 border-b border-forest/5 flex justify-between items-center bg-white/50 backdrop-blur-sm">
          <h4 class="font-outfit font-bold text-forest text-lg">
            Portfolio List
          </h4>
          <button
            onClick={() => setShowCreateModal(true)}
            class="px-4 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest/90 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <AddIcon class="text-sm" />
            CREATE PORTFOLIO
          </button>
        </div>

        <div class="overflow-x-auto">
          <div class="flex flex-col min-w-[900px]">
            {/* Header Row */}
            <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60">
              {/* Spacer for the vertical color bar */}
              <div class="w-1 mr-4" />

              <div class="flex-[2] min-w-0">Portfolio</div>
              <div class="flex-1 flex items-center justify-end gap-1">
                Total Value
                <span class="material-icons !text-[16px] text-earth/40">
                  expand_more
                </span>
              </div>
              <div class="flex-1 flex items-center justify-end gap-1">
                All-Time Gain
                <span class="material-icons !text-[16px] text-earth/40">
                  info_outline
                </span>
              </div>
              <div class="flex-1 text-right">Initial / Cash</div>
              <div class="flex-1 text-right">Assets</div>
              <div class="w-36 flex justify-end">Allocation</div>
              <div class="w-12" />
            </div>

            {/* Portfolios List */}
            <div class="flex flex-col">
              <Show
                when={!portfolioState.isLoading}
                fallback={
                  <For each={[1, 2, 3]}>
                    {() => (
                      <div class="flex items-center px-8 py-5 border-b border-forest/5 animate-pulse">
                        <div class="w-1 mr-4 h-12 bg-sage/20 rounded-full" />
                        <div class="flex-[2] pr-4 flex items-center gap-4">
                          <div class="w-10 h-10 rounded-xl bg-sage/20" />
                          <div class="flex-1 space-y-2">
                            <div class="h-4 bg-sage/20 rounded w-2/3" />
                            <div class="h-3 bg-sage/20 rounded w-1/3" />
                          </div>
                        </div>
                        <div class="flex-1 text-right space-y-2 pr-4">
                          <div class="h-4 bg-sage/20 rounded w-3/4 ml-auto" />
                        </div>
                        <div class="flex-1 text-right space-y-2 pr-4">
                          <div class="h-4 bg-sage/20 rounded w-2/3 ml-auto" />
                        </div>
                        <div class="flex-1 text-right space-y-2 pr-4">
                          <div class="h-4 bg-sage/20 rounded w-3/4 ml-auto" />
                        </div>
                        <div class="flex-1 text-right space-y-2 pr-4">
                          <div class="h-4 bg-sage/20 rounded w-1/2 ml-auto" />
                        </div>
                        <div class="w-36 flex justify-end">
                          <div class="h-4 bg-sage/20 rounded w-20" />
                        </div>
                        <div class="w-12" />
                      </div>
                    )}
                  </For>
                }
              >
                <For
                  each={portfolioState.portfolios}
                  fallback={
                    <div class="px-8 py-24 text-center text-earth/40 italic font-outfit flex flex-col items-center justify-center">
                      <div class="w-20 h-20 bg-sage/20 rounded-2xl flex items-center justify-center text-forest mb-6">
                        <span class="material-icons text-4xl">
                          account_balance_wallet
                        </span>
                      </div>
                      <h2 class="text-2xl font-cormorant text-forest font-bold mb-2">
                        No Portfolios Yet
                      </h2>
                      <p class="text-earth font-outfit text-sm mb-8 max-w-sm mx-auto not-italic">
                        Start your investment journey by creating your first
                        portfolio.
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        class="bg-forest text-white px-8 py-3 rounded-xl font-outfit font-bold shadow-md hover:bg-forest/90 transition-all cursor-pointer text-xs not-italic"
                      >
                        Get Started
                      </button>
                    </div>
                  }
                >
                  {(p) => {
                    const pColor = getPortfolioColor(p.name);
                    const isPositive = p.allTimeGain >= 0;

                    return (
                      <div
                        onClick={() => setActivePortfolioId(p.id)}
                        class="group flex items-center px-8 py-5 border-b border-forest/5 hover:bg-slate-50/80 transition-colors duration-200 cursor-pointer relative"
                      >
                        {/* Left side dynamic indicator stripe */}
                        <div
                          class="absolute left-0 top-0 bottom-0 w-1 transition-transform duration-200 group-hover:scale-x-[1.5] origin-left"
                          style={{ "background-color": pColor }}
                        />

                        {/* Portfolio Name Badge Column */}
                        <div class="flex-[2] flex pr-4 items-center gap-4 min-w-0">
                          <div
                            class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            style={{ "background-color": pColor }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <span class="font-outfit font-bold text-forest text-base leading-tight group-hover:text-spring transition-colors">
                              {p.name}
                            </span>
                            <span class="text-xs text-earth/60 truncate max-w-[180px]">
                              ID: {p.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>

                        {/* Total Value Column */}
                        <div class="flex-1 flex flex-col items-end gap-0.5">
                          <span class="font-outfit font-bold text-forest text-sm">
                            {formatPortfolioValue(p.totalValue, currency())}
                          </span>
                        </div>

                        {/* All-Time Gain Column */}
                        <div class="flex-1 flex flex-col items-end gap-0.5">
                          <span
                            class={`font-outfit font-bold text-sm ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {isPositive ? "+" : ""}
                            {formatPortfolioValue(
                              p.allTimeGain,
                              currency(),
                              true,
                            )}
                          </span>
                          <div
                            class={`flex items-center text-[11px] font-bold ${isPositive ? "text-emerald-600/80" : "text-rose-500/80"}`}
                          >
                            <span class="material-icons !text-[14px]">
                              {isPositive ? "arrow_drop_up" : "arrow_drop_down"}
                            </span>
                            {Math.abs(p.allTimeGainPercentage).toFixed(2)}%
                          </div>
                        </div>

                        {/* Initial / Cash Column */}
                        <div class="flex-1 flex flex-col items-end gap-0.5">
                          <span class="font-outfit font-medium text-forest text-sm">
                            {formatPortfolioValue(p.initialCapital, currency())}
                          </span>
                          <span class="text-[11px] text-earth/60 font-medium">
                            Cash: {formatPortfolioValue(p.cash, currency())}
                          </span>
                        </div>

                        {/* Assets Column */}
                        <div class="flex-1 flex flex-col items-end gap-0.5">
                          <span class="font-outfit text-forest font-bold text-sm">
                            {p.assets.length}{" "}
                            {p.assets.length === 1 ? "Asset" : "Assets"}
                          </span>
                          <span class="text-[11px] text-earth/60 font-medium">
                            Total Assets
                          </span>
                        </div>

                        {/* Chart Column */}
                        <div class="w-36 flex justify-end items-center">
                          <PortfolioMiniDonut portfolio={p} />
                        </div>

                        {/* Action Column */}
                        <div class="w-12 flex justify-end items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPortfolioToDelete({ id: p.id, name: p.name });
                              setDeleteConfirmOpen(true);
                            }}
                            class="opacity-0 group-hover:opacity-100 transition-opacity text-earth/20 hover:text-rose-500 pt-1.5 px-1 hover:bg-rose-50 rounded-md cursor-pointer"
                            title="Delete Portfolio"
                          >
                            <span class="material-icons text-base">
                              delete_outline
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <CreatePortfolioModal
        isOpen={showCreateModal()}
        onClose={() => setShowCreateModal(false)}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen()}
        portfolioName={portfolioToDelete()?.name || ""}
        onConfirm={() => {
          const toDelete = portfolioToDelete();
          if (toDelete) {
            deletePortfolio(toDelete.id);
          }
        }}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPortfolioToDelete(null);
        }}
      />
    </>
  );
};
