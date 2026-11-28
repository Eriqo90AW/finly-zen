import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { DEFAULT_CONFIG } from "../config/defaults";
import type { MultiStockItem, MultiStockResponse, AssetType } from "../types";

export async function fetchUsdRate(): Promise<number> {
  const url = `${SUPABASE_URL}/functions/v1/usd-rate`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
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
    return DEFAULT_CONFIG.usdRate;
  }
}

export async function fetchMultiStockPrices(symbols: string[]): Promise<MultiStockResponse> {
  if (symbols.length === 0) return { data: [] };

  const url = `${SUPABASE_URL}/functions/v1/v2-multi-stock`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
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

export async function upsertAsset(stockItem: MultiStockItem): Promise<void> {
  const ticker = stockItem.symbol.toUpperCase();
  const name =
    stockItem.company_name ||
    stockItem.fundamentals?.price?.longName ||
    stockItem.fundamentals?.price?.shortName ||
    stockItem.symbol;

  // Auto-detect type
  let type: AssetType = "US_STOCK";
  if (ticker.endsWith("-USD")) {
    type = "CRYPTO";
  } else if (ticker.endsWith(".JK")) {
    type = "IDX";
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
      { onConflict: "ticker" },
    );

  if (error) {
    throw new Error(`Failed to upsert asset ${ticker}: ${error.message}`);
  }
}

export async function getAssetThesis(
  portfolioId: string,
  ticker: string,
): Promise<{ id: string; notes: string | null; updated_at: string } | null> {
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
