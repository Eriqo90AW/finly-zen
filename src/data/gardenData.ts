import { supabase } from "../lib/supabase";
import { getLegacyGoals } from "../store";
import type { Goal } from "../types/store";

export type GardenGoal = Goal & { createdAt: string; lastWateredAt: string | null };

export async function importLocalGoals(): Promise<void> {
  const { data, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  if (!data.session?.user.id) throw new Error("Please sign in to view your garden.");
  const goals = getLegacyGoals(data.session.user.id).filter((value): value is Goal => {
    const g = value as Goal;
    return !!g && !!g.name && Number(g.target) > 0 && !!g.date && Number(g.current) >= 0;
  });
  const { error } = await supabase.rpc("import_savings_goals", { p_goals: goals });
  if (error) throw error;
  const { error: starterError } = await supabase.rpc("initialize_savings_garden_starter");
  if (starterError) throw starterError;
}

interface SavingsGoalRow {
  id: string;
  name: string;
  emoji: string;
  target: number | string;
  current_amount: number | string;
  target_date: string;
  created_at: string;
  last_watered_at: string | null;
}

export async function loadGarden(): Promise<GardenGoal[]> {
  const { data, error } = await supabase.rpc("get_savings_goals");
  if (error) throw error;
  const rows = (data || []) as SavingsGoalRow[];
  const goals: GardenGoal[] = rows.map((g) => ({
    id: g.id, name: g.name, emoji: g.emoji, target: Number(g.target), current: Number(g.current_amount),
    date: g.target_date, createdAt: g.created_at, lastWateredAt: g.last_watered_at,
  }));
  return goals;
}

export async function createGardenGoal(goal: { name: string; emoji: string; target: number; date: string }): Promise<void> {
  const { data: session, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Please sign in to create a goal.");
  const { error } = await supabase.from("savings_goals").insert({
    user_id: userId, name: goal.name, emoji: goal.emoji, target: goal.target, target_date: goal.date,
  });
  if (error) throw error;
}

export async function waterGoal(goalId: string, accountId: string, amount: number, requestId: string): Promise<void> {
  const { error } = await supabase.rpc("water_savings_goal", {
    p_goal_id: goalId, p_account_id: accountId, p_amount: amount, p_request_id: requestId,
  });
  if (error) throw error;
}

export function gardenProgress(current: number, target: number): number {
  return target > 0 ? Math.max(0, Math.min(100, current / target * 100)) : 0;
}

export function isPlantDead(goal: Pick<GardenGoal, "createdAt" | "lastWateredAt">, now: number): boolean {
  return now - new Date(goal.lastWateredAt || goal.createdAt).getTime() >= 30 * 24 * 60 * 60 * 1000;
}

export function lastWateredLabel(date: string | null, now: number): string {
  if (!date) return "Never watered";
  const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "Last watered just now";
  const intervals: [number, string][] = [[31536000, "year"], [2592000, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  const [size, unit] = intervals.find(([size]) => seconds >= size)!;
  const count = Math.floor(seconds / size);
  return `Last watered ${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
