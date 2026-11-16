import { beforeEach, describe, expect, it } from "vitest";
import { clearGardenCache, readGardenCache, writeGardenCache } from "./gardenCache";

describe("garden cache", () => {
  beforeEach(() => localStorage.clear());

  it("keeps cached goals and balances scoped to the signed-in user", () => {
    const data = {
      goals: [{ id: "goal", name: "Trip", target: 100, current: 25, emoji: "✈️", date: "2027-01-01", createdAt: "2026-01-01", lastWateredAt: null }],
      accounts: [{ id: "account", name: "Main", color: "#123456", balance: 75 }],
    };
    writeGardenCache("user-a", data);
    expect(readGardenCache("user-a")).toEqual(data);
    expect(readGardenCache("user-b")).toBeNull();
    clearGardenCache("user-a");
    expect(readGardenCache("user-a")).toBeNull();
  });

  it("ignores corrupt or incomplete cached data", () => {
    localStorage.setItem("finly_garden_cache_v1_user-a", "not json");
    expect(readGardenCache("user-a")).toBeNull();
    localStorage.setItem("finly_garden_cache_v1_user-a", JSON.stringify({ goals: [] }));
    expect(readGardenCache("user-a")).toBeNull();
  });
});
