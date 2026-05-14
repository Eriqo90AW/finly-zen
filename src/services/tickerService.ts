export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

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
