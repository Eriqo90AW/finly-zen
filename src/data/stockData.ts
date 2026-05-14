import { StockData } from "../types";


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
