import { addTransfer } from "../../../data/expenseData";
import type { UserContext } from "../../../lib/userContext";
import { validateToolArgs } from "../../../lib/validation";
import type {
  PendingBatchTransactionAction,
  PendingTransferAction,
  ToolExecutionOutcome,
  TransactionDraft,
} from "../../../types/intelligence";
import { formatRupiah } from "../../../utils/format";
import {
  getCurrentDateInJakarta,
  normalizeDraft,
  normalizeEntryKind,
  resolveAccountId,
  resolveCategoryId,
  sanitizeAmount,
  sanitizeIsoDate,
  sanitizeText,
} from "./draftNormalizer";

export function handleProposeAddTransaction(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
  toolCallId: string,
): ToolExecutionOutcome {
  const validated = validateToolArgs("propose_add_transaction", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }
  const defaultDate = getCurrentDateInJakarta();
  const draft = normalizeDraft(validated.data, ctx, defaultDate, null, toolCallId);

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

export function handleProposeAddTransactions(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
  toolCallId: string,
): ToolExecutionOutcome {
  const validated = validateToolArgs("propose_add_transactions", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }

  const args = validated.data;
  const rawList = args.transactions;
  const defaultDate = sanitizeIsoDate(args.date, getCurrentDateInJakarta());

  // Identify largest positive item category as fallback for discounts
  let fallbackCategoryId: string | null = null;
  let highestAmount = -1;
  for (const rawItem of rawList) {
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

  const drafts: TransactionDraft[] = rawList.map((rawItem) =>
    normalizeDraft(rawItem, ctx, defaultDate, fallbackCategoryId, toolCallId),
  );

  const merchant = sanitizeText(args.merchant, 100) || undefined;
  const receiptTotal =
    typeof args.receipt_total === "number" && args.receipt_total > 0
      ? args.receipt_total
      : undefined;
  const ocrConfidence =
    typeof args.ocr_confidence === "number" ? args.ocr_confidence : undefined;
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

export function handleProposeAddTransfer(
  rawParsed: Record<string, unknown>,
  ctx: UserContext,
  toolCallId: string,
  toolName: string,
): ToolExecutionOutcome {
  const validated = validateToolArgs("propose_add_transfer", rawParsed);
  if (!validated.success) {
    return { kind: "result", data: { error: validated.error } };
  }

  const args = validated.data;
  const fromAccountId = resolveAccountId(ctx, args.from_account_id, args.from_account_name);
  const toAccountId = resolveAccountId(ctx, args.to_account_id, args.to_account_name);
  const amount = sanitizeAmount(args.amount);
  const note = sanitizeText(args.note, 255) || undefined;

  if (!fromAccountId || !toAccountId) {
    return {
      kind: "result",
      data: { error: "Source or destination account not found or access denied." },
    };
  }
  if (fromAccountId === toAccountId) {
    return {
      kind: "result",
      data: { error: "Source and destination accounts must be different." },
    };
  }
  if (amount === null) {
    return {
      kind: "result",
      data: { error: "Invalid transfer amount. Must be a positive finite number." },
    };
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
    execute: async () =>
      addTransfer({
        fromAccountId,
        toAccountId,
        amount,
        note,
        userId: ctx.userId,
      }),
  };

  return { kind: "pending", pendingAction };
}
