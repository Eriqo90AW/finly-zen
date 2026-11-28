import { z } from "zod";
import type { AppState, Budget, Goal } from "../types/store";

export const MAX_TRANSACTION_AMOUNT = 100_000_000_000; // 100 Billion IDR
const MAX_BATCH_SIZE = 25;

// ============================================================================
// Persisted App State Schemas (src/store/index.ts)
// ============================================================================

const BudgetSchema = z.object({
  category: z.string().trim().min(1),
  limit: z.number().finite().nonnegative(),
});

const GoalSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string(),
  target: z.number().finite().nonnegative(),
  current: z.number().finite().nonnegative(),
  emoji: z.string(),
  date: z.string(),
});

const DatePeriodSchema = z.enum(["1-30", "21-20", "25-25"]);

const SettingsSchema = z.object({
  monthlyLimit: z.number().finite().nonnegative(),
  userName: z.string(),
});

const PersistedUiSchema = z.object({
  currentMonth: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO date string"),
  datePeriod: DatePeriodSchema,
  sidebarOpen: z.boolean(),
  insightsOpen: z.boolean(),
  showAddExpense: z.boolean(),
  showAllTime: z.boolean(),
  selectedAccount: z.string().nullable(),
  selectedAccountColor: z.string().nullable(),
});

export const PersistedAppStateSchema = z.object({
  budgets: z.array(BudgetSchema).optional(),
  goals: z.array(GoalSchema).optional(),
  settings: SettingsSchema.partial().optional(),
  ui: PersistedUiSchema.partial().optional(),
});

const SyncedBudgetRowSchema = z.object({
  category: z.string().trim().min(1),
  amount: z.coerce.number().finite().nonnegative(),
});

export const SyncedBudgetRowsSchema = z.array(SyncedBudgetRowSchema);

const LegacySnapshotSchema = z.object({
  goals: z.array(z.unknown()).optional(),
  budgets: z.array(z.unknown()).optional(),
});

/**
 * Safely extract legacy goals and valid budget entries from a raw localStorage snapshot.
 * Never throws on corrupt JSON or mismatched shapes.
 */
export function parseLegacyLocalSnapshot(rawJson: string | null): {
  goals: unknown[] | null;
  budgets: Budget[] | null;
} {
  if (!rawJson) return { goals: null, budgets: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { goals: null, budgets: null };
  }

  const snapshot = LegacySnapshotSchema.safeParse(parsed);
  if (!snapshot.success) {
    return { goals: null, budgets: null };
  }

  const goals = snapshot.data.goals ?? null;
  let budgets: Budget[] | null = null;
  if (snapshot.data.budgets) {
    const validBudgets: Budget[] = [];
    for (const entry of snapshot.data.budgets) {
      const check = BudgetSchema.safeParse(entry);
      if (check.success) {
        validBudgets.push(check.data);
      }
    }
    budgets = validBudgets;
  }

  return { goals, budgets };
}

/**
 * Parse and sanitize persisted app state from localStorage without throwing.
 * Strips unknown keys (such as legacy UI flags), backfills missing default budgets,
 * and always resets transient UI drawers/modals to closed.
 */
export function parsePersistedAppState(
  rawJson: string | null,
  defaults: AppState,
  defaultBudgets: Budget[],
): AppState | null {
  if (!rawJson) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    return null;
  }

  const result = PersistedAppStateSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }

  const data = result.data;

  const budgets: Budget[] = data.budgets
    ? data.budgets.map((b) => ({ ...b }))
    : defaultBudgets.map((b) => ({ ...b }));

  const existingCategories = new Set(budgets.map((b) => b.category.toLowerCase()));
  for (const defBudget of defaultBudgets) {
    if (!existingCategories.has(defBudget.category.toLowerCase())) {
      budgets.push({ ...defBudget });
    }
  }

  const goals: Goal[] = data.goals ? data.goals.map((g) => ({ ...g })) : [...defaults.goals];

  return {
    transactions: [...defaults.transactions],
    budgets,
    goals,
    settings: {
      monthlyLimit: data.settings?.monthlyLimit ?? defaults.settings.monthlyLimit,
      userName: data.settings?.userName ?? defaults.settings.userName,
    },
    ui: {
      currentMonth: data.ui?.currentMonth ?? defaults.ui.currentMonth,
      datePeriod: data.ui?.datePeriod ?? defaults.ui.datePeriod,
      selectedAccount:
        data.ui?.selectedAccount !== undefined
          ? data.ui.selectedAccount
          : defaults.ui.selectedAccount,
      selectedAccountColor:
        data.ui?.selectedAccountColor !== undefined
          ? data.ui.selectedAccountColor
          : defaults.ui.selectedAccountColor,
      showAllTime: false,
      sidebarOpen: false,
      insightsOpen: false,
      showAddExpense: false,
    },
  };
}

// ============================================================================
// AI Tool Call Argument Schemas (src/services/intelligence/tools/handlers.ts)
// ============================================================================

const EmptyToolArgsSchema = z.object({});

const ListTransactionsArgsSchema = z.object({
  account_id: z.string().optional(),
  account_name: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(["expense", "income"]).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.number().finite().optional(),
});

const GetPortfolioHoldingsArgsSchema = z.object({
  portfolio_id: z.string().optional(),
  portfolio_name: z.string().optional(),
});

const TransactionDraftInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  type: z.string().optional(),
  entry_kind: z.string().optional(),
  entryKind: z.string().optional(),
  account_id: z.string().optional(),
  accountId: z.string().optional(),
  account_name: z.string().optional(),
  accountName: z.string().optional(),
  category_id: z.string().optional(),
  categoryId: z.string().optional(),
  category_name: z.string().optional(),
  categoryName: z.string().optional(),
  note: z.string().optional(),
  is_recurring: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  date: z.string().optional(),
});

const ProposeAddTransactionsArgsSchema = z
  .object({
    source: z.enum(["chat", "ocr"]).optional(),
    merchant: z.string().optional(),
    receipt_total: z.number().finite().optional(),
    ocr_confidence: z.number().finite().optional(),
    date: z.string().optional(),
    transactions: z.array(TransactionDraftInputSchema),
  })
  .superRefine((data, ctx) => {
    if (data.transactions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["transactions"],
        message: "At least 1 transaction draft is required.",
      });
    } else if (data.transactions.length > MAX_BATCH_SIZE) {
      ctx.addIssue({
        code: "custom",
        path: ["transactions"],
        message: `Batch exceeds the ${MAX_BATCH_SIZE}-transaction limit (${data.transactions.length} items submitted). Please split the request into smaller batches.`,
      });
    }
  });

const ProposeAddTransferArgsSchema = z.object({
  from_account_id: z.string().optional(),
  from_account_name: z.string().optional(),
  to_account_id: z.string().optional(),
  to_account_name: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  note: z.string().optional(),
});

const TOOL_ARG_SCHEMAS = {
  list_accounts: EmptyToolArgsSchema,
  list_categories: EmptyToolArgsSchema,
  list_transactions: ListTransactionsArgsSchema,
  spending_summary: ListTransactionsArgsSchema,
  list_portfolios: EmptyToolArgsSchema,
  get_portfolio_holdings: GetPortfolioHoldingsArgsSchema,
  get_budgets_and_goals: EmptyToolArgsSchema,
  propose_add_transaction: TransactionDraftInputSchema,
  propose_add_transactions: ProposeAddTransactionsArgsSchema,
  propose_add_transfer: ProposeAddTransferArgsSchema,
} as const;

type KnownToolName = keyof typeof TOOL_ARG_SCHEMAS;

type ToolArgsMap = {
  [K in KnownToolName]: z.infer<(typeof TOOL_ARG_SCHEMAS)[K]>;
};

type ToolValidationResult<K extends KnownToolName> =
  | { success: true; data: ToolArgsMap[K] }
  | { success: false; error: string };

/**
 * Validate parsed tool arguments for a known AI tool using Zod .safeParse().
 * Strips unrecognized properties and returns a readable error string on failure.
 */
export function validateToolArgs<K extends KnownToolName>(
  toolName: K,
  rawArgs: unknown,
): ToolValidationResult<K> {
  const schema = TOOL_ARG_SCHEMAS[toolName];
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue?.message || `Invalid arguments for tool ${toolName}.`;
    return { success: false, error: message };
  }
  return { success: true, data: parsed.data as ToolArgsMap[K] };
}
