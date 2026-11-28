import { getTransactions } from "../data/expenseData";
import { state } from "../store";
import { portfolioState, loadPortfolios } from "../store/portfolioStore";
import type { PageInfo } from "./pageContext";

export async function fetchPageSnapshot(
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
