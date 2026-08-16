import { createSignal, createMemo, Show, For } from "solid-js";
import { state, setCategoryBudget } from "../../store";
import { formatRupiah } from "../../utils/format";
import { getCategoryDefaultTarget, getCategoryFallbackColor } from "../../config/defaults";
import { isTransferTransaction } from "../../utils/transferUtils";
import type { TopExpensesAndTargetsProps } from "../../types";

export const TopExpensesAndTargetsCard = (props: TopExpensesAndTargetsProps) => {
  const [editingCategory, setEditingCategory] = createSignal<{
    category: string;
    target: number;
  } | null>(null);
  const [editInputVal, setEditInputVal] = createSignal("");

  // 1. Top 3 Most Expensive Expense Transactions (excluding internal transfers, account filtered)
  const topExpenses = createMemo(() => {
    const data = props.transactions || [];
    return data
      .filter((t) => {
        if (t.type !== "expense") return false;
        if (isTransferTransaction(t)) return false;
        return true;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  });

  // 2. Category Targets & Period Spends
  const categoryTargets = createMemo(() => {
    const data = props.transactions || [];
    const expenseData = data.filter((t) => t.type === "expense" && !isTransferTransaction(t));

    // Calculate actual spent per category in this period
    const spentMap: Record<string, { spent: number; color?: string }> = {};
    expenseData.forEach((t) => {
      if (!spentMap[t.category]) {
        spentMap[t.category] = { spent: 0, color: t.categoryColor };
      }
      spentMap[t.category].spent += t.amount;
    });

    // Combine categories from state.budgets and any active expense categories
    const allCategories = new Set<string>([
      ...state.budgets.map((b) => b.category),
      ...Object.keys(spentMap),
    ]);

    const result = Array.from(allCategories)
      .filter((cat) => cat.toLowerCase() !== "debt")
      .map((cat) => {
        const budgetObj = state.budgets.find(
          (b) => b.category.toLowerCase() === cat.toLowerCase(),
        );
        const target =
          budgetObj !== undefined
            ? budgetObj.limit
            : getCategoryDefaultTarget(cat);
        const spent = spentMap[cat]?.spent || 0;
        const color = spentMap[cat]?.color || getCategoryFallbackColor(cat);

        const pct = target > 0 ? Math.round((spent / target) * 100) : 0;

        return {
          category: cat,
          spent,
          target,
          pct,
          color,
        };
      })
      .sort((a, b) => {
        // Sort by highest target amount first
        if (b.target !== a.target) return b.target - a.target;
        if (b.spent !== a.spent) return b.spent - a.spent;
        return a.category.localeCompare(b.category);
      });

    return result;
  });

  const handleOpenEdit = (category: string, currentTarget: number) => {
    setEditingCategory({ category, target: currentTarget });
    setEditInputVal(currentTarget > 0 ? currentTarget.toString() : "");
  };

  const handleSaveEdit = (e?: Event) => {
    if (e) e.preventDefault();
    const current = editingCategory();
    if (!current) return;

    const parsed = parseInt(editInputVal().replace(/[^0-9]/g, ""), 10);
    const validAmount = isNaN(parsed) ? 0 : parsed;

    setCategoryBudget(current.category, validAmount);
    setEditingCategory(null);
  };

  return (
    <div class="premium-card p-5 flex flex-col h-full overflow-hidden relative">
      {/* SECTION 1: TOP 3 EXPENSES */}
      <div class="shrink-0 flex flex-col overflow-hidden" style={{ "max-height": "45%" }}>
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-1.5">
            <span class="material-icons !text-base text-forest">local_fire_department</span>
            Top Expenses
          </h4>
          <Show when={state.ui.selectedAccount}>
            <span
              class="text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
              style={{
                "background-color": state.ui.selectedAccountColor
                  ? `${state.ui.selectedAccountColor}20`
                  : "rgba(26, 77, 46, 0.1)",
                color: state.ui.selectedAccountColor || "#1A4D2E",
              }}
            >
              {state.ui.selectedAccount}
            </span>
          </Show>
        </div>

        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar-thin space-y-1.5 min-h-0">
          <Show
            when={!props.loading}
            fallback={
              <div class="h-20 flex items-center justify-center text-xs text-earth/40 font-outfit">
                Loading...
              </div>
            }
          >
            <Show
              when={topExpenses().length > 0}
              fallback={
                <div class="h-20 flex items-center justify-center text-xs text-earth/50 font-outfit">
                  No expense transactions
                </div>
              }
            >
              <For each={topExpenses()}>
                {(tx, idx) => (
                  <div class="flex items-center justify-between p-1.5 rounded-lg bg-spring/[0.06] hover:bg-forest/[0.06] transition-colors group">
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        class={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          idx() === 0
                            ? "bg-amber-500/20 text-amber-700"
                            : idx() === 1
                            ? "bg-slate-400/20 text-slate-700"
                            : idx() === 2
                            ? "bg-amber-700/20 text-amber-800"
                            : "bg-forest/10 text-forest/70"
                        }`}
                      >
                        {idx() + 1}
                      </span>
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-forest truncate group-hover:text-forest/90 leading-tight">
                          {tx.name || "Expense"}
                        </p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <span
                            class="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              "background-color": tx.categoryColor || "#1A4D2E",
                            }}
                          />
                          <span class="text-[9px] text-earth/60 truncate uppercase font-medium">
                            {tx.category || "General"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-xs font-bold font-outfit text-red-600">
                        {formatRupiah(tx.amount)}
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>

      {/* DIVIDER */}
      <div class="w-full border-t border-forest/10 mt-4 mb-2 shrink-0" />

      {/* SECTION 2: CATEGORY TARGETS */}
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-1.5">
            <span class="material-icons !text-base text-forest">track_changes</span>
            Category Targets
          </h4>
          <span class="text-[9px] text-earth/60 italic">Click target to edit</span>
        </div>

        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar-thin space-y-2 min-h-0">
          <Show
            when={!props.loading}
            fallback={
              <div class="h-24 flex items-center justify-center text-xs text-earth/40 font-outfit">
                Loading...
              </div>
            }
          >
            <For each={categoryTargets()}>
              {(item) => {
                const isOver = () => item.target > 0 && item.spent > item.target;
                const isWarning = () =>
                  item.target > 0 && item.pct >= 80 && item.pct <= 100;

                return (
                  <div class="p-1.5 rounded-lg bg-forest/[0.02] hover:bg-forest/[0.05] transition-all group">
                    <div class="flex items-center justify-between text-xs mb-1">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <div
                          class="w-2 h-2 rounded-full shrink-0"
                          style={{ "background-color": item.color }}
                        />
                        <span class="font-semibold text-forest text-xs truncate">
                          {item.category}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item.category, item.target)}
                        class="flex items-center gap-1 text-[11px] font-outfit text-earth hover:text-forest transition-colors cursor-pointer group/btn"
                        title="Click to edit target"
                      >
                        <span class="font-bold text-forest">
                          {formatRupiah(item.spent)}
                        </span>
                        <span class="text-earth/50">/</span>
                        <span class="text-earth/70 group-hover/btn:underline group-hover/btn:text-forest">
                          {item.target > 0 ? formatRupiah(item.target) : "Set target"}
                        </span>
                        <span class="material-icons !text-[11px] text-earth/40 group-hover/btn:text-forest">
                          edit
                        </span>
                      </button>
                    </div>

                    {/* Target Progress / Level Bar */}
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1.5 bg-forest/10 rounded-full overflow-hidden">
                        <div
                          class={`h-full rounded-full transition-all duration-500 ${
                            isOver()
                              ? "bg-rose-500"
                              : isWarning()
                              ? "bg-amber-500"
                              : "bg-forest"
                          }`}
                          style={{
                            width: `${Math.min(item.pct, 100)}%`,
                            "background-color":
                              !isOver() && !isWarning() ? item.color : undefined,
                          }}
                        />
                      </div>
                      <span
                        class={`text-[10px] font-bold font-outfit shrink-0 ${
                          isOver()
                            ? "text-rose-500"
                            : isWarning()
                            ? "text-amber-600"
                            : "text-forest"
                        }`}
                      >
                        {item.target > 0 ? `${item.pct}%` : "-"}
                      </span>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </div>

      {/* QUICK EDIT MODAL / OVERLAY */}
      <Show when={editingCategory()}>
        <div class="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 p-5 rounded-2xl flex flex-col justify-center animate-fade-in">
          <h5 class="text-sm font-bold text-forest font-outfit mb-1">
            Set Period Target: {editingCategory()?.category}
          </h5>
          <p class="text-[11px] text-earth/70 mb-3">
            Enter the target spending limit for this category.
          </p>

          <form onSubmit={handleSaveEdit} class="space-y-3">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-earth/60">
                Rp
              </span>
              <input
                type="text"
                value={editInputVal()}
                onInput={(e) => setEditInputVal(e.currentTarget.value)}
                placeholder="e.g. 2500000"
                autofocus
                class="w-full pl-9 pr-3 py-1.5 text-sm font-outfit font-bold border border-forest/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 bg-white text-forest"
              />
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                class="px-3 py-1 text-xs font-semibold text-earth hover:text-forest bg-forest/5 hover:bg-forest/10 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-3 py-1 text-xs font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </form>
        </div>
      </Show>

      {/* Inline scrollbar styling */}
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(26, 77, 46, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 77, 46, 0.4);
        }
      `}</style>
    </div>
  );
};
