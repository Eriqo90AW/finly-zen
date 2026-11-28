import { useNavigate } from "@solidjs/router";
import AddIcon from "@suid/icons-material/Add";
import { createSignal, For, Show } from "solid-js";
import {
  adjustPortfolioCash,
  deletePortfolio,
  portfolioState,
} from "../../../../store/portfolioStore";
import type { Portfolio } from "../../../../types";
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal";
import { CreatePortfolioModal } from "../modals/CreatePortfolioModal";
import { PortfolioOverviewRow } from "./PortfolioOverviewRow";

export const PortfolioOverview = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false);
  const [portfolioToDelete, setPortfolioToDelete] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [editingCashId, setEditingCashId] = createSignal<string | null>(null);
  const [cashEditValue, setCashEditValue] = createSignal("");
  const currency = () => portfolioState.currencyView;

  const handleStartEditCash = (portfolio: Portfolio) => {
    setEditingCashId(portfolio.id);
    const isUSD = (portfolio.price_currency ?? 1) > 1;
    setCashEditValue(
      isUSD ? portfolio.cash.toFixed(2) : Math.round(portfolio.cash).toString(),
    );
    setTimeout(() => {
      const input = document.getElementById(
        `cash-input-${portfolio.id}`,
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 50);
  };

  const handleCommitCashEdit = (portfolioId: string) => {
    const val = Number.parseFloat(cashEditValue());
    if (!Number.isNaN(val) && val >= 0) {
      adjustPortfolioCash(portfolioId, val);
    }
    setEditingCashId(null);
  };

  return (
    <>
      <div class="flex justify-between items-center mb-6 sm:mb-10">
        <div class="pl-2">
          <h1 class="text-2xl sm:text-4xl font-cormorant text-forest font-bold tracking-tight mb-1">
            My Portfolios
          </h1>
          <p class="text-earth font-outfit tracking-wide uppercase text-[9px] sm:text-[10px] font-bold">
            Select or create a portfolio to begin
          </p>
        </div>
      </div>

      <div class="premium-card overflow-hidden">
        <div class="px-4 sm:px-8 py-4 sm:py-6 border-b border-forest/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/50 backdrop-blur-sm">
          <h4 class="font-outfit font-bold text-forest text-base sm:text-lg">
            Portfolio List
          </h4>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            class="px-4 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest/90 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <AddIcon class="text-sm" />
            CREATE PORTFOLIO
          </button>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
          <div class="flex flex-col min-w-[760px] sm:min-w-[900px]">
            {/* Header Row */}
            <div class="flex items-center px-8 py-4 border-b border-forest/5 text-[11px] font-bold uppercase tracking-widest text-earth/60">
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
                  <div class="px-8 py-24 flex flex-col items-center justify-center gap-4 text-center">
                    <div class="w-10 h-10 border-4 border-forest/10 border-t-forest rounded-full animate-spin" />
                    <span class="text-earth/60 font-outfit text-sm tracking-wide animate-pulse">
                      Loading portfolios...
                    </span>
                  </div>
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
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        class="bg-forest text-white px-8 py-3 rounded-xl font-outfit font-bold shadow-md hover:bg-forest/90 transition-all cursor-pointer text-xs not-italic"
                      >
                        Get Started
                      </button>
                    </div>
                  }
                >
                  {(p) => (
                    <PortfolioOverviewRow
                      portfolio={p}
                      currency={currency()}
                      isEditingCash={editingCashId() === p.id}
                      cashEditValue={cashEditValue()}
                      onNavigate={(id) => navigate(`/portfolio/${id}`)}
                      onStartEditCash={handleStartEditCash}
                      onCashEditChange={setCashEditValue}
                      onCommitCashEdit={handleCommitCashEdit}
                      onCancelCashEdit={() => setEditingCashId(null)}
                      onRequestDelete={(target) => {
                        setPortfolioToDelete(target);
                        setDeleteConfirmOpen(true);
                      }}
                    />
                  )}
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
