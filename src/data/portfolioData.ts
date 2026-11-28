import { supabase } from "../lib/supabase";
import { resolveUserId } from "../lib/userSession";
import type {
  PortfolioDB,
  PortfolioTransactionDB,
  PortfolioHoldingDB,
} from "../types";

export {
  fetchUsdRate,
  fetchMultiStockPrices,
  upsertAsset,
  getAssetThesis,
  updateAssetThesis,
} from "./portfolioAssetData";

// --- DB Operations ---

export async function getPortfolios(): Promise<PortfolioDB[]> {
  const userId = await resolveUserId();
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching portfolios:", error);
    return [];
  }

  return data || [];
}

export async function createPortfolioDB(
  name: string,
  initialCapital: number,
  priceCurrency: number,
): Promise<PortfolioDB> {
  const userId = await resolveUserId();
  const isUSD = priceCurrency > 1;
  const baseCurrency = isUSD ? "USD" : "IDR";

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: userId,
      name,
      base_currency: baseCurrency,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create portfolio in DB: ${error.message}`);
  }

  // Insert initial deposit transaction into portfolio_transactions
  if (initialCapital > 0) {
    const { error: txError } = await supabase
      .from("portfolio_transactions")
      .insert({
        portfolio_id: data.id,
        asset_ticker: baseCurrency,
        type: "DEPOSIT",
        qty: initialCapital,
        price_per_unit: 1,
        fx_rate_to_base: priceCurrency,
        settlement_currency: baseCurrency,
        notes: "Initial Capital Deposit",
        transaction_date: new Date().toISOString(),
        linked_transaction_id: null,
      });

    if (txError) {
      console.error("Failed to insert initial deposit transaction:", txError);
    }
  }

  return data;
}

export async function deletePortfolioDB(id: string): Promise<void> {
  const { error } = await supabase
    .from("portfolios")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete portfolio: ${error.message}`);
  }
}

export async function getPortfolioTransactions(
  portfolioId: string,
): Promise<PortfolioTransactionDB[]> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("transaction_date", { ascending: true });

  if (error) {
    console.error(`Error fetching transactions for portfolio ${portfolioId}:`, error);
    return [];
  }

  return data || [];
}

export async function getPortfolioHoldings(portfolioId: string): Promise<PortfolioHoldingDB[]> {
  const { data, error } = await supabase
    .from("portfolio_holdings")
    .select("*")
    .eq("portfolio_id", portfolioId);

  if (error) {
    console.error(`Error fetching holdings for portfolio ${portfolioId}:`, error);
    return [];
  }

  return data || [];
}

export async function getPortfolioTransactionsRaw(
  portfolioId: string,
): Promise<PortfolioTransactionDB[]> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Error fetching raw transactions:", error);
    return [];
  }
  return data || [];
}

export async function addPortfolioTransaction(
  params: Omit<PortfolioTransactionDB, "id" | "created_at" | "updated_at">,
): Promise<PortfolioTransactionDB> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .insert(params)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add transaction: ${error.message}`);
  }

  return data;
}

export async function updatePortfolioCash(_id: string, _cash: number): Promise<void> {
  // No-op under event-sourced ledger model
  return Promise.resolve();
}

export async function setPortfolioCashAndInitial(
  _id: string,
  _cash: number,
  _initialCapital: number,
): Promise<void> {
  // No-op under event-sourced ledger model
  return Promise.resolve();
}

export async function createQuickPortfolioRecord(
  userId: string | null,
  name = "Quick Portfolio",
  baseCurrency = "IDR",
): Promise<void> {
  const { error } = await supabase
    .from("portfolios")
    .insert({
      user_id: userId,
      name,
      base_currency: baseCurrency,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
}

export async function updatePortfolioBaseCurrency(
  portfolioId: string,
  baseCurrency: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("portfolios")
    .update({ base_currency: baseCurrency })
    .eq("id", portfolioId);

  return !error;
}

export async function deletePortfolioTransactionsByTicker(
  portfolioId: string,
  ticker: string,
): Promise<void> {
  const { error } = await supabase
    .from("portfolio_transactions")
    .delete()
    .eq("portfolio_id", portfolioId)
    .eq("asset_ticker", ticker);

  if (error) {
    throw error;
  }
}
