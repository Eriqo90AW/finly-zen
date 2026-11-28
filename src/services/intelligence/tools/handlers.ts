import type { UserContext } from "../../../lib/userContext";
import type { ToolExecutionOutcome } from "../../../types/intelligence";
import { parseArgs } from "./draftNormalizer";
import {
  handleGetBudgetsAndGoals,
  handleGetPortfolioHoldings,
  handleListAccounts,
  handleListCategories,
  handleListPortfolios,
  handleListTransactions,
  handleSpendingSummary,
} from "./readHandlers";
import {
  handleProposeAddTransaction,
  handleProposeAddTransactions,
  handleProposeAddTransfer,
} from "./writeProposals";

export {
  getCurrentDateInJakarta,
  normalizeDraft,
  normalizeEntryKind,
  parseArgs,
  parseValidDate,
  resolveAccountId,
  resolveCategoryId,
  resolvePortfolioId,
  sanitizeAmount,
  sanitizeIsoDate,
  sanitizeText,
} from "./draftNormalizer";

export async function executeTool(
  toolName: string,
  rawArgs: string,
  ctx: UserContext,
  toolCallId: string,
): Promise<ToolExecutionOutcome> {
  const rawParsed = parseArgs(rawArgs);

  switch (toolName) {
    case "list_accounts":
      return handleListAccounts(rawParsed, ctx);
    case "list_categories":
      return handleListCategories(rawParsed);
    case "list_transactions":
      return handleListTransactions(rawParsed, ctx);
    case "spending_summary":
      return handleSpendingSummary(rawParsed, ctx);
    case "list_portfolios":
      return handleListPortfolios(rawParsed);
    case "get_portfolio_holdings":
      return handleGetPortfolioHoldings(rawParsed, ctx);
    case "get_budgets_and_goals":
      return handleGetBudgetsAndGoals(rawParsed, ctx);
    case "propose_add_transaction":
      return handleProposeAddTransaction(rawParsed, ctx, toolCallId);
    case "propose_add_transactions":
      return handleProposeAddTransactions(rawParsed, ctx, toolCallId);
    case "propose_add_transfer":
      return handleProposeAddTransfer(rawParsed, ctx, toolCallId, toolName);
    default:
      return { kind: "result", data: { error: `Unknown tool: ${toolName}` } };
  }
}
