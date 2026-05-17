import type { StockData, TickerSearchResult } from "../types";

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  if (!query.trim()) return [];

  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_URL = `https://ltjpsxlnxpjivoxgmmxn.supabase.co/functions/v1/search-ticker?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(SUPABASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
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
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_URL = "https://ltjpsxlnxpjivoxgmmxn.supabase.co/functions/v1/v2-fetch-ticker";

  const response = await fetch(SUPABASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stock data for ${ticker}: ${response.statusText}`);
  }

  return response.json();
}
