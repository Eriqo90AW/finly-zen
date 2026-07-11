import { supabase } from "../lib/supabase";
import type {
  PortfolioDB,
  PortfolioTransactionDB,
  AssetDB,
  MultiStockItem,
  MultiStockResponse,
  AssetType,
} from "../types";

const USER_ID = "a4d800bd-e779-4e7b-8982-2cab3d10035b";

// --- API Calls ---

export async function fetchUsdRate(): Promise<number> {
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const URL = "https://ltjpsxlnxpjivoxgmmxn.supabase.co/functions/v1/usd-rate";

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch USD rate: ${response.statusText}`);
    }

    const rate = await response.json();
    return Number(rate);
  } catch (error) {
    console.error("Error fetching USD rate:", error);
    return Number(import.meta.env.VITE_DEFAULT_USD_RATE) || 17400;
  }
}

export async function fetchMultiStockPrices(symbols: string[]): Promise<MultiStockResponse> {
  if (symbols.length === 0) return { data: [] };

  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const URL = "https://ltjpsxlnxpjivoxgmmxn.supabase.co/functions/v1/v2-multi-stock";

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock prices: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching multi-stock prices:", error);
    return { data: [] };
  }
}

// --- DB Operations ---

export async function getPortfolios(): Promise<PortfolioDB[]> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching portfolios:", error);
    return [];
  }

  return data || [];
}

export async function createPortfolioDB(name: string, initialCapital: number, priceCurrency: number): Promise<PortfolioDB> {
  const isUSD = priceCurrency > 1;
  const baseCurrency = isUSD ? "USD" : "IDR";

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: USER_ID,
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

export async function getPortfolioTransactions(portfolioId: string): Promise<PortfolioTransactionDB[]> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("transaction_date", { ascending: true });

  if (error) {
    console.error(`Error fetching transactions for portfolio ${portfolioId}:`, error);
    return [];
  }

  return (data || []).map(tx => ({
    ...tx,
    currency: tx.settlement_currency,
    price_currency: tx.fx_rate_to_base,
  }));
}

export async function getPortfolioTransactionsRaw(
  portfolioId: string
): Promise<PortfolioTransactionDB[]> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error(`Error fetching raw transactions:`, error);
    return [];
  }
  return (data || []).map(tx => ({
    ...tx,
    currency: tx.settlement_currency,
    price_currency: tx.fx_rate_to_base,
  }));
}

export async function addPortfolioTransaction(
  params: Omit<PortfolioTransactionDB, "id" | "created_at" | "updated_at">
): Promise<PortfolioTransactionDB> {
  const dbParams = {
    portfolio_id: params.portfolio_id,
    asset_ticker: params.asset_ticker,
    type: params.type,
    qty: params.qty,
    price_per_unit: params.price_per_unit,
    fx_rate_to_base: params.price_currency,
    settlement_currency: params.currency,
    notes: params.notes,
    transaction_date: params.transaction_date,
    linked_transaction_id: params.linked_transaction_id,
  };

  const { data, error } = await supabase
    .from("portfolio_transactions")
    .insert(dbParams)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add transaction: ${error.message}`);
  }

  return {
    ...data,
    currency: data.settlement_currency,
    price_currency: data.fx_rate_to_base,
  };
}

export async function upsertAsset(stockItem: MultiStockItem): Promise<void> {
  const ticker = stockItem.symbol.toUpperCase();
  const name = stockItem.fundamentals?.price?.shortName || stockItem.symbol;
  
  // Auto-detect type
  let type: AssetType = "US_STOCK";
  if (ticker.endsWith("-USD")) {
    type = "CRYPTO";
  }

  const industry = stockItem.fundamentals?.summaryProfile?.industry || null;
  const sector = stockItem.fundamentals?.summaryProfile?.sector || null;
  const logo_url = stockItem.logo_url || null;

  const { error } = await supabase
    .from("assets")
    .upsert(
      {
        ticker,
        name,
        type,
        industry,
        sector,
        logo_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ticker" }
    );

  if (error) {
    throw new Error(`Failed to upsert asset ${ticker}: ${error.message}`);
  }
}

export async function updatePortfolioCash(id: string, cash: number): Promise<void> {
  // No-op under event-sourced ledger model
  return Promise.resolve();
}

export async function setPortfolioCashAndInitial(id: string, cash: number, initialCapital: number): Promise<void> {
  // No-op under event-sourced ledger model
  return Promise.resolve();
}

export async function getAssetThesis(portfolioId: string, ticker: string): Promise<{ id: string; notes: string | null; updated_at: string } | null> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("id, notes, updated_at")
    .eq("portfolio_id", portfolioId)
    .eq("asset_ticker", ticker)
    .order("transaction_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching asset thesis:", error);
    return null;
  }
  return data;
}

export async function updateAssetThesis(transactionId: string, notes: string): Promise<void> {
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", transactionId)
    .select();

  if (error) {
    throw new Error(`Failed to update asset thesis: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No transaction found with id ${transactionId}`);
  }
}

