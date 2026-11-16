import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@solidjs/testing-library";

const { loadGarden, getAccountsWithBalances, importLocalGoals } = vi.hoisted(() => ({
  loadGarden: vi.fn(), getAccountsWithBalances: vi.fn(), importLocalGoals: vi.fn(),
}));
vi.mock("../context/authContext", () => ({ useAuth: () => ({ user: () => ({ id: "garden-test-user" }) }) }));
vi.mock("../store", () => ({ setState: vi.fn() }));
vi.mock("../data/expenseData", () => ({ getAccountsWithBalances }));
vi.mock("../data/gardenData", () => ({
  loadGarden, importLocalGoals, createGardenGoal: vi.fn(), waterGoal: vi.fn(),
  gardenProgress: () => 0, isPlantDead: () => false, lastWateredLabel: () => "Never watered",
}));
import Goals from "./Goals";
import { writeGardenCache, clearGardenCache } from "../data/gardenCache";

const goal = (name: string) => ({ id: "goal", name, target: 100, current: 0, emoji: "🌱", date: "2027-01-01", createdAt: "2026-01-01", lastWateredAt: null });

describe("garden cached loading", () => {
  it("shows the cached garden immediately and replaces it with fresh data", async () => {
    let resolveGoals!: (value: ReturnType<typeof goal>[]) => void;
    loadGarden.mockReturnValue(new Promise(resolve => { resolveGoals = resolve; }));
    getAccountsWithBalances.mockResolvedValue([]);
    writeGardenCache("garden-test-user", { goals: [goal("Cached trip")], accounts: [] });
    const result = render(() => <Goals />);
    expect(screen.getByText(/Cached trip/)).toBeTruthy();
    expect(screen.queryByText("Loading your garden...")).toBeNull();
    expect(importLocalGoals).not.toHaveBeenCalled();
    resolveGoals([goal("Fresh trip")]);
    await waitFor(() => expect(screen.getByText(/Fresh trip/)).toBeTruthy());
    expect(screen.queryByText(/Cached trip/)).toBeNull();
    result.unmount();
    clearGardenCache("garden-test-user");
  });
});
