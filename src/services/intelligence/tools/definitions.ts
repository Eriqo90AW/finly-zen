import type { OpenAIToolDefinition } from "../../../types/intelligence";

const listAccountsTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "list_accounts",
    description: "List all bank and wallet accounts with balances and IDs for the current user.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const listCategoriesTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "list_categories",
    description: "List all expense and income categories with icons.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const listTransactionsTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "list_transactions",
    description:
      "List transactions with optional filters. Returns recent transactions newest first.",
    parameters: {
      type: "object",
      properties: {
        account_id: { type: "string", description: "Filter by account UUID" },
        account_name: { type: "string", description: "Filter by account name" },
        category: { type: "string", description: "Filter by category name" },
        type: { type: "string", enum: ["expense", "income"], description: "Transaction type" },
        date_from: { type: "string", description: "ISO date lower bound (inclusive)" },
        date_to: { type: "string", description: "ISO date upper bound (inclusive)" },
        limit: { type: "number", description: "Max rows to return (default 20, max 50)" },
      },
      required: [],
    },
  },
};

const spendingSummaryTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "spending_summary",
    description: "Summarize spending by category for a date range. Expenses only.",
    parameters: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "ISO date lower bound" },
        date_to: { type: "string", description: "ISO date upper bound" },
        account_id: { type: "string", description: "Optional account UUID filter" },
        account_name: { type: "string", description: "Optional account name filter" },
      },
      required: [],
    },
  },
};

const listPortfoliosTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "list_portfolios",
    description: "List investment portfolios for the current user.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getPortfolioHoldingsTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "get_portfolio_holdings",
    description: "Get current asset holdings, quantities, values, and P&L for a portfolio.",
    parameters: {
      type: "object",
      properties: {
        portfolio_id: { type: "string", description: "Portfolio UUID" },
        portfolio_name: { type: "string", description: "Portfolio name (alternative to id)" },
      },
      required: [],
    },
  },
};

const getBudgetsAndGoalsTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "get_budgets_and_goals",
    description: "Get local budget limits and savings goals (stored in app state).",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const proposeAddTransactionTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "propose_add_transaction",
    description:
      "Propose adding a new expense or income transaction. Requires user confirmation before saving.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Merchant or description" },
        amount: { type: "number", description: "Amount in IDR (positive number)" },
        type: { type: "string", enum: ["expense", "income"] },
        account_id: { type: "string", description: "Account UUID" },
        account_name: { type: "string", description: "Account name (alternative to id)" },
        category_id: { type: "string", description: "Category UUID" },
        category_name: { type: "string", description: "Category name (alternative to id)" },
        note: { type: "string" },
        is_recurring: { type: "boolean" },
      },
      required: ["name", "amount", "type"],
    },
  },
};

const proposeAddTransferTool: OpenAIToolDefinition = {
  type: "function",
  function: {
    name: "propose_add_transfer",
    description:
      "Propose transferring money between two accounts. Requires user confirmation before saving.",
    parameters: {
      type: "object",
      properties: {
        from_account_id: { type: "string" },
        from_account_name: { type: "string" },
        to_account_id: { type: "string" },
        to_account_name: { type: "string" },
        amount: { type: "number", description: "Amount in IDR" },
        note: { type: "string" },
      },
      required: ["amount"],
    },
  },
};

// Finly (Expense AI) Specialized Tools
export const FINLY_TOOLS: OpenAIToolDefinition[] = [
  listAccountsTool,
  listCategoriesTool,
  listTransactionsTool,
  spendingSummaryTool,
  getBudgetsAndGoalsTool,
  proposeAddTransactionTool,
  proposeAddTransferTool,
];

// Market Quant (Investing AI) Specialized Tools
export const MARKET_QUANT_TOOLS: OpenAIToolDefinition[] = [
  listPortfoliosTool,
  getPortfolioHoldingsTool,
  listTransactionsTool,
  spendingSummaryTool,
  getBudgetsAndGoalsTool,
];

export const ALL_TOOLS: OpenAIToolDefinition[] = [
  listAccountsTool,
  listCategoriesTool,
  listTransactionsTool,
  spendingSummaryTool,
  listPortfoliosTool,
  getPortfolioHoldingsTool,
  getBudgetsAndGoalsTool,
  proposeAddTransactionTool,
  proposeAddTransferTool,
];

export function getToolsForProfile(profileName: string): OpenAIToolDefinition[] {
  const normalized = (profileName || "").toLowerCase();
  if (normalized.includes("quant") || normalized.includes("market") || normalized.includes("invest")) {
    return MARKET_QUANT_TOOLS;
  }
  return FINLY_TOOLS;
}

export const WRITE_TOOL_NAMES = new Set([
  "propose_add_transaction",
  "propose_add_transfer",
]);

export const TOOL_LABELS: Record<string, string> = {
  list_accounts: "Checking accounts",
  list_categories: "Loading categories",
  list_transactions: "Fetching transactions",
  spending_summary: "Calculating spending",
  list_portfolios: "Loading portfolios",
  get_portfolio_holdings: "Fetching holdings",
  get_budgets_and_goals: "Reading budgets & goals",
  propose_add_transaction: "Preparing transaction",
  propose_add_transfer: "Preparing transfer",
};
