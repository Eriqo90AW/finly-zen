import { createSignal, createMemo, Show, For } from "solid-js";
import { state, setCategoryBudget, budgetSyncError } from "../../../store";
import { formatRupiah } from "../../../utils/format";
import { CategoryTargetsSection } from "./CategoryTargetsSection";
import { EditCategoryTargetModal } from "./EditCategoryTargetModal";
import {
  computeCategoryTargets,
  computeTopExpenses,
  getExpenseRankBadgeClass,
} from "./topExpensesHelpers";
import type { TopExpensesAndTargetsProps } from "../../../types";

export const TopExpensesAndTargetsCard = (
  props: TopExpensesAndTargetsProps,
) => {
  const [editingCategory, setEditingCategory] = createSignal<{
    category: string;
    target: number;
  } | null>(null);
  const [editInputVal, setEditInputVal] = createSignal("");

  const topExpenses = createMemo(() =>
    computeTopExpenses(props.transactions || []),
  );

  const categoryTargets = createMemo(() =>
    computeCategoryTargets(props.transactions || [], state.budgets),
  );

  const targetsTotal = createMemo(() =>
    categoryTargets().reduce((sum, item) => sum + item.target, 0),
  );

  const handleOpenEdit = (category: string, currentTarget: number) => {
    setEditingCategory({ category, target: currentTarget });
    setEditInputVal(currentTarget > 0 ? currentTarget.toString() : "");
  };

  const handleSaveEdit = (e?: Event) => {
    if (e) e.preventDefault();
    const current = editingCategory();
    if (!current) return;

    const parsed = parseInt(editInputVal().replace(/[^0-9]/g, ""), 10);
    const validAmount = Number.isNaN(parsed) ? 0 : parsed;

    setCategoryBudget(current.category, validAmount);
    setEditingCategory(null);
  };

  return (
    <div class="premium-card p-4 sm:p-6 flex flex-col h-full cursor-default min-h-[300px]">
      <Show when={budgetSyncError()}>
        <p role="alert" class="text-xs text-red-700">
          Budget sync: {budgetSyncError()}
        </p>
      </Show>
      <div class="flex flex-col shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-outfit font-bold text-forest text-sm flex items-center gap-1.5">
            <span class="material-icons !text-base text-forest">
              local_fire_department
            </span>
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

        <div class="max-h-36 overflow-y-auto pr-1 custom-scrollbar-thin space-y-1.5">
          <Show
            when={!props.loading}
            fallback={
              <div class="py-4 flex items-center justify-center text-xs text-earth/40 font-outfit">
                Loading...
              </div>
            }
          >
            <Show
              when={topExpenses().length > 0}
              fallback={
                <div class="py-3 flex items-center justify-center text-xs text-earth/50 font-outfit">
                  No expense transactions
                </div>
              }
            >
              <For each={topExpenses()}>
                {(tx, idx) => (
                  <div class="flex items-center justify-between h-11 px-1.5 rounded-lg bg-spring/[0.06] hover:bg-forest/[0.06] transition-colors group">
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        class={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 tabular-nums ${getExpenseRankBadgeClass(idx())}`}
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
                          <span class="text-[10px] text-earth/60 truncate font-medium">
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
      <div class="w-full border-t border-forest/10 my-3 shrink-0" />

      {/* SECTION 2: CATEGORY TARGETS */}
      <CategoryTargetsSection
        targets={categoryTargets()}
        targetsTotal={targetsTotal()}
        loading={props.loading}
        onEditTarget={handleOpenEdit}
      />

      {/* QUICK EDIT MODAL */}
      <EditCategoryTargetModal
        category={editingCategory()?.category ?? null}
        inputValue={editInputVal()}
        onInputChange={setEditInputVal}
        onClose={() => setEditingCategory(null)}
        onSubmit={handleSaveEdit}
      />

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
