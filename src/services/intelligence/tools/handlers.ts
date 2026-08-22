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

const MAX_TRANSACTION_AMOUNT = 100_000_000_000; // 100 Billion IDR
const MAX_STRING_LENGTH = 255;

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    // Prevent prototype pollution
    Reflect.deleteProperty(parsed, "__proto__");
    Reflect.deleteProperty(parsed, "constructor");
    Reflect.deleteProperty(parsed, "prototype");
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sanitizeAmount(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || isNaN(value) || value <= 0 || value > MAX_TRANSACTION_AMOUNT) {
      return null;
    }
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (!Number.isFinite(parsed) || isNaN(parsed) || parsed <= 0 || parsed > MAX_TRANSACTION_AMOUNT) {
      return null;
    }
    return Math.round(parsed * 100) / 100;
  }
  return null;
}

function sanitizeText(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  // Strip control chars and trim
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLength);
}

function parseValidDate(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function resolveAccountId(
  ctx: UserContext,
  accountId?: unknown,
  accountName?: unknown,
): string | null {
  const cleanId = typeof accountId === "string" ? accountId.trim() : null;
  if (cleanId) {
    const match = ctx.accounts.find((a) => a.id === cleanId);
    if (match) return match.id;
  }

  const cleanName = typeof accountName === "string" ? accountName.trim().toLowerCase() : null;
  if (cleanName) {
    const match = ctx.accounts.find(
      (a) => a.name.trim().toLowerCase() === cleanName,
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
  const cleanId = typeof categoryId === "string" ? categoryId.trim() : null;
  if (cleanId) {
    const match = ctx.categories.find((c) => c.id === cleanId);
    if (match) return match.id;
  }

  const cleanName = typeof categoryName === "string" ? categoryName.trim().toLowerCase() : null;
  if (cleanName) {
    const match = ctx.categories.find(
      (c) => c.name.trim().toLowerCase() === cleanName,
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
  const cleanId = typeof portfolioId === "string" ? portfolioId.trim() : null;
  if (cleanId) {
    const match = ctx.portfolios.find((p) => p.id === cleanId);
    if (match) return match.id;
  }

  const cleanName = typeof portfolioName === "string" ? portfolioName.trim().toLowerCase() : null;
  if (cleanName) {
    const match = ctx.portfolios.find(
      (p) => p.name.trim().toLowerCase() === cleanName,
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
  // Only expose transactions associated with user's scoped accounts
  const allowedAccountNames = new Set(ctx.accounts.map((a) => a.name.toLowerCase()));
  let result = transactions.filter(
    (t) => t.accountName && allowedAccountNames.has(t.accountName.toLowerCase()),
  );

  const accountId = resolveAccountId(ctx, args.account_id, args.account_name);
  if (accountId) {
    const account = ctx.accounts.find((a) => a.id === accountId);
    if (account) {
      result = result.filter(
        (t) => t.accountName?.toLowerCase() === account.name.toLowerCase(),
      );
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
      const name = sanitizeText(args.name, 100);
      const amount = sanitizeAmount(args.amount);
      const rawType = typeof args.type === "string" ? args.type.trim().toLowerCase() : "";
      const type = rawType === "income" ? "income" : rawType === "expense" ? "expense" : null;

      if (!name || name.length < 1) {
        return { kind: "result", data: { error: "A valid transaction description is required (1-100 chars)." } };
      }
      if (amount === null) {
        return { kind: "result", data: { error: "Invalid amount. Must be a positive finite number up to 100B IDR." } };
      }
      if (!type) {
        return { kind: "result", data: { error: "Invalid transaction type. Must be 'expense' or 'income'." } };
      }

      const accountId = resolveAccountId(ctx, args.account_id, args.account_name);
      const categoryId = resolveCategoryId(ctx, args.category_id, args.category_name);

      if (!accountId) {
        return { kind: "result", data: { error: "Account not found or access denied." } };
      }
      if (!categoryId) {
        return { kind: "result", data: { error: "Category not found or access denied." } };
      }

      const account = ctx.accounts.find((a) => a.id === accountId);
      const category = ctx.categories.find((c) => c.id === categoryId);
      const note = sanitizeText(args.note, 255) || undefined;
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
      const amount = sanitizeAmount(args.amount);
      const note = sanitizeText(args.note, 255) || undefined;

      if (!fromAccountId || !toAccountId) {
        return { kind: "result", data: { error: "Source or destination account not found or access denied." } };
      }
      if (fromAccountId === toAccountId) {
        return { kind: "result", data: { error: "Source and destination accounts must be different." } };
      }
      if (amount === null) {
        return { kind: "result", data: { error: "Invalid transfer amount. Must be a positive finite number." } };
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
