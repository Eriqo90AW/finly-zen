import { describe, it, expect } from "vitest";
import type { AppState, Budget } from "../types/store";
import {
  PersistedAppStateSchema,
  SyncedBudgetRowsSchema,
  parseLegacyLocalSnapshot,
  parsePersistedAppState,
  validateToolArgs,
} from "./validation";

const DEFAULT_BUDGETS_FIXTURE: Budget[] = [
  { category: "Food", limit: 2400000 },
  { category: "Transport", limit: 800000 },
];

const DEFAULT_STATE_FIXTURE: AppState = {
  transactions: [],
  budgets: DEFAULT_BUDGETS_FIXTURE,
  goals: [],
  settings: {
    monthlyLimit: 9100000,
    userName: "User",
  },
  ui: {
    currentMonth: "2026-08-01T00:00:00.000Z",
    datePeriod: "1-30",
    sidebarOpen: false,
    insightsOpen: false,
    showAddExpense: false,
    showAllTime: false,
    selectedAccount: null,
    selectedAccountColor: null,
  },
};

describe("validation.ts", () => {
  describe("PersistedAppStateSchema & parsePersistedAppState", () => {
    it("parses valid persisted state, backfills missing default budgets, strips unknown keys, and resets transient UI flags", () => {
      const payload = JSON.stringify({
        budgets: [{ category: "Food", limit: 3000000 }],
        goals: [
          {
            id: "goal-1",
            name: "Emergency Fund",
            target: 50000000,
            current: 12000000,
            emoji: "shield",
            date: "2026-12-31",
          },
        ],
        settings: { monthlyLimit: 12000000, userName: "Eriqo" },
        ui: {
          currentMonth: "2026-07-01T00:00:00.000Z",
          datePeriod: "25-25",
          sidebarOpen: true,
          insightsOpen: true,
          showAddExpense: true,
          showAllTime: true,
          showRecurringDebt: true, // legacy unknown key
          selectedAccount: "BCA Main",
          selectedAccountColor: "#1a4d2e",
        },
        injectedJunk: { malicious: true },
      });

      const hydrated = parsePersistedAppState(
        payload,
        DEFAULT_STATE_FIXTURE,
        DEFAULT_BUDGETS_FIXTURE,
      );

      expect(hydrated).not.toBeNull();
      if (!hydrated) return;
      expect(hydrated.budgets).toEqual([
        { category: "Food", limit: 3000000 },
        { category: "Transport", limit: 800000 },
      ]);
      expect(hydrated.goals).toHaveLength(1);
      expect(hydrated.goals[0].name).toBe("Emergency Fund");
      expect(hydrated.settings).toEqual({ monthlyLimit: 12000000, userName: "Eriqo" });
      expect(hydrated.ui).toEqual({
        currentMonth: "2026-07-01T00:00:00.000Z",
        datePeriod: "25-25",
        sidebarOpen: false,
        insightsOpen: false,
        showAllTime: false,
        showAddExpense: false,
        selectedAccount: "BCA Main",
        selectedAccountColor: "#1a4d2e",
      });
      expect("injectedJunk" in (hydrated as Record<string, unknown>)).toBe(false);
      expect("showRecurringDebt" in (hydrated.ui as Record<string, unknown>)).toBe(false);
    });

    it("returns null without throwing on corrupt JSON", () => {
      expect(
        parsePersistedAppState("{not-valid-json", DEFAULT_STATE_FIXTURE, DEFAULT_BUDGETS_FIXTURE),
      ).toBeNull();
      expect(
        parsePersistedAppState(null, DEFAULT_STATE_FIXTURE, DEFAULT_BUDGETS_FIXTURE),
      ).toBeNull();
    });

    it("rejects malformed localStorage field types safely", () => {
      const badDatePeriod = PersistedAppStateSchema.safeParse({
        ui: { datePeriod: "invalid-period" },
      });
      expect(badDatePeriod.success).toBe(false);

      const negativeBudget = PersistedAppStateSchema.safeParse({
        budgets: [{ category: "Food", limit: -500 }],
      });
      expect(negativeBudget.success).toBe(false);

      const badMonth = PersistedAppStateSchema.safeParse({
        ui: { currentMonth: "not-a-date" },
      });
      expect(badMonth.success).toBe(false);

      const corruptPayload = JSON.stringify({
        budgets: "corrupt-string",
        settings: { monthlyLimit: "NaN" },
      });
      expect(
        parsePersistedAppState(corruptPayload, DEFAULT_STATE_FIXTURE, DEFAULT_BUDGETS_FIXTURE),
      ).toBeNull();
    });

    it("parses legacy snapshots while filtering out invalid budget items", () => {
      const raw = JSON.stringify({
        goals: [{ id: "g1" }],
        budgets: [
          { category: "Food", limit: 1500000 },
          { category: "", limit: 100 },
          { category: "Bad", limit: -10 },
          { category: 42, limit: 100 },
        ],
      });

      const snapshot = parseLegacyLocalSnapshot(raw);
      expect(snapshot.goals).toEqual([{ id: "g1" }]);
      expect(snapshot.budgets).toEqual([{ category: "Food", limit: 1500000 }]);
      expect(parseLegacyLocalSnapshot("{broken")).toEqual({ goals: null, budgets: null });
    });

    it("validates synced Supabase budget rows with numeric coercion", () => {
      const parsed = SyncedBudgetRowsSchema.safeParse([
        { category: "Food", amount: "2500000" },
        { category: "Transport", amount: 500000 },
      ]);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual([
          { category: "Food", amount: 2500000 },
          { category: "Transport", amount: 500000 },
        ]);
      }

      const invalid = SyncedBudgetRowsSchema.safeParse([{ category: "Food", amount: -100 }]);
      expect(invalid.success).toBe(false);
    });
  });

  describe("AI tool argument schemas (validateToolArgs)", () => {
    it("accepts valid list_transactions arguments and strips unknown keys", () => {
      const res = validateToolArgs("list_transactions", {
        account_name: "BCA Main",
        type: "expense",
        limit: 15,
        extraKey: "should-be-stripped",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toEqual({
          account_name: "BCA Main",
          type: "expense",
          limit: 15,
        });
      }
    });

    it("rejects invalid list_transactions argument types", () => {
      const badType = validateToolArgs("list_transactions", { type: "transfer" });
      expect(badType.success).toBe(false);

      const badLimit = validateToolArgs("list_transactions", { limit: "twenty" });
      expect(badLimit.success).toBe(false);
    });

    it("rejects empty or oversized propose_add_transactions batches with exact errors", () => {
      const emptyRes = validateToolArgs("propose_add_transactions", { transactions: [] });
      expect(emptyRes.success).toBe(false);
      if (!emptyRes.success) {
        expect(emptyRes.error).toContain("At least 1 transaction draft is required");
      }

      const missingRes = validateToolArgs("propose_add_transactions", {});
      expect(missingRes.success).toBe(false);

      const oversized = Array.from({ length: 26 }, (_, i) => ({
        name: `Item ${i + 1}`,
        amount: 1000,
      }));
      const overRes = validateToolArgs("propose_add_transactions", { transactions: oversized });
      expect(overRes.success).toBe(false);
      if (!overRes.success) {
        expect(overRes.error).toContain("exceeds the 25-transaction limit (26 items submitted)");
      }
    });

    it("validates propose_add_transactions with valid OCR payload", () => {
      const res = validateToolArgs("propose_add_transactions", {
        source: "ocr",
        merchant: "Superindo",
        receipt_total: 85000,
        ocr_confidence: 92,
        transactions: [{ name: "Apples", amount: 35000, type: "expense" }],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.merchant).toBe("Superindo");
        expect(res.data.transactions).toHaveLength(1);
      }
    });

    it("rejects invalid source enum in propose_add_transactions", () => {
      const res = validateToolArgs("propose_add_transactions", {
        source: "voice",
        transactions: [{ name: "Coffee", amount: 25000 }],
      });
      expect(res.success).toBe(false);
    });

    it("validates propose_add_transfer and rejects malformed amount objects", () => {
      const valid = validateToolArgs("propose_add_transfer", {
        from_account_name: "BCA Main",
        to_account_name: "Bank Jago",
        amount: 100000,
        note: "Monthly topup",
      });
      expect(valid.success).toBe(true);

      const invalid = validateToolArgs("propose_add_transfer", {
        from_account_name: "BCA Main",
        to_account_name: "Bank Jago",
        amount: { bad: true },
      });
      expect(invalid.success).toBe(false);
    });

    it("validates get_portfolio_holdings and rejects non-string IDs", () => {
      expect(validateToolArgs("get_portfolio_holdings", { portfolio_name: "Core" }).success).toBe(
        true,
      );
      expect(validateToolArgs("get_portfolio_holdings", { portfolio_id: 12345 }).success).toBe(
        false,
      );
    });
  });
});
