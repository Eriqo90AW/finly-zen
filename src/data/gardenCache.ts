import type { Account } from "../types";
import type { GardenGoal } from "./gardenData";

export interface GardenCache {
  goals: GardenGoal[];
  accounts: Account[];
}

const cacheKey = (userId: string) => `finly_garden_cache_v1_${userId}`;

export function readGardenCache(userId: string): GardenCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.goals) || !Array.isArray(data.accounts)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeGardenCache(userId: string, data: GardenCache): void {
  try { localStorage.setItem(cacheKey(userId), JSON.stringify(data)); } catch { /* Cache is optional. */ }
}

export function clearGardenCache(userId: string): void {
  try { localStorage.removeItem(cacheKey(userId)); } catch { /* Cache is optional. */ }
}
