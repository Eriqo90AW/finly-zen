// Supabase Edge Function: fetch-dividends
// Fetches live IDX dividend data from Yahoo Finance API (JSON, no auth, globally reachable)
//
// Yahoo provides ex_date + amount per ticker. We derive cum_date, record_date, payment_date.
// Amounts may be split-adjusted for stocks that recently split.
// payment_date is estimated (ex_date + 14 days) — Yahoo doesn't provide it.
//
// Deploy with:
//   supabase functions deploy fetch-dividends --project-ref ltjpsxlnxpjivoxgmmxn
//
// POST body: { tickers: string[] }  (e.g. ["BBCA","BBRI","TLKM",...])
// Returns: { data: DividendEntry[], count: number }

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface YahooDividend {
  amount: number;
  date: number; // unix timestamp = ex-dividend date
}

interface RawDividend {
  ticker: string;
  company_name: string;
  currency: string;
  amount: number;
  last_price: number | null;
  ex_date: string;   // DD-MMM-YYYY
  cum_date: string;   // ex_date - 1 day
  record_date: string; // ex_date + 1 day
  payment_date: string; // ex_date + 14 days (estimated)
  year: number;
}

function unixToDDMMMYYYY(ts: number): string {
  const d = new Date(ts * 1000);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function addDaysToUnix(ts: number, days: number): number {
  return ts + days * 86400;
}

async function fetchTickerDividends(
  ticker: string,
  period1: number,
  period2: number
): Promise<RawDividend[]> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}.JK?period1=${period1}&period2=${period2}&interval=1d&events=div,split`;
  try {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) return [];

  const json: any = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const meta = result.meta || {};
  const company_name = meta.longName || meta.shortName || ticker;
  const currency = meta.currency || "IDR";
  const last_price: number | null =
    typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
  const dividends: Record<string, YahooDividend> = result.events?.dividends || {};

  return Object.values(dividends).map((div) => {
    const exTs = div.date;
    return {
      ticker,
      company_name,
      currency,
      amount: div.amount,
      last_price,
      ex_date: unixToDDMMMYYYY(exTs),
      cum_date: unixToDDMMMYYYY(addDaysToUnix(exTs, -1)),
      record_date: unixToDDMMMYYYY(addDaysToUnix(exTs, 1)),
      payment_date: unixToDDMMMYYYY(addDaysToUnix(exTs, 14)),
      year: new Date(exTs * 1000).getUTCFullYear(),
    };
  });
  } catch {
    return [];
  }
}

async function fetchAllTickers(
  tickers: string[],
  period1: number,
  period2: number
): Promise<RawDividend[]> {
  const results: RawDividend[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((t) => fetchTickerDividends(t, period1, period2))
    );
    for (const dividends of batchResults) {
      results.push(...dividends);
    }
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

function applyFrequency(raw: RawDividend[]): any[] {
  const history = new Map<string, number[]>();
  for (const item of raw) {
    const key = `${item.ticker}_${item.year}`;
    const payouts = history.get(key) || [];
    payouts.push(item.amount);
    history.set(key, payouts);
  }

  return raw.map((item) => {
    let frequency = "annual";
    const key = `${item.ticker}_${item.year}`;
    const yearly = history.get(key);
    if (yearly && yearly.length > 1) {
      const maxPayout = Math.max(...yearly);
      frequency = item.amount === maxPayout ? "final" : "interim";
    }

    const status = item.year >= 2026 ? "paid" : "projected";

    return {
      ticker: item.ticker,
      company_name: item.company_name,
      currency: item.currency,
      amount: item.amount,
      last_price: item.last_price,
      cum_date: item.cum_date,
      ex_date: item.ex_date,
      record_date: item.record_date,
      payment_date: item.payment_date,
      frequency,
      year: item.year,
      status,
    };
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tickers: string[] = body.tickers || [];

    if (tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tickers provided. Send { tickers: [...] } in POST body." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const period1 = now - 180 * 86400;  // 6 months ago
    const period2 = now + 365 * 86400;   // 1 year in the future

    console.log(`Fetching dividends for ${tickers.length} tickers...`);
    const raw = await fetchAllTickers(tickers, period1, period2);
    const data = applyFrequency(raw);
    console.log(`Done. ${data.length} dividend entries found.`);

    return new Response(
      JSON.stringify({ data, count: data.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in fetch-dividends:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
