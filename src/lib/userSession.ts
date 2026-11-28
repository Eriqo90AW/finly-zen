import { supabase } from "./supabase";

export const DEFAULT_USER_ID =
  import.meta.env.VITE_DEFAULT_USER_ID || "a4d800bd-e779-4e7b-8982-2cab3d10035b";

let cachedUserId: string | null = null;

export function setCachedUserId(id: string | null): void {
  cachedUserId = id;
}

export async function resolveUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      cachedUserId = data.session.user.id;
      return data.session.user.id;
    }
  } catch (err) {
    console.error("Error fetching session in resolveUserId:", err);
  }

  let fromAccount: string | undefined;
  try {
    const { data } = await supabase.from("accounts").select("user_id").limit(1);
    const match = data?.find(
      (account) => typeof account.user_id === "string" && account.user_id.length > 0,
    );
    fromAccount = typeof match?.user_id === "string" ? match.user_id : undefined;
  } catch (err) {
    console.error("Error fetching fallback account user_id in resolveUserId:", err);
  }

  const resolved = fromAccount || DEFAULT_USER_ID;
  cachedUserId = resolved;
  return resolved;
}

export function getUserIdSync(): string {
  return cachedUserId || DEFAULT_USER_ID;
}
