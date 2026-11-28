import {
  getCategoryDefaultTarget,
  getCategoryFallbackColor,
} from "../../../config/defaults";
import { isTransferTransaction } from "../../../utils/transferUtils";
import type { Budget, Transaction } from "../../../types";

export interface CategoryTargetItem {
  category: string;
  spent: number;
  target: number;
  pct: number;
  color: string;
}

export const computeTopExpenses = (
  transactions: Transaction[],
): Transaction[] =>
  transactions
    .filter((t) => {
      if (t.type !== "expense") return false;
      if (isTransferTransaction(t)) return false;
      return true;
    })
    .sort((a, b) => b.amount - a.amount);

export const computeCategoryTargets = (
  transactions: Transaction[],
  budgets: Budget[],
): CategoryTargetItem[] => {
  const expenseData = transactions.filter(
    (t) => t.type === "expense" && !isTransferTransaction(t),
  );

  const spentMap: Record<string, { spent: number; color?: string }> = {};
  expenseData.forEach((t) => {
    if (!spentMap[t.category]) {
      spentMap[t.category] = { spent: 0, color: t.categoryColor };
    }
    spentMap[t.category].spent += t.amount;
  });

  const allCategories = new Set<string>([
    ...budgets.map((b) => b.category),
    ...Object.keys(spentMap),
  ]);

  return Array.from(allCategories)
    .filter((cat) => cat.toLowerCase() !== "debt")
    .map((cat) => {
      const budgetObj = budgets.find(
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
      if (b.target !== a.target) return b.target - a.target;
      if (b.spent !== a.spent) return b.spent - a.spent;
      return a.category.localeCompare(b.category);
    });
};

export const getExpenseRankBadgeClass = (idx: number): string => {
  if (idx === 0) return "bg-amber-500/20 text-amber-700";
  if (idx === 1) return "bg-slate-400/20 text-slate-700";
  if (idx === 2) return "bg-amber-700/20 text-amber-800";
  return "text-forest/50";
};
