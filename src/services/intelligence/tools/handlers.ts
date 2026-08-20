import {
  getAccounts,
  getCategories,
  getTransactions,
  addTransaction,
  addTransfer,
} from "../../../data/expenseData";
import { getPortfolios, getPortfolioHoldings } from "../../../data/portfolioData";
import type { UserContext } from "../../../lib/userContext";
import type {
  PendingAction,
  ToolExecutionOutcome,
} from "../../../types/intelligence";
import { formatRupiah } from "../../../utils/format";

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveAccountId(
  ctx: UserContext,
  accountId?: unknown,
  accountName?: unknown,
): string | null {
  if (typeof accountId === "string" && accountId) return accountId;
  if (typeof accountName === "string" && accountName) {
    const match = ctx.accounts.find(
      (a) => a.name.toLowerCase() === accountName.toLowerCase(),
    );
    return match?.id ?? null;
  }
  return ctx.selectedAccountId;
}

function resolveCategoryId(
  ctx: UserContext,
  categoryId?: unknown,
  categoryName?: unknown,
): string | null {
  if (typeof categoryId === "string" && categoryId) return categoryId;
  if (typeof categoryName === "string" && categoryName) {
    const match = ctx.categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    return match?.id ?? null;
  }
  return null;
}

function resolvePortfolioId(
  ctx: UserContext,
  portfolioId?: unknown,
  portfolioName?: unknown,
): string | null {
  if (typeof portfolioId === "string" && portfolioId) {
    return ctx.portfolios.some((p) => p.id === portfolioId) ? portfolioId : null;
  }
  if (typeof portfolioName === "string" && portfolioName) {
    const match = ctx.portfolios.find(
      (p) => p.name.toLowerCase() === portfolioName.toLowerCase(),
    );
    return match?.id ?? null;
  }
  return ctx.activePortfolioId;
}

function filterTransactions(
  transactions: Awaited<ReturnType<typeof getTransactions>>,
  args: Record<string, unknown>,
  ctx: UserContext,
) {
  let result = transactions;

  const accountId = resolveAccountId(ctx, args.account_id, args.account_name);
  if (accountId) {
    const account = ctx.accounts.find((a) => a.id === accountId);
    if (account) {
      result = result.filter((t) => t.accountName === account.name);
    }
  }

  if (typeof args.category === "string" && args.category) {
    const cat = args.category.toLowerCase();
    result = result.filter((t) => t.category?.toLowerCase() === cat);
  }

  if (args.type === "expense" || args.type === "income") {
    result = result.filter((t) => t.type === args.type);
  }

  if (typeof args.date_from === "string" && args.date_from) {
    const from = new Date(args.date_from).getTime();
    result = result.filter((t) => new Date(t.date).getTime() >= from);
  }

  if (typeof args.date_to === "string" && args.date_to) {
    const to = new Date(args.date_to).getTime();
    result = result.filter((t) => new Date(t.date).getTime() <= to);
  }

  const limit =
    typeof args.limit === "number" ? Math.min(Math.max(args.limit, 1), 50) : 20;
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

export async function executeTool(
  toolName: string,
  rawArgs: string,
  ctx: UserContext,
  toolCallId: string,
): Promise<ToolExecutionOutcome> {
  const args = parseArgs(rawArgs);

  switch (toolName) {
    case "list_accounts": {
      const accounts = await getAccounts();
      const scoped = accounts
        .filter((a) => !a.user_id || a.user_id === ctx.userId)
        .map((a) => ({ id: a.id, name: a.name, color: a.color }));
      return { kind: "result", data: scoped };
    }

    case "list_categories": {
      const categories = await getCategories();
      return {
        kind: "result",
        data: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
      };
    }

    case "list_transactions": {
      const transactions = await getTransactions();
      return {
        kind: "result",
        data: filterTransactions(transactions, args, ctx),
      };
    }

    case "spending_summary": {
      const transactions = await getTransactions();
      const filtered = filterTransactions(
        transactions.filter((t) => t.type === "expense"),
        args,
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

    case "list_portfolios": {
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

    case "get_portfolio_holdings": {
      const portfolioId = resolvePortfolioId(
        ctx,
        args.portfolio_id,
        args.portfolio_name,
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

    case "get_budgets_and_goals": {
      return {
        kind: "result",
        data: { budgets: ctx.budgets, goals: ctx.goals },
      };
    }

    case "propose_add_transaction": {
      const accountId = resolveAccountId(ctx, args.account_id, args.account_name);
      const categoryId = resolveCategoryId(ctx, args.category_id, args.category_name);
      const name = typeof args.name === "string" ? args.name : "";
      const amount = typeof args.amount === "number" ? args.amount : 0;
      const type = args.type === "income" ? "income" : "expense";

      if (!name || amount <= 0) {
        return { kind: "result", data: { error: "Invalid name or amount" } };
      }
      if (!accountId) {
        return { kind: "result", data: { error: "Account not found" } };
      }
      if (!categoryId) {
        return { kind: "result", data: { error: "Category not found" } };
      }

      const account = ctx.accounts.find((a) => a.id === accountId);
      const category = ctx.categories.find((c) => c.id === categoryId);
      const note = typeof args.note === "string" ? args.note : undefined;
      const isRecurring = args.is_recurring === true;

      const pendingAction: PendingAction = {
        id: crypto.randomUUID(),
        toolCallId,
        toolName,
        title: `Add ${type}: ${name}`,
        description: `${formatRupiah(amount)} · ${category?.name} · ${account?.name}`,
        args: { name, amount, type, accountId, categoryId, note, isRecurring },
        execute: async () => {
          return addTransaction({
            accountId,
            userId: ctx.userId,
            name,
            type,
            amount,
            categoryId,
            note,
            isRecurring,
          });
        },
      };

      return { kind: "pending", pendingAction };
    }

    case "propose_add_transfer": {
      const fromAccountId = resolveAccountId(
        ctx,
        args.from_account_id,
        args.from_account_name,
      );
      const toAccountId = resolveAccountId(
        ctx,
        args.to_account_id,
        args.to_account_name,
      );
      const amount = typeof args.amount === "number" ? args.amount : 0;
      const note = typeof args.note === "string" ? args.note : undefined;

      if (!fromAccountId || !toAccountId) {
        return { kind: "result", data: { error: "Source or destination account not found" } };
      }
      if (fromAccountId === toAccountId) {
        return { kind: "result", data: { error: "Accounts must be different" } };
      }
      if (amount <= 0) {
        return { kind: "result", data: { error: "Invalid amount" } };
      }

      const fromAccount = ctx.accounts.find((a) => a.id === fromAccountId);
      const toAccount = ctx.accounts.find((a) => a.id === toAccountId);

      const pendingAction: PendingAction = {
        id: crypto.randomUUID(),
        toolCallId,
        toolName,
        title: "Transfer between accounts",
        description: `${formatRupiah(amount)} · ${fromAccount?.name} → ${toAccount?.name}`,
        args: { fromAccountId, toAccountId, amount, note },
        execute: async () => {
          return addTransfer({
            fromAccountId,
            toAccountId,
            amount,
            note,
            userId: ctx.userId,
          });
        },
      };

      return { kind: "pending", pendingAction };
    }

    default:
      return { kind: "result", data: { error: `Unknown tool: ${toolName}` } };
  }
}
