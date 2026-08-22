import { supabase } from "./supabase";
import { getAccounts, getCategories, getTransactions } from "../data/expenseData";
import { getPortfolios } from "../data/portfolioData";
import { state } from "../store";
import { portfolioState, loadPortfolios } from "../store/portfolioStore";
import { DEFAULT_CONFIG } from "../config/defaults";
import type { Account, Category } from "../types";
import { getPageInfo, type PageInfo } from "./pageContext";

export const DEFAULT_USER_ID =
  import.meta.env.VITE_DEFAULT_USER_ID || "a4d800bd-e779-4e7b-8982-2cab3d10035b";

export interface UserContextAccount {
  id: string;
  name: string;
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

let cachedUserId: string | null = null;

export function setCachedUserId(id: string | null): void {
  cachedUserId = id;
}

export async function resolveUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      cachedUserId = data.session.user.id;
      return data.session.user.id;
    }
  } catch (err) {
    console.error("Error fetching session in resolveUserId:", err);
  }

  const accounts = await getAccounts();
  const fromAccount = accounts.find((a) => a.user_id)?.user_id;
  const resolved = fromAccount || DEFAULT_USER_ID;
  cachedUserId = resolved;
  return resolved;
}

export function getUserIdSync(): string {
  return cachedUserId || DEFAULT_USER_ID;
}

async function fetchPageSnapshot(
  currentPage: PageInfo,
  activePortfolioId: string | null,
): Promise<Record<string, unknown> | null> {
  try {
    const path = currentPage.path.toLowerCase();

    // 1. Quick Portfolio or Portfolio Screen (using live computed store)
    if (path.startsWith("/quick-portfolio") || path.startsWith("/portfolio")) {
      if (portfolioState.portfolios.length === 0) {
        await loadPortfolios();
      }

      const p =
        (path.startsWith("/quick-portfolio")
          ? portfolioState.portfolios.find((item) => item.name === "Quick Portfolio")
          : null) ||
        portfolioState.portfolios.find((item) => item.id === activePortfolioId) ||
        portfolioState.portfolios[0];

      if (!p) return null;

      return {
        portfolio_name: p.name,
        total_value_idr: p.totalValue,
        cash_balance_idr: p.cash,
        all_time_pnl_idr: p.allTimeGain,
        all_time_pnl_percent: `${(p.allTimeGainPercentage || 0).toFixed(2)}%`,
        holdings_count: p.assets.length,
        holdings: p.assets.map((a) => ({
          ticker: a.ticker,
          name: a.name,
          shares: a.totalShares,
          avg_cost_price: a.averagePrice,
          current_price: a.currentPrice,
          previous_close_price: a.previousClose,
          today_change_idr: a.dayChange,
          today_change_percent: `${(a.dayChangePct || 0).toFixed(2)}%`,
          current_market_value_idr: a.currentValue,
          total_unrealized_pnl_idr: a.totalGainLoss,
          portfolio_allocation_percent: `${(a.actualAllocation || 0).toFixed(2)}%`,
        })),
      };
    }

    // 2. Transactions Screen
    if (path.startsWith("/transactions")) {
      const txs = await getTransactions();
      const recent = txs.slice(0, 30).map((t) => ({
        id: t.id,
        name: t.name,
        amount: t.amount,
        type: t.type,
        category: t.category,
        account: t.accountName,
        date: t.date,
      }));
      return {
        recent_transactions_count: recent.length,
        recent_transactions: recent,
      };
    }

    // 3. Budgets Screen
    if (path.startsWith("/budgets")) {
      const txs = await getTransactions();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentMonthExpenses = txs.filter(
        (t) => t.type === "expense" && t.date >= monthStart,
      );

      const categorySpendMap: Record<string, number> = {};
      for (const t of currentMonthExpenses) {
        categorySpendMap[t.category] = (categorySpendMap[t.category] || 0) + t.amount;
      }

      return {
        month: now.toLocaleString("default", { month: "long", year: "numeric" }),
        budgets: state.budgets.map((b) => {
          const spent = categorySpendMap[b.category] || 0;
          return {
            category: b.category,
            limit: b.limit,
            spent,
            remaining: b.limit - spent,
            percent_used: b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0,
          };
        }),
      };
    }

    // 4. Goals Screen
    if (path.startsWith("/goals")) {
      return {
        goals_count: state.goals.length,
        goals: state.goals.map((g) => ({
          name: g.name,
          target: g.target,
          current: g.current,
          remaining: g.target - g.current,
          percent_completed: g.target > 0 ? Math.round((g.current / g.target) * 100) : 0,
          target_date: g.date,
        })),
      };
    }

    // 5. Dividend Screen
    if (path.startsWith("/dividend")) {
      if (portfolioState.portfolios.length === 0) {
        await loadPortfolios();
      }
      const p =
        portfolioState.portfolios.find((item) => item.id === activePortfolioId) ||
        portfolioState.portfolios[0];

      if (!p) return null;
      return {
        portfolio_name: p.name,
        assets: p.assets.map((a) => ({
          ticker: a.ticker,
          name: a.name,
          shares: a.totalShares,
          current_value_idr: a.currentValue,
        })),
      };
    }

    // 6. Stock Detail Screen
    if (path.startsWith("/stock")) {
      const segments = path.split("/").filter(Boolean);
      const ticker = segments[1] ? segments[1].toUpperCase() : null;
      if (!ticker) return null;

      if (portfolioState.portfolios.length === 0) {
        await loadPortfolios();
      }

      let heldQuantity = 0;
      let avgCost = 0;
      let currentPrice = 0;

      for (const p of portfolioState.portfolios) {
        const match = p.assets.find((a) => a.ticker.toUpperCase() === ticker);
        if (match) {
          heldQuantity += match.totalShares;
          avgCost = match.averagePrice;
          currentPrice = match.currentPrice;
        }
      }

      return {
        viewing_ticker: ticker,
        is_held_in_portfolio: heldQuantity > 0,
        held_quantity: heldQuantity,
        average_buy_price: avgCost,
        current_price: currentPrice,
      };
    }

    // 7. Dashboard Overview
    if (path === "/" || path === "") {
      const txs = await getTransactions();
      return {
        recent_transactions: txs.slice(0, 5).map((t) => ({
          name: t.name,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date,
        })),
      };
    }

    return null;
  } catch (e) {
    console.error("Failed to build page snapshot:", e);
    return null;
  }
}

export async function buildUserContext(pathname?: string): Promise<UserContext> {
  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const currentPage = getPageInfo(currentPath);
  const userId = await resolveUserId();
  const [accounts, categories, portfolios] = await Promise.all([
    getAccounts(),
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
    accounts: scopedAccounts.map((a) => ({ id: a.id, name: a.name })),
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
    `accounts: ${JSON.stringify(ctx.accounts)}`,
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

  lines.push(
    "",
    "Database Tools (Maps 1:1 to frontend Supabase calls):",
    "- To save a new expense or income: call `propose_add_transaction` with `name`, `amount`, `type` ('expense'|'income'), and `account_name` / `category_name` matching the accounts/categories listed above.",
    "- To transfer between accounts: call `propose_add_transfer` with `from_account_name`, `to_account_name`, and `amount`.",
    "- To look up transactions or calculate spending: call `list_transactions` or `spending_summary`.",
    "- To check investments: call `list_portfolios` or `get_portfolio_holdings`.",
    "",
    "Rules:",
    `- You are assisting ${ctx.userName} on the "${ctx.currentPage.name}" screen. The Active Screen Pre-Injected Snapshot contains real, live data for this screen (including prices, day change percentages, P&L, holdings, or transactions). Always use this data first.`,
    "- Formulate your internal calculations, deductions, and step-by-step reasoning inside <think>...</think> tags before writing your final response or invoking tools.",
    "- Amounts are in Indonesian Rupiah (IDR) unless stated otherwise.",
    "- When the user asks you to log, record, add, or transfer money, call the corresponding tool immediately. The frontend will present a confirmation card to the user with the exact details to save to Supabase.",
  );

  return lines.join("\n");
}
