import { CHART_PALETTE } from "../../../components/ui";
import type { Account, DatePeriod, Transaction } from "../../../types";
import { getDateRange, isDateInRange } from "../../../utils/date";
import { isTransferTransaction } from "../../../utils/transferUtils";

export type ReportRangeMonths = 3 | 6 | 12;

export interface MonthlyCashflowPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  start: Date;
  end: Date;
}

export interface ReportsKpiMetrics {
  income: number;
  expense: number;
  netSavings: number;
  savingsRate: number;
  incomeDeltaPct: number | null;
  expenseDeltaPct: number | null;
  netDeltaPct: number | null;
  savingsRateDeltaPts: number | null;
}

export interface CategoryBreakdownItem {
  name: string;
  current: number;
  previous: number;
  sharePct: number;
  deltaPct: number | null;
  color: string;
}

export interface MerchantSummary {
  name: string;
  total: number;
  count: number;
  sharePct: number;
  category: string;
}

export interface AccountFlowSummary {
  id: string;
  name: string;
  color: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface RecurringSplitSummary {
  recurring: number;
  discretionary: number;
  recurringPct: number;
  discretionaryPct: number;
}

function matchesAccount(tx: Transaction, accountId: string): boolean {
  if (!accountId) return true;
  return tx.accountId === accountId;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function buildMonthlySeries(
  transactions: Transaction[],
  currentMonth: string,
  datePeriod: DatePeriod,
  rangeMonths: ReportRangeMonths,
  accountId: string,
): MonthlyCashflowPoint[] {
  const anchor = new Date(currentMonth);
  const nonTransfers = transactions.filter(
    (t) => !isTransferTransaction(t) && matchesAccount(t, accountId),
  );

  const series: MonthlyCashflowPoint[] = [];
  for (let offset = rangeMonths - 1; offset >= 0; offset--) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1, 12);
    const { start, end } = getDateRange(monthDate.toISOString(), datePeriod);

    let income = 0;
    let expense = 0;
    for (const t of nonTransfers) {
      if (!isDateInRange(t.date, start, end)) continue;
      if (t.type === "income") income += t.amount || 0;
      else if (t.type === "expense") expense += t.amount || 0;
    }

    const net = income - expense;
    const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
    const label = monthDate.toLocaleDateString("en-US", {
      month: "short",
      ...(rangeMonths === 12 ? { year: "2-digit" } : {}),
    });

    series.push({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
      label,
      income,
      expense,
      net,
      savingsRate,
      start,
      end,
    });
  }

  return series;
}

export function buildReportsKpis(series: MonthlyCashflowPoint[]): ReportsKpiMetrics {
  const current = series[series.length - 1];
  const prev = series.length >= 2 ? series[series.length - 2] : undefined;

  if (!current) {
    return {
      income: 0,
      expense: 0,
      netSavings: 0,
      savingsRate: 0,
      incomeDeltaPct: null,
      expenseDeltaPct: null,
      netDeltaPct: null,
      savingsRateDeltaPts: null,
    };
  }

  return {
    income: current.income,
    expense: current.expense,
    netSavings: current.net,
    savingsRate: current.savingsRate,
    incomeDeltaPct: prev ? pctDelta(current.income, prev.income) : null,
    expenseDeltaPct: prev ? pctDelta(current.expense, prev.expense) : null,
    netDeltaPct: prev ? pctDelta(current.net, prev.net) : null,
    savingsRateDeltaPts:
      prev && (prev.income > 0 || current.income > 0)
        ? current.savingsRate - prev.savingsRate
        : null,
  };
}

export function buildCategoryBreakdown(
  transactions: Transaction[],
  currentStart: Date,
  currentEnd: Date,
  prevStart: Date,
  prevEnd: Date,
  accountId: string,
): CategoryBreakdownItem[] {
  const map = new Map<
    string,
    { name: string; current: number; previous: number; color?: string }
  >();

  for (const t of transactions) {
    if (t.type !== "expense" || isTransferTransaction(t) || !matchesAccount(t, accountId)) {
      continue;
    }
    const inCurrent = isDateInRange(t.date, currentStart, currentEnd);
    const inPrev = isDateInRange(t.date, prevStart, prevEnd);
    if (!inCurrent && !inPrev) continue;

    const name = t.category?.trim() || "Uncategorized";
    const key = name.toLowerCase();
    const existing = map.get(key) ?? {
      name,
      current: 0,
      previous: 0,
      color: t.categoryColor,
    };
    if (inCurrent) existing.current += t.amount || 0;
    if (inPrev) existing.previous += t.amount || 0;
    if (!existing.color && t.categoryColor) existing.color = t.categoryColor;
    map.set(key, existing);
  }

  const items = Array.from(map.values()).sort(
    (a, b) => b.current - a.current || b.previous - a.previous || a.name.localeCompare(b.name),
  );
  const totalCurrent = items.reduce((sum, i) => sum + i.current, 0);

  return items.map((item, idx) => ({
    name: item.name,
    current: item.current,
    previous: item.previous,
    sharePct: totalCurrent > 0 ? Math.round((item.current / totalCurrent) * 100) : 0,
    deltaPct: pctDelta(item.current, item.previous),
    color: item.color || CHART_PALETTE[idx % CHART_PALETTE.length],
  }));
}

export function buildTopMerchants(
  transactions: Transaction[],
  start: Date,
  end: Date,
  accountId: string,
  limit = 6,
): MerchantSummary[] {
  const map = new Map<
    string,
    { name: string; total: number; count: number; category: string }
  >();

  let periodExpenseTotal = 0;
  for (const t of transactions) {
    if (
      t.type !== "expense" ||
      isTransferTransaction(t) ||
      !matchesAccount(t, accountId) ||
      !isDateInRange(t.date, start, end)
    ) {
      continue;
    }

    const amount = t.amount || 0;
    periodExpenseTotal += amount;
    const rawName = t.name?.trim() || t.category || "Expense";
    const key = rawName.toLowerCase();
    const existing = map.get(key) ?? {
      name: rawName,
      total: 0,
      count: 0,
      category: t.category || "General",
    };
    existing.total += amount;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit)
    .map((m) => ({
      ...m,
      sharePct: periodExpenseTotal > 0 ? Math.round((m.total / periodExpenseTotal) * 100) : 0,
    }));
}

export function buildAccountFlow(
  accounts: Account[],
  transactions: Transaction[],
  start: Date,
  end: Date,
): AccountFlowSummary[] {
  const map = new Map<string, AccountFlowSummary>();
  const nameToId = new Map<string, string>();

  for (const acc of accounts) {
    map.set(acc.id, {
      id: acc.id,
      name: acc.name,
      color: acc.color || "#1a4d2e",
      inflow: 0,
      outflow: 0,
      net: 0,
    });
    nameToId.set(acc.name.trim().toLowerCase(), acc.id);
  }

  for (const t of transactions) {
    if (isTransferTransaction(t) || !isDateInRange(t.date, start, end)) continue;

    let targetId = t.accountId && map.has(t.accountId) ? t.accountId : undefined;
    if (!targetId && t.accountName) {
      targetId = nameToId.get(t.accountName.trim().toLowerCase());
    }
    if (!targetId) continue;

    const entry = map.get(targetId);
    if (!entry) continue;
    const amount = t.amount || 0;
    if (t.type === "income") entry.inflow += amount;
    else if (t.type === "expense") entry.outflow += amount;
    entry.net = entry.inflow - entry.outflow;
  }

  return Array.from(map.values()).sort(
    (a, b) => Math.abs(b.net) - Math.abs(a.net) || b.outflow - a.outflow,
  );
}

export function buildRecurringSplit(
  transactions: Transaction[],
  start: Date,
  end: Date,
  accountId: string,
): RecurringSplitSummary {
  let recurring = 0;
  let discretionary = 0;

  for (const t of transactions) {
    if (
      t.type !== "expense" ||
      isTransferTransaction(t) ||
      !matchesAccount(t, accountId) ||
      !isDateInRange(t.date, start, end)
    ) {
      continue;
    }
    if (t.isRecurring) recurring += t.amount || 0;
    else discretionary += t.amount || 0;
  }

  const total = recurring + discretionary;
  return {
    recurring,
    discretionary,
    recurringPct: total > 0 ? Math.round((recurring / total) * 100) : 0,
    discretionaryPct: total > 0 ? Math.round((discretionary / total) * 100) : 0,
  };
}
