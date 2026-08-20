import { DEFAULT_CONFIG } from "../config/defaults";

export interface PageInfo {
  path: string;
  name: string;
  category: "Expense" | "Investing" | "Financial Management" | "Overview";
  assistantName: string;
  assistantRole: string;
  model: string;
  focus: string;
  suggestedQuestions: string[];
}

export function getPageInfo(pathname: string): PageInfo {
  const normalized = (pathname || "/").toLowerCase();
  const expenseModel = DEFAULT_CONFIG.ai.expenseModel || "finly";
  const marketModel = DEFAULT_CONFIG.ai.marketModel || "market_quant";

  if (normalized === "/" || normalized === "") {
    return {
      path: "/",
      name: "Dashboard",
      category: "Expense",
      assistantName: "Finly",
      assistantRole: "Expense AI",
      model: expenseModel,
      focus: "Overview of monthly cashflow, daily spend pacing, category spending cards, recent transactions, and financial health.",
      suggestedQuestions: [
        "What did I spend on Food this month?",
        "How am I tracking against my monthly budget?",
        "List my accounts and balances",
      ],
    };
  }

  if (normalized.startsWith("/transactions")) {
    return {
      path: "/transactions",
      name: "Transactions",
      category: "Expense",
      assistantName: "Finly",
      assistantRole: "Expense AI",
      model: expenseModel,
      focus: "Transaction records and history across bank accounts and wallets. Can filter, search, and add expenses/income/transfers.",
      suggestedQuestions: [
        "What are my largest expenses this month?",
        "Show transactions from the last 7 days",
        "Add Rp 50,000 coffee expense to BCA",
      ],
    };
  }

  if (normalized.startsWith("/budgets")) {
    return {
      path: "/budgets",
      name: "Budgets",
      category: "Expense",
      assistantName: "Finly",
      assistantRole: "Expense AI",
      model: expenseModel,
      focus: "Category spending limits, budget utilization pacing, and category target tracking.",
      suggestedQuestions: [
        "Which categories are close to or over budget?",
        "How much total budget is remaining this month?",
        "How does my Food spending compare to its target?",
      ],
    };
  }

  if (normalized.startsWith("/goals")) {
    return {
      path: "/goals",
      name: "Goals",
      category: "Expense",
      assistantName: "Finly",
      assistantRole: "Expense AI",
      model: expenseModel,
      focus: "Savings and capital accumulation goals with target amounts, current progress, and target dates.",
      suggestedQuestions: [
        "What is the progress on all my savings goals?",
        "Which goal has the closest deadline?",
        "How much more do I need to reach my goals?",
      ],
    };
  }

  if (normalized.startsWith("/reports")) {
    return {
      path: "/reports",
      name: "Reports",
      category: "Expense",
      assistantName: "Finly",
      assistantRole: "Expense AI",
      model: expenseModel,
      focus: "Spending analytics, category distributions, monthly comparisons, and financial reports.",
      suggestedQuestions: [
        "Summarize my spending breakdown by category",
        "What is my spending trend over time?",
        "Which category saw the largest expense increase?",
      ],
    };
  }

  if (normalized.startsWith("/quick-portfolio")) {
    return {
      path: "/quick-portfolio",
      name: "Quick Portfolio",
      category: "Investing",
      assistantName: "Market Quant",
      assistantRole: "Investing AI",
      model: marketModel,
      focus: "Fast multi-asset portfolio overview, P&L by category, daily movers, and holding management.",
      suggestedQuestions: [
        "What is my total portfolio value and P&L?",
        "Show my best performing assets today",
        "What is my asset allocation breakdown?",
      ],
    };
  }

  if (normalized.startsWith("/portfolio")) {
    return {
      path: pathname,
      name: "Portfolio",
      category: "Investing",
      assistantName: "Market Quant",
      assistantRole: "Investing AI",
      model: marketModel,
      focus: "Detailed investment portfolios, asset holdings, allocation percentages, P&L, and trade history.",
      suggestedQuestions: [
        "List all my portfolio holdings and values",
        "Which assets have the highest profit or loss?",
        "What is my currency exposure between IDR and USD?",
      ],
    };
  }

  if (normalized.startsWith("/dividend")) {
    return {
      path: "/dividend",
      name: "Dividend Tracker",
      category: "Investing",
      assistantName: "Market Quant",
      assistantRole: "Investing AI",
      model: marketModel,
      focus: "Dividend payout calendar, ex-dates, yield estimates, and annual dividend cashflow.",
      suggestedQuestions: [
        "What is my expected annual dividend payout?",
        "Which of my holdings have upcoming dividend dates?",
        "Which asset in my portfolio yields the highest dividend?",
      ],
    };
  }

  if (normalized.startsWith("/stock")) {
    const segments = pathname.split("/").filter(Boolean);
    const ticker = segments[1] ? segments[1].toUpperCase() : "Stock";
    return {
      path: pathname,
      name: `Stock (${ticker})`,
      category: "Financial Management",
      assistantName: "Market Quant",
      assistantRole: "Market AI",
      model: marketModel,
      focus: `Equity overview, valuation metrics, price charts, and financials for ${ticker}.`,
      suggestedQuestions: [
        `Do I currently hold ${ticker} in any portfolio?`,
        `How does ${ticker} compare to my target allocation?`,
        `What is the recent price action for ${ticker}?`,
      ],
    };
  }

  if (normalized.startsWith("/markets/list")) {
    return {
      path: "/markets/list",
      name: "Market Cap List",
      category: "Financial Management",
      assistantName: "Market Quant",
      assistantRole: "Market AI",
      model: marketModel,
      focus: "Global and regional market capitalization rankings, market sectors, and asset screeners.",
      suggestedQuestions: [
        "Which stocks are top market cap leaders?",
        "Are any of the top market cap stocks in my portfolio?",
        "Compare market caps across banking and tech sectors",
      ],
    };
  }

  if (normalized.startsWith("/trading-journal")) {
    return {
      path: "/trading-journal",
      name: "Trading Journal",
      category: "Investing",
      assistantName: "Market Quant",
      assistantRole: "Trading AI",
      model: marketModel,
      focus: "Trading log, trade execution records, entry/exit prices, win rates, and trading psychology notes.",
      suggestedQuestions: [
        "Review my recent trades in the journal",
        "What is my win rate and risk/reward ratio?",
        "What are the main trading mistakes or notes recorded?",
      ],
    };
  }

  return {
    path: pathname,
    name: "Finly Zen",
    category: "Overview",
    assistantName: "Finly",
    assistantRole: "Financial AI",
    model: expenseModel,
    focus: "General personal finance and investment management.",
    suggestedQuestions: [
      "What did I spend on Food this month?",
      "What is my total portfolio value?",
      "List my accounts and balances",
    ],
  };
}
