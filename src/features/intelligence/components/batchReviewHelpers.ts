import type { EntryKind, TransactionDraft } from "../../../types/intelligence";

export interface BatchReconciliation {
  expected: number;
  actual: number;
  diff: number;
  isReconciled: boolean;
}

export interface StatusBadgeStyle {
  classes: string;
  icon: string;
  iconSpin?: boolean;
  label: string;
}

export function getKindIcon(kind: EntryKind): string {
  switch (kind) {
    case "tax":
      return "receipt_long";
    case "service":
      return "room_service";
    case "discount":
      return "local_offer";
    case "adjustment":
      return "tune";
    default:
      return "shopping_bag";
  }
}

export function getStatusBadgeStyle(status: TransactionDraft["status"]): StatusBadgeStyle {
  switch (status) {
    case "saved":
      return {
        classes: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        icon: "check_circle",
        label: "Saved",
      };
    case "saving":
      return {
        classes: "bg-sky-100 text-sky-800 border border-sky-200 animate-pulse",
        icon: "refresh",
        iconSpin: true,
        label: "Saving…",
      };
    case "failed":
      return {
        classes: "bg-rose-100 text-rose-800 border border-rose-200",
        icon: "error_outline",
        label: "Failed",
      };
    case "invalid":
      return {
        classes: "bg-amber-100 text-amber-800 border border-amber-200",
        icon: "warning_amber",
        label: "Needs info",
      };
    case "excluded":
      return {
        classes: "bg-slate-100 text-slate-500 border border-slate-200",
        icon: "block",
        label: "Excluded",
      };
    default:
      return {
        classes: "bg-forest/10 text-forest border border-forest/20",
        icon: "check",
        label: "Ready",
      };
  }
}

export function getDraftCardClasses(status: TransactionDraft["status"]): string {
  if (status === "saved") return "bg-emerald-50/60 border-emerald-200/80 opacity-95";
  if (status === "excluded") return "bg-slate-50 border-slate-200 opacity-60";
  if (status === "failed") return "bg-rose-50/60 border-rose-200";
  if (status === "invalid") return "bg-amber-50/40 border-amber-200";
  return "bg-white border-forest/10 shadow-xs hover:border-forest/30";
}

export function calculateSelectedNetTotal(drafts: TransactionDraft[]): number {
  let expenseTotal = 0;
  let incomeTotal = 0;
  for (const d of drafts) {
    if (d.selected && d.status !== "excluded") {
      if (d.type === "income" || d.entryKind === "discount") {
        incomeTotal += d.amount || 0;
      } else {
        expenseTotal += d.amount || 0;
      }
    }
  }
  return expenseTotal - incomeTotal;
}

export function calculateReconciliation(
  expected: number | null | undefined,
  actual: number,
): BatchReconciliation | null {
  if (expected === undefined || expected === null || expected <= 0) return null;
  const diff = Math.abs(expected - actual);
  return {
    expected,
    actual,
    diff,
    isReconciled: diff <= 1,
  };
}
