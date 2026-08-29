import {
  getAccounts,
  getCategories,
  getTransactions,
  addTransfer,
} from "../../../data/expenseData";
import { getPortfolios, getPortfolioHoldings } from "../../../data/portfolioData";
import type { UserContext } from "../../../lib/userContext";
import type {
  EntryKind,
  PendingAction,
  PendingBatchTransactionAction,
  PendingTransferAction,
  ToolExecutionOutcome,
  TransactionDraft,
} from "../../../types/intelligence";
import { formatRupiah } from "../../../utils/format";

const MAX_TRANSACTION_AMOUNT = 100_000_000_000; // 100 Billion IDR
const MAX_STRING_LENGTH = 255;
const MAX_BATCH_SIZE = 25;

export function getCurrentDateInJakarta(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // "YYYY-MM-DD"
}

export function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    Reflect.deleteProperty(parsed, "__proto__");
    Reflect.deleteProperty(parsed, "constructor");
    Reflect.deleteProperty(parsed, "prototype");
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function sanitizeAmount(value: unknown): number | null {
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

export function sanitizeText(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLength);
}

export function parseValidDate(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function sanitizeIsoDate(value: unknown, fallbackDate?: string): string {
  const defaultDate = fallbackDate || getCurrentDateInJakarta();
  if (typeof value !== "string" || !value.trim()) return defaultDate;
  const clean = value.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const time = new Date(clean + "T00:00:00Z").getTime();
    if (!Number.isNaN(time)) return clean;
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(parsed);
    } catch {
      return defaultDate;
    }
  }

  return defaultDate;
}

export function resolveAccountId(
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
    if (match) return match.id;
  }

  if (ctx.selectedAccountId) {
    const match = ctx.accounts.find((a) => a.id === ctx.selectedAccountId);
    if (match) return match.id;
  }

  if (ctx.accounts.length === 1) {
    return ctx.accounts[0].id;
  }

  return null;
}

export function resolveCategoryId(
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

export function resolvePortfolioId(
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

export function normalizeEntryKind(raw: unknown): EntryKind {
  if (typeof raw !== "string") return "item";
  const lower = raw.trim().toLowerCase();
  if (lower === "tax") return "tax";
  if (lower === "service" || lower === "service_charge" || lower === "charge") return "service";
  if (lower === "discount" || lower === "voucher" || lower === "promo") return "discount";
  if (lower === "adjustment") return "adjustment";
  return "item";
}

export function normalizeDraft(
  raw: Record<string, unknown>,
  ctx: UserContext,
  defaultDate: string,
  fallbackCategoryId?: string | null,
  toolCallId?: string,
): TransactionDraft {
  const id =
    (typeof raw.id === "string" && raw.id.trim()) ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `draft-${Math.random().toString(36).slice(2, 9)}`);

  const entryKind = normalizeEntryKind(raw.entry_kind ?? raw.entryKind);
  const rawType = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";

  // Discounts are always treated as income
  const type: "expense" | "income" =
    entryKind === "discount" ? "income" : rawType === "income" ? "income" : "expense";

  // Sanitize amount (always positive)
  let rawAmount = raw.amount;
  if (typeof rawAmount === "number") {
    rawAmount = Math.abs(rawAmount);
  } else if (typeof rawAmount === "string") {
    rawAmount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.-]+/g, "") || "0"));
  }
  const amount = sanitizeAmount(rawAmount);

  const name = sanitizeText(raw.name, 100);
  const note = sanitizeText(raw.note, 255) || undefined;
  const isRecurring = raw.is_recurring === true || raw.isRecurring === true;
  const date = sanitizeIsoDate(raw.date, defaultDate);

  const resolvedAccountId = resolveAccountId(ctx, raw.account_id ?? raw.accountId, raw.account_name ?? raw.accountName);
  const resolvedAccount = resolvedAccountId ? ctx.accounts.find((a) => a.id === resolvedAccountId) : null;

  let resolvedCatId = resolveCategoryId(ctx, raw.category_id ?? raw.categoryId, raw.category_name ?? raw.categoryName);
  if (!resolvedCatId && entryKind === "discount" && fallbackCategoryId) {
    resolvedCatId = fallbackCategoryId;
  }
  const resolvedCategory = resolvedCatId ? ctx.categories.find((c) => c.id === resolvedCatId) : null;

  const errors: Record<string, string> = {};
  if (!name || name.length < 1) {
    errors.name = "Description is required";
  }
  if (amount === null || amount <= 0) {
    errors.amount = "Valid positive amount is required";
  }
  if (!resolvedAccountId) {
    errors.accountId = "Account must be selected";
  }
  if (!resolvedCatId) {
    errors.categoryId = "Category must be selected";
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    id,
    name: name || (entryKind === "discount" ? "Discount" : entryKind === "tax" ? "Tax" : entryKind === "service" ? "Service Charge" : "Transaction"),
    amount: amount ?? 0,
    type,
    entryKind,
    accountId: resolvedAccountId,
    accountName: resolvedAccount?.name,
    categoryId: resolvedCatId,
    categoryName: resolvedCategory?.name,
    note,
    isRecurring,
    date,
    status: isValid ? "ready" : "invalid",
    selected: isValid,
    errors: isValid ? undefined : errors,
    toolCallId,
  };
}

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
      const defaultDate = getCurrentDateInJakarta();
      const draft = normalizeDraft(args, ctx, defaultDate, null, toolCallId);

      const pendingAction: PendingBatchTransactionAction = {
        id: crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}`,
        kind: "transaction-batch",
        toolCallId,
        toolCallIds: [toolCallId],
        toolName: "propose_add_transaction",
        source: "chat",
        merchant: undefined,
        drafts: [draft],
        originatingProfile: ctx.currentPage.model || "finly",
        originatingPath: ctx.currentPage.path,
        createdAt: Date.now(),
      };

      return { kind: "pending", pendingAction };
    }

    case "propose_add_transactions": {
      const rawList = args.transactions;
      if (!Array.isArray(rawList) || rawList.length === 0) {
        return {
          kind: "result",
          data: { error: "At least 1 transaction draft is required." },
        };
      }

      if (rawList.length > MAX_BATCH_SIZE) {
        return {
          kind: "result",
          data: {
            error: `Batch exceeds the 25-transaction limit (${rawList.length} items submitted). Please split the request into smaller batches.`,
          },
        };
      }

      const defaultDate = sanitizeIsoDate(args.date, getCurrentDateInJakarta());

      // Identify largest positive item category as fallback for discounts
      let fallbackCategoryId: string | null = null;
      let highestAmount = -1;
      for (const item of rawList) {
        if (typeof item === "object" && item !== null) {
          const rawItem = item as Record<string, unknown>;
          const kind = normalizeEntryKind(rawItem.entry_kind ?? rawItem.entryKind);
          if (kind === "item" || !rawItem.entry_kind) {
            const amt = sanitizeAmount(rawItem.amount);
            if (amt !== null && amt > highestAmount) {
              const catId = resolveCategoryId(ctx, rawItem.category_id, rawItem.category_name);
              if (catId) {
                highestAmount = amt;
                fallbackCategoryId = catId;
              }
            }
          }
        }
      }

      const drafts: TransactionDraft[] = rawList.map((item) => {
        const rawItem = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        return normalizeDraft(rawItem, ctx, defaultDate, fallbackCategoryId, toolCallId);
      });

      const merchant = sanitizeText(args.merchant, 100) || undefined;
      const receiptTotal = typeof args.receipt_total === "number" && args.receipt_total > 0 ? args.receipt_total : undefined;
      const ocrConfidence = typeof args.ocr_confidence === "number" ? args.ocr_confidence : undefined;
      const source = args.source === "ocr" ? "ocr" : "chat";

      const pendingAction: PendingBatchTransactionAction = {
        id: crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}`,
        kind: "transaction-batch",
        toolCallId,
        toolCallIds: [toolCallId],
        toolName: "propose_add_transactions",
        source,
        merchant,
        receiptTotal,
        ocrConfidence,
        drafts,
        originatingProfile: ctx.currentPage.model || "finly",
        originatingPath: ctx.currentPage.path,
        createdAt: Date.now(),
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

      const pendingAction: PendingTransferAction = {
        id: crypto.randomUUID ? crypto.randomUUID() : `transfer-${Date.now()}`,
        kind: "transfer",
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

