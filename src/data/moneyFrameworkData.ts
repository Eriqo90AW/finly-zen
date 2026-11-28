import { supabase } from "../lib/supabase";

export interface MoneyBucketRecord {
  id: string;
  name: string;
  is_emergency: boolean;
  target: number;
  contribution: number;
}

export interface MoneyBucketAccountLink {
  bucket_id: string;
  account_id: string;
}

export interface SaveMoneyBucketInput {
  id: string | null;
  name: string;
  is_emergency: boolean;
  target: number;
  contribution: number;
  accounts: string[];
}

export async function loadMoneyFrameworkData(): Promise<{
  buckets: MoneyBucketRecord[];
  links: MoneyBucketAccountLink[];
}> {
  const init = await supabase.rpc("initialize_money_framework");
  if (init.error) throw init.error;

  const [bucketsRes, linksRes] = await Promise.all([
    supabase.from("money_buckets").select("*").order("name"),
    supabase.from("money_bucket_accounts").select("bucket_id,account_id"),
  ]);

  if (bucketsRes.error) throw bucketsRes.error;
  if (linksRes.error) throw linksRes.error;

  return {
    buckets: (bucketsRes.data || []) as MoneyBucketRecord[],
    links: (linksRes.data || []) as MoneyBucketAccountLink[],
  };
}

export async function saveMoneyBucketRecord(draft: SaveMoneyBucketInput): Promise<void> {
  const { error } = await supabase.rpc("save_money_bucket", {
    p_id: draft.id,
    p_name: draft.name.trim(),
    p_emergency: draft.is_emergency,
    p_target: draft.target,
    p_contribution: draft.contribution,
    p_accounts: draft.accounts,
  });
  if (error) throw error;
}

export async function deleteMoneyBucketRecord(id: string): Promise<string | null> {
  const { error } = await supabase.from("money_buckets").delete().eq("id", id);
  return error ? error.message : null;
}
