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

export async function createPortfolioDB(name: string, initialCapital: number): Promise<PortfolioDB> {
  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: USER_ID,
      name,
      initial_capital: initialCapital,
      cash: initialCapital,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create portfolio in DB: ${error.message}`);
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

  return data || [];
}

export async function addPortfolioTransaction(
  params: Omit<PortfolioTransactionDB, "id" | "created_at" | "updated_at">
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
  const { error } = await supabase
    .from("portfolios")
    .update({ cash })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update portfolio cash: ${error.message}`);
  }
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
  const { error } = await supabase
    .from("portfolio_transactions")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (error) {
    throw new Error(`Failed to update asset thesis: ${error.message}`);
  }
}

