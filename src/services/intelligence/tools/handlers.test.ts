import { describe, it, expect } from "vitest";
import {
  executeTool,
  normalizeDraft,
  normalizeEntryKind,
  resolveAccountId,
  resolveCategoryId,
  sanitizeAmount,
  sanitizeIsoDate,
} from "./handlers";
import type { UserContext } from "../../../lib/userContext";
import type { PendingBatchTransactionAction } from "../../../types/intelligence";

const mockUserContext: UserContext = {
  userId: "user-123",
  userName: "Eriqo",
  accounts: [
    { id: "acc-1", name: "BCA Main" },
    { id: "acc-2", name: "Bank Jago" },
  ],
  portfolios: [],
  categories: [
    { id: "cat-1", name: "Food & Dining" },
    { id: "cat-2", name: "Bills & Utilities" },
    { id: "cat-3", name: "Shopping" },
  ],
  selectedAccountName: "BCA Main",
  selectedAccountId: "acc-1",
  activePortfolioId: null,
  activePortfolioName: null,
  budgets: [],
  goals: [],
  currentPage: {
    name: "Dashboard",
    path: "/",
    focus: "Overview",
    assistantName: "Finly",
    assistantRole: "Financial Assistant",
    model: "finly",
    suggestedQuestions: [],
  },
};

describe("Tool Handlers and Batch Normalization", () => {
  describe("sanitizeAmount", () => {
    it("accepts valid positive numbers and strings", () => {
      expect(sanitizeAmount(50000)).toBe(50000);
      expect(sanitizeAmount("Rp 75,000")).toBe(75000);
      expect(sanitizeAmount(1234.56)).toBe(1234.56);
    });

    it("rejects non-positive, NaN, infinite, and out-of-bound values", () => {
      expect(sanitizeAmount(0)).toBeNull();
      expect(sanitizeAmount(-1000)).toBeNull();
      expect(sanitizeAmount("invalid")).toBeNull();
      expect(sanitizeAmount(200_000_000_000)).toBeNull(); // Above 100B
    });
  });

  describe("normalizeEntryKind", () => {
    it("maps tax, service, discount, and adjustment variants", () => {
      expect(normalizeEntryKind("tax")).toBe("tax");
      expect(normalizeEntryKind("service_charge")).toBe("service");
      expect(normalizeEntryKind("service")).toBe("service");
      expect(normalizeEntryKind("discount")).toBe("discount");
      expect(normalizeEntryKind("voucher")).toBe("discount");
      expect(normalizeEntryKind("adjustment")).toBe("adjustment");
      expect(normalizeEntryKind("unknown")).toBe("item");
      expect(normalizeEntryKind(undefined)).toBe("item");
    });
  });

  describe("Account and Category Resolution", () => {
    it("resolves account case-insensitively and by ID", () => {
      expect(resolveAccountId(mockUserContext, "acc-2")).toBe("acc-2");
      expect(resolveAccountId(mockUserContext, undefined, "bank jago")).toBe("acc-2");
      expect(resolveAccountId(mockUserContext, undefined, "BCA MAIN")).toBe("acc-1");
    });

    it("falls back to selectedAccountId when account is not specified", () => {
      expect(resolveAccountId(mockUserContext)).toBe("acc-1");
    });

    it("leaves account null if ambiguous and no selected account", () => {
      const unselectedCtx: UserContext = {
        ...mockUserContext,
        selectedAccountId: null,
        selectedAccountName: null,
      };
      expect(resolveAccountId(unselectedCtx, undefined, "Non-existent")).toBeNull();
    });

    it("resolves category case-insensitively and by ID", () => {
      expect(resolveCategoryId(mockUserContext, "cat-2")).toBe("cat-2");
      expect(resolveCategoryId(mockUserContext, undefined, "food & dining")).toBe("cat-1");
      expect(resolveCategoryId(mockUserContext, undefined, "SHOPPING")).toBe("cat-3");
      expect(resolveCategoryId(mockUserContext, undefined, "NonExistent")).toBeNull();
    });
  });

  describe("Discount treated as Income", () => {
    it("normalizes discounts as income with positive amounts", () => {
      const draft = normalizeDraft(
        {
          name: "Promo Discount",
          amount: -15000,
          type: "expense",
          entry_kind: "discount",
          category_name: "Food & Dining",
        },
        mockUserContext,
        "2026-08-29",
      );

      expect(draft.type).toBe("income");
      expect(draft.amount).toBe(15000);
      expect(draft.entryKind).toBe("discount");
      expect(draft.status).toBe("ready");
    });

    it("uses fallback category for discounts when not specified", () => {
      const draft = normalizeDraft(
        {
          name: "Voucher Discount",
          amount: 5000,
          entry_kind: "discount",
        },
        mockUserContext,
        "2026-08-29",
        "cat-1",
      );

      expect(draft.categoryId).toBe("cat-1");
      expect(draft.categoryName).toBe("Food & Dining");
      expect(draft.status).toBe("ready");
    });
  });

  describe("propose_add_transactions enforcement and batch validation", () => {
    it("rejects batches with more than 25 entries with an explicit message", async () => {
      const overLimitTransactions = Array.from({ length: 26 }, (_, i) => ({
        name: `Item ${i + 1}`,
        amount: 10000,
        type: "expense",
        category_name: "Shopping",
      }));

      const outcome = await executeTool(
        "propose_add_transactions",
        JSON.stringify({ transactions: overLimitTransactions }),
        mockUserContext,
        "call-1",
      );

      expect(outcome.kind).toBe("result");
      if (outcome.kind === "result") {
        expect((outcome.data as { error: string }).error).toContain(
          "exceeds the 25-transaction limit (26 items submitted)",
        );
      }
    });

    it("normalizes a valid multi-entry batch into a PendingBatchTransactionAction", async () => {
      const batchPayload = {
        source: "ocr",
        merchant: "Superindo",
        receipt_total: 85000,
        ocr_confidence: 92,
        transactions: [
          { name: "Apples", amount: 35000, type: "expense", category_name: "Food & Dining" },
          { name: "Dish Soap", amount: 20000, type: "expense", category_name: "Shopping" },
          { name: "Service Fee", amount: 5000, type: "expense", entry_kind: "service", category_name: "Bills & Utilities" },
          { name: "Store Discount", amount: 5000, type: "income", entry_kind: "discount" },
        ],
      };

      const outcome = await executeTool(
        "propose_add_transactions",
        JSON.stringify(batchPayload),
        mockUserContext,
        "call-batch-1",
      );

      expect(outcome.kind).toBe("pending");
      if (outcome.kind === "pending") {
        const action = outcome.pendingAction as PendingBatchTransactionAction;
        expect(action.kind).toBe("transaction-batch");
        expect(action.source).toBe("ocr");
        expect(action.merchant).toBe("Superindo");
        expect(action.receiptTotal).toBe(85000);
        expect(action.ocrConfidence).toBe(92);
        expect(action.drafts).toHaveLength(4);

        expect(action.drafts[0].status).toBe("ready");
        expect(action.drafts[0].selected).toBe(true);
        expect(action.drafts[3].type).toBe("income");
        expect(action.drafts[3].entryKind).toBe("discount");
        expect(action.drafts[3].categoryId).toBe("cat-1"); // Inherited largest item category
      }
    });

    it("normalizes single propose_add_transaction into a 1-row transaction-batch", async () => {
      const outcome = await executeTool(
        "propose_add_transaction",
        JSON.stringify({
          name: "Coffee",
          amount: 25000,
          type: "expense",
          category_name: "Food & Dining",
        }),
        mockUserContext,
        "call-single-1",
      );

      expect(outcome.kind).toBe("pending");
      if (outcome.kind === "pending") {
        const action = outcome.pendingAction as PendingBatchTransactionAction;
        expect(action.kind).toBe("transaction-batch");
        expect(action.drafts).toHaveLength(1);
        expect(action.drafts[0].name).toBe("Coffee");
        expect(action.drafts[0].amount).toBe(25000);
        expect(action.drafts[0].status).toBe("ready");
      }
    });

    it("marks invalid rows with inline field errors without blocking valid rows", async () => {
      const batchPayload = {
        transactions: [
          { name: "Valid Coffee", amount: 30000, type: "expense", category_name: "Food & Dining" },
          { name: "", amount: 0, type: "expense", category_name: "UnknownCat" }, // Invalid
        ],
      };

      const outcome = await executeTool(
        "propose_add_transactions",
        JSON.stringify(batchPayload),
        mockUserContext,
        "call-mixed",
      );

      expect(outcome.kind).toBe("pending");
      if (outcome.kind === "pending") {
        const action = outcome.pendingAction as PendingBatchTransactionAction;
        expect(action.drafts[0].status).toBe("ready");
        expect(action.drafts[0].selected).toBe(true);

        expect(action.drafts[1].status).toBe("invalid");
        expect(action.drafts[1].selected).toBe(false);
        expect(action.drafts[1].errors).toHaveProperty("name");
        expect(action.drafts[1].errors).toHaveProperty("amount");
        expect(action.drafts[1].errors).toHaveProperty("categoryId");
      }
    });
  });
});
