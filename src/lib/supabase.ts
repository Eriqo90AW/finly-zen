import { createClient } from "@supabase/supabase-js";

const isTestEnv =
  import.meta.env.MODE === "test" ||
  Boolean(import.meta.env.VITEST) ||
  Boolean(
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.VITEST,
  );

export const SUPABASE_URL =
  import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!isTestEnv && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error("Missing Supabase environment variables. Check your .env file.");
}

const resolvedSupabaseUrl = SUPABASE_URL || (isTestEnv ? "http://127.0.0.1:54321" : "");
const resolvedSupabaseAnonKey = SUPABASE_ANON_KEY || (isTestEnv ? "test-anon-key" : "");

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      return await fn();
    },
  },
});
