/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly AI_BASE_URL?: string;
  readonly AI_API_KEY?: string;
  readonly EXPENSE_MODEL?: string;
  readonly MARKET_MODEL?: string;
  readonly DEFAULT_MODEL?: string;
  readonly HERMES_PROXY_CONFIGURED?: boolean;

  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;

  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEFAULT_USD_RATE?: string;
  readonly VITE_DEFAULT_USER_NAME?: string;
  readonly VITE_DEFAULT_DAILY_BUDGET?: string;
  readonly VITE_DEFAULT_MONTHLY_LIMIT?: string;
  readonly VITE_DEFAULT_DATE_PERIOD?: string;
  readonly VITE_TARGET_FOOD?: string;
  readonly VITE_TARGET_GROCERIES?: string;
  readonly VITE_TARGET_UTILITIES?: string;
  readonly VITE_TARGET_TRANSFER?: string;
  readonly VITE_TARGET_SHOPPING?: string;
  readonly VITE_TARGET_TRANSPORT?: string;
  readonly VITE_TARGET_ENTERTAINMENT?: string;
  readonly VITE_TARGET_CASH?: string;
  readonly VITE_TARGET_HEALTHCARE?: string;
  readonly VITE_TARGET_OTHERS?: string;
  readonly VITE_TARGET_ACCOMMODATION?: string;
  readonly VITE_DEFAULT_USER_ID?: string;

  // Deprecated VITE_ AI keys for fallback compatibility
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_AI_API_KEY?: string;
  readonly VITE_EXPENSE_MODEL?: string;
  readonly VITE_MARKET_MODEL?: string;
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_OPENCODE_BASE_URL?: string;
  readonly VITE_OPENCODE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
