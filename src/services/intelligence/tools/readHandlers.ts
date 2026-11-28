import {
  getAccountsWithBalances,
  getCategories,
  getTransactions,
} from "../../../data/expenseData";
import { getPortfolioHoldings, getPortfolios } from "../../../data/portfolioData";
import type { UserContext } from "../../../lib/userContext";
import { validateToolArgs } from "../../../lib/validation";
import type { ToolExecutionOutcome } from "../../../types/intelligence";
import {
  parseValidDate,
  resolveAccountId,
  resolvePortfolioId,
} from "./draftNormalizer";

function filterTransactions(
  transactions: Awaited<ReturnType<typeof getTransactions>>,
  args: Record<string, unknown>,
  ctx: UserContext,
) {
  const allowedAccountNames = new Set(ctx.accounts.map((a) => a.name.toLowerCase()));
  let result = transactions.filter(
    (t) => t.accountName && allowedAccountNames.has(t.accountName.toLowerCase()),
  );

  const accountId = resolveAccountId(ctx, args.account_id, args.account_name);
  if (accountId) {
    const account = ctx.accounts.find((a) => a.id === accountId);
    if (account) {
      result = result.filter((t) => t.accountName?.toLowerCase() === account.name.toLowerCase());
    }
  }

  if (typeof args.category === "string" && args.category.trim()) {
    const cat = args.category.trim().toLowerCase();
    result = result.filter((t) => t.category?.toLowerCase() === cat);
  }

  if (args.type === "expense" || args.type === "income") {
    result = result.filter((t) => t.type === args.type);
  }

  const fromTime = parseValidDate(args.date_from);
  if (fromTime !== null) {
    result = result.filter((t) => new Date(t.date).getTime() >= fromTime);
  }

  const toTime = parseValidDate(args.date_to);
  if (toTime !== null) {
    result = result.filter((t) => new Date(t.date).getTime() <= toTime);
  }

  const rawLimit = typeof args.limit === "number" ? args.limit : 20;
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 20, 1), 50);

  return result.slice(0, limit).map((t) => ({
    id: t.id,
    name: t.name,
    amount: t.amount,
    category: t.category,
    account: t.accountName,
    type: t.type,
    date: t.date,
    note: t.note,
  }));
}

export async function handleListAccounts(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("list_accounts", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const accounts = await getAccountsWithBalances(ctx.userId);
  const scoped = accounts
    .filter((a) => !a.user_id || a.user_id === ctx.userId)
    .map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      balance: a.balance ?? 0,
      balance_idr: a.balance ?? 0,
    }));
  return { kind: "result", data: scoped };
}

export async function handleListCategories(
  rawParsed: Record<string, unknown>,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("list_categories", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const categories = await getCategories();
  return {
    kind: "result",
    data: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
  };
}

export async function handleListTransactions(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("list_transactions", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const transactions = await getTransactions();
  return {
    kind: "result",
    data: filterTransactions(transactions, validated.data, ctx),
  };
}

export async function handleSpendingSummary(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("spending_summary", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const transactions = await getTransactions();
  const filtered = filterTransactions(
    transactions.filter((t) => t.type === "expense"),
    validated.data,
    ctx,
  );
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const t of filtered) {
    const cat = t.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    total += t.amount;
  }
  return {
    kind: "result",
    data: {
      total,
      by_category: Object.entries(byCategory)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      transaction_count: filtered.length,
    },
  };
}

export async function handleListPortfolios(
  rawParsed: Record<string, unknown>,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("list_portfolios", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const portfolios = await getPortfolios();
  return {
    kind: "result",
    data: portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      base_currency: p.base_currency,
    })),
  };
}

export async function handleGetPortfolioHoldings(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
): Promise<ToolExecutionOutcome> {
  const validated = validateToolArgs("get_portfolio_holdings", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const portfolioId = resolvePortfolioId(
    ctx,
    validated.data.portfolio_id,
    validated.data.portfolio_name,
  );
  if (!portfolioId) {
    return { kind: "result", data: { error: "Portfolio not found" } };
  }
  if (!ctx.portfolios.some((p) => p.id === portfolioId)) {
    return { kind: "result", data: { error: "Portfolio access denied" } };
  }
  const holdings = await getPortfolioHoldings(portfolioId);
  return {
    kind: "result",
    data: holdings.map((h) => ({
      asset: h.asset,
      category: h.category,
      quantity: h.quantity,
      current_value_base: h.current_value_base,
      pnl: h.pnl,
      allocation: h.allocation,
    })),
  };
}

export function handleGetBudgetsAndGoals(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
): ToolExecutionOutcome {
  const validated = validateToolArgs("get_budgets_and_goals", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  return {
    kind: "result",
    data: { budgets: ctx.budgets, goals: ctx.goals },
  };
}
