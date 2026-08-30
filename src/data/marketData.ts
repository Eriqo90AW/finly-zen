import type { StockData, TickerSearchResult } from "../types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  if (!query.trim()) return [];

  const url = `${SUPABASE_URL}/functions/v1/search-ticker?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error(`Failed to search tickers for ${query}: ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching tickers:", error);
    return [];
  }
}

export async function fetchStockData(ticker: string): Promise<StockData> {
  const url = `${SUPABASE_URL}/functions/v1/v2-fetch-ticker`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stock data for ${ticker}: ${response.statusText}`);
  }

  return response.json();
}
