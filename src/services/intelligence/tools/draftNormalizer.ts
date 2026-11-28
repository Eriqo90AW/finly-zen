import type { UserContext } from "../../../lib/userContext";
import { MAX_TRANSACTION_AMOUNT } from "../../../lib/validation";
import type { EntryKind, TransactionDraft } from "../../../types/intelligence";

const MAX_STRING_LENGTH = 255;

export function getCurrentDateInJakarta(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
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
    if (!Number.isFinite(value) || value <= 0 || value > MAX_TRANSACTION_AMOUNT) {
      return null;
    }
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_TRANSACTION_AMOUNT) {
      return null;
    }
    return Math.round(parsed * 100) / 100;
  }
  return null;
}

function stripControlCharacters(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x20 && code !== 0x7f) {
      result += input[i];
    }
  }
  return result;
}

export function sanitizeText(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return stripControlCharacters(value).trim().slice(0, maxLength);
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const time = new Date(`${clean}T00:00:00Z`).getTime();
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
    const match = ctx.accounts.find((a) => a.name.trim().toLowerCase() === cleanName);
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
    const match = ctx.categories.find((c) => c.name.trim().toLowerCase() === cleanName);
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
    const match = ctx.portfolios.find((p) => p.name.trim().toLowerCase() === cleanName);
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
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `draft-${Math.random().toString(36).slice(2, 9)}`);

  const entryKind = normalizeEntryKind(raw.entry_kind ?? raw.entryKind);
  const rawType = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";

  const type: "expense" | "income" =
    entryKind === "discount" ? "income" : rawType === "income" ? "income" : "expense";

  let rawAmount = raw.amount;
  if (typeof rawAmount === "number") {
    rawAmount = Math.abs(rawAmount);
  } else if (typeof rawAmount === "string") {
    rawAmount = Math.abs(Number.parseFloat(rawAmount.replace(/[^0-9.-]+/g, "") || "0"));
  }
  const amount = sanitizeAmount(rawAmount);

  const name = sanitizeText(raw.name, 100);
  const note = sanitizeText(raw.note, 255) || undefined;
  const isRecurring = raw.is_recurring === true || raw.isRecurring === true;
  const date = sanitizeIsoDate(raw.date, defaultDate);

  const resolvedAccountId = resolveAccountId(
    ctx,
    raw.account_id ?? raw.accountId,
    raw.account_name ?? raw.accountName,
  );
  const resolvedAccount = resolvedAccountId
    ? ctx.accounts.find((a) => a.id === resolvedAccountId)
    : null;

  let resolvedCatId = resolveCategoryId(
    ctx,
    raw.category_id ?? raw.categoryId,
    raw.category_name ?? raw.categoryName,
  );
  if (!resolvedCatId && entryKind === "discount" && fallbackCategoryId) {
    resolvedCatId = fallbackCategoryId;
  }
  const resolvedCategory = resolvedCatId
    ? ctx.categories.find((c) => c.id === resolvedCatId)
    : null;

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
    name:
      name ||
      (entryKind === "discount"
        ? "Discount"
        : entryKind === "tax"
          ? "Tax"
          : entryKind === "service"
            ? "Service Charge"
            : "Transaction"),
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
