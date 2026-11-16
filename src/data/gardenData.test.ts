import { describe, expect, it, vi } from "vitest";
const { rpc, getSession, getLegacyGoals, setState } = vi.hoisted(() => ({ rpc: vi.fn(), getSession: vi.fn(), getLegacyGoals: vi.fn(), setState: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { rpc, auth: { getSession } } }));
vi.mock("../store", () => ({ getLegacyGoals, setState }));
import { gardenProgress, isPlantDead, lastWateredLabel, importLocalGoals, loadGarden, waterGoal } from "./gardenData";

describe("savings garden presentation", () => {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const day = 86400000;
  const start = Date.parse(createdAt);
  it("caps growth while allowing progress beyond the target", () => {
    expect(gardenProgress(250, 100)).toBe(100);
    expect(gardenProgress(50, 100)).toBe(50);
    expect(gardenProgress(5, 0)).toBe(0);
  });
  it("marks an unwatered plant dead at 30 days and revives after watering", () => {
    expect(isPlantDead({ createdAt, lastWateredAt: null }, start + 30 * day - 1)).toBe(false);
    expect(isPlantDead({ createdAt, lastWateredAt: null }, start + 30 * day)).toBe(true);
    expect(isPlantDead({ createdAt, lastWateredAt: new Date(start + 30 * day).toISOString() }, start + 30 * day)).toBe(false);
  });
  it("shows never, recent, and elapsed watering times", () => {
    expect(lastWateredLabel(null, start)).toBe("Never watered");
    expect(lastWateredLabel(createdAt, start + 5000)).toBe("Last watered just now");
    expect(lastWateredLabel(createdAt, start + 2 * day)).toBe("Last watered 2 days ago");
  });
});


describe("savings garden data", () => {
  it("imports the signed-in user's valid legacy goals", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    getLegacyGoals.mockReturnValue([{ name: "Trip", target: 100, current: 40, date: "2027-01-01" }, { name: "Invalid", target: 0 }]);
    rpc.mockResolvedValue({ error: null });
    await importLocalGoals();
    expect(getLegacyGoals).toHaveBeenCalledWith("user-1");
    expect(rpc).toHaveBeenCalledWith("import_savings_goals", { p_goals: [{ name: "Trip", target: 100, current: 40, date: "2027-01-01" }] });
    expect(rpc).toHaveBeenLastCalledWith("initialize_savings_garden_starter");
  });
  it("maps persisted progress and passes a stable id to the atomic watering operation", async () => {
    rpc.mockResolvedValueOnce({ data: [{ id: "g", name: "Trip", emoji: "🌱", target: "100", current_amount: "120", target_date: "2027-01-01", created_at: "2026-01-01", last_watered_at: null }], error: null });
    const goals = await loadGarden();
    expect(goals[0].current).toBe(120);
    rpc.mockResolvedValueOnce({ error: null });
    await waterGoal("g", "a", 50, "request-1");
    expect(rpc).toHaveBeenLastCalledWith("water_savings_goal", { p_goal_id: "g", p_account_id: "a", p_amount: 50, p_request_id: "request-1" });
    rpc.mockResolvedValueOnce({ error: new Error("failed") });
    await expect(waterGoal("g", "a", 50, "request-1")).rejects.toThrow("failed");
  });
});
