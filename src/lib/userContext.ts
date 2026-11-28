import {
  getAccountsWithBalances,
  getCategories,
} from "../data/expenseData";
import { getPortfolios } from "../data/portfolioData";
import { state } from "../store";
import { portfolioState } from "../store/portfolioStore";
import { DEFAULT_CONFIG } from "../config/defaults";
import type { Account, Category } from "../types";
import { getPageInfo, type PageInfo } from "./pageContext";
import { fetchPageSnapshot } from "./pageSnapshot";
import { getToolsForProfile } from "../services/intelligence/tools/definitions";
import {
  DEFAULT_USER_ID,
  getUserIdSync,
  resolveUserId,
  setCachedUserId,
} from "./userSession";

export { DEFAULT_USER_ID, getUserIdSync, resolveUserId, setCachedUserId };

export interface UserContextAccount {
  id: string;
  name: string;
  balance: number;
  color?: string;
}

export interface UserContextPortfolio {
  id: string;
  name: string;
}

export interface UserContextCategory {
  id: string;
  name: string;
}

export interface UserContext {
  userId: string;
  userName: string;
  accounts: UserContextAccount[];
  portfolios: UserContextPortfolio[];
  categories: UserContextCategory[];
  selectedAccountName: string | null;
  selectedAccountId: string | null;
  activePortfolioId: string | null;
  activePortfolioName: string | null;
  budgets: { category: string; limit: number }[];
  goals: { id: string; name: string; target: number; current: number; date: string }[];
  currentPage: PageInfo;
  pageData?: Record<string, unknown> | null;
}

export async function buildUserContext(pathname?: string): Promise<UserContext> {
  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const currentPage = getPageInfo(currentPath);
  const userId = await resolveUserId();
  const [accounts, categories, portfolios] = await Promise.all([
    getAccountsWithBalances(userId),
    getCategories(),
    getPortfolios(),
  ]);

  const scopedAccounts = accounts.filter(
    (a) => !a.user_id || a.user_id === userId,
  ) as Account[];

  const selectedAccountName = state.ui.selectedAccount;
  const selectedAccount = selectedAccountName
    ? scopedAccounts.find((a) => a.name === selectedAccountName)
    : null;

  const activePortfolioId =
    portfolioState.activePortfolioId || portfolios[0]?.id || null;
  const activePortfolio = activePortfolioId
    ? portfolios.find((p) => p.id === activePortfolioId)
    : null;

  const pageData = await fetchPageSnapshot(currentPage, activePortfolioId);

  return {
    userId,
    userName: state.settings.userName || DEFAULT_CONFIG.userName,
    accounts: scopedAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance ?? 0,
      color: a.color,
    })),
    portfolios: portfolios.map((p) => ({ id: p.id, name: p.name })),
    categories: (categories as Category[]).map((c) => ({
      id: c.id,
      name: c.name,
    })),
    selectedAccountName,
    selectedAccountId: selectedAccount?.id ?? null,
    activePortfolioId,
    activePortfolioName: activePortfolio?.name ?? null,
    budgets: state.budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
    })),
    goals: state.goals.map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target,
      current: g.current,
      date: g.date,
    })),
    currentPage,
    pageData,
  };
}

export function formatContextForPrompt(ctx: UserContext): string {
  const lines = [
    `You are ${ctx.currentPage.assistantName}, a personal ${ctx.currentPage.assistantRole.toLowerCase()} for ${ctx.userName}.`,
    `user_id: ${ctx.userId}`,
    `current_page: "${ctx.currentPage.name}" (${ctx.currentPage.path})`,
    `page_focus: "${ctx.currentPage.focus}"`,
    `accounts: ${JSON.stringify(
      ctx.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        balance_idr: a.balance,
      })),
    )}`,
    `portfolios: ${JSON.stringify(ctx.portfolios)}`,
    `categories: ${JSON.stringify(ctx.categories)}`,
    ctx.selectedAccountName
      ? `selected_account: "${ctx.selectedAccountName}" (id: ${ctx.selectedAccountId})`
      : "selected_account: All Accounts",
    ctx.activePortfolioName
      ? `active_portfolio: "${ctx.activePortfolioName}" (id: ${ctx.activePortfolioId})`
      : "active_portfolio: none",
    `budgets: ${JSON.stringify(ctx.budgets)}`,
    `goals: ${JSON.stringify(ctx.goals)}`,
  ];

  if (ctx.pageData) {
    lines.push(
      "",
      `Active Screen Pre-Injected Snapshot (Use this data immediately to answer questions about the active screen without needing tool calls):\n${JSON.stringify(
        ctx.pageData,
        null,
        2,
      )}`,
    );
  }

  const tools = getToolsForProfile(ctx.currentPage.model || "finly");
  const toolDefinitionsStr = tools
    .map((t) => JSON.stringify(t))
    .join("\n");

  lines.push(
    "",
    "# Tools Available",
    "You have access to the following tools:",
    "<tools>",
    toolDefinitionsStr,
    "</tools>",
    "",
    "Tool Calling Instructions:",
    "- All tools listed above are LIVE, CONNECTED, and FULLY ACTIVE in this session.",
    "- When the user asks you to log, record, or add a single expense/income, call `propose_add_transaction`:",
    "<tool_call>",
    '{"name": "propose_add_transaction", "arguments": {"name": "...", "amount": 50000, "type": "expense", "account_name": "...", "category_name": "..."}}',
    "</tool_call>",
    "- When the user asks to log 2 or more transactions, or when processing receipt OCR line items, you MUST call `propose_add_transactions` with up to 25 transaction drafts:",
    "<tool_call>",
    '{"name": "propose_add_transactions", "arguments": {"source": "ocr", "merchant": "Indomaret", "receipt_total": 125000, "transactions": [{"name": "Milk", "amount": 25000, "type": "expense", "entry_kind": "item", "category_name": "Food & Dining"}, {"name": "Tax 10%", "amount": 2500, "type": "expense", "entry_kind": "tax", "category_name": "Bills & Utilities"}, {"name": "Member Discount", "amount": 5000, "type": "income", "entry_kind": "discount", "category_name": "Food & Dining"}]}}',
    "</tool_call>",
    "- Rules for multi-entry and OCR parsing:",
    "  1. For quantity-based items (e.g. 3 x Rp 10,000), use the extended line price (Rp 30,000) as the transaction amount.",
    "  2. Extract merchant and receipt date once, and supply printed receipt total in `receipt_total` for reconciliation.",
    "  3. Categorize each line item independently based on the user's available categories.",
    "  4. Taxes and service charges must be separate positive expense rows (`entry_kind: 'tax'` or `'service'`, `type: 'expense'`).",
    "  5. Discounts must be separate positive income rows (`entry_kind: 'discount'`, `type: 'income'`).",
    "  6. Never silently merge, drop, or truncate line items.",
    "  7. If there are more than 25 items, reject and instruct the user to split the batch into smaller groups.",
    "- When the user asks you to transfer money between accounts, you MUST call `propose_add_transfer`:",
    "<tool_call>",
    '{"name": "propose_add_transfer", "arguments": {"from_account_name": "...", "to_account_name": "...", "amount": 50000}}',
    "</tool_call>",
    "- When you call a transaction tool, the frontend application intercepts it and shows the interactive review card/batch panel to the user.",
    "- Once the user saves entries, the tool execution completes and returns `status: 'confirmed_and_saved'`. The transactions are NOW SAVED to Supabase.",
    "- In your final response after a successful tool call, simply confirm the saved transactions. NEVER ask the user to confirm again.",
    "- If the user cancelled (`status: 'cancelled'`), acknowledge the cancellation.",
    "- NEVER claim that tools are disconnected or mock. NEVER ask the user to add transactions manually when they ask you to add them.",
    "",
    "Rules:",
    `- You are assisting ${ctx.userName} on the "${ctx.currentPage.name}" screen. The Active Screen Pre-Injected Snapshot contains real, live data for this screen. Always use this data first.`,
    "- Formulate your internal calculations, deductions, and step-by-step reasoning inside <think>...</think> tags before writing your final response or invoking tools.",
    "- Amounts are in Indonesian Rupiah (IDR) unless stated otherwise.",
  );

  return lines.join("\n");
}

