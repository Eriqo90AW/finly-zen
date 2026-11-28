import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "../types";

const { loadGarden, getAccounts, importLocalGoals, mockTransactions, mockState } = vi.hoisted(() => ({
  loadGarden: vi.fn(),
  getAccounts: vi.fn(),
  importLocalGoals: vi.fn(),
  mockTransactions: vi.fn<() => Transaction[]>(() => []),
  mockState: {
    ui: {
      currentMonth: new Date(2026, 3, 1).toISOString(),
      datePeriod: "1-30" as const,
    },
  },
}));

vi.mock("../context/authContext", () => ({
  useAuth: () => ({ user: () => ({ id: "garden-test-user" }) }),
}));
vi.mock("../store", () => ({ setState: vi.fn(), state: mockState }));
vi.mock("../store/transactionStore", () => ({ transactions: () => mockTransactions() }));
vi.mock("../data/expenseData", () => ({ getAccounts }));
vi.mock("../data/gardenData", () => ({
  loadGarden,
  importLocalGoals,
  createGardenGoal: vi.fn(),
  waterGoal: vi.fn(),
  gardenProgress: () => 0,
  isPlantDead: () => false,
  lastWateredLabel: () => "Never watered",
}));

import { clearGardenCache, writeGardenCache } from "../data/gardenCache";
import Goals from "./Goals";

const goal = (name: string) => ({
  id: "goal",
  name,
  target: 100,
  current: 0,
  emoji: "🌱",
  date: "2027-01-01",
  createdAt: "2026-01-01",
  lastWateredAt: null,
});

describe("Goals page", () => {
  it("shows the cached garden immediately and replaces it with fresh data", async () => {
    let resolveGoals!: (value: ReturnType<typeof goal>[]) => void;
    loadGarden.mockReturnValue(
      new Promise((resolve) => {
        resolveGoals = resolve;
      }),
    );
    getAccounts.mockResolvedValue([]);
    mockTransactions.mockReturnValue([]);
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

  it("displays period-scoped non-transfer account balance in the Water it modal", async () => {
    clearGardenCache("garden-test-user");
    loadGarden.mockResolvedValue([goal("Emergency Buffer")]);
    getAccounts.mockResolvedValue([{ id: "acc-bca", name: "BCA", color: "#1a4d2e" }]);
    mockTransactions.mockReturnValue([
      {
        id: "tx-in",
        name: "Salary",
        category: "Salary",
        amount: 4_000_000,
        type: "income",
        date: "2026-04-05T10:00:00",
        accountId: "acc-bca",
        accountName: "BCA",
        note: "",
      },
      {
        id: "tx-out",
        name: "Groceries",
        category: "Food",
        amount: 500_000,
        type: "expense",
        date: "2026-04-08T10:00:00",
        accountId: "acc-bca",
        accountName: "BCA",
        note: "",
      },
      {
        id: "tx-transfer",
        name: "Transfer out",
        category: "Debt",
        isRecurring: true,
        amount: 1_000_000,
        type: "expense",
        date: "2026-04-09T10:00:00",
        accountId: "acc-bca",
        accountName: "BCA",
        note: "",
      },
      {
        id: "tx-old",
        name: "Old Income",
        category: "Salary",
        amount: 9_000_000,
        type: "income",
        date: "2026-02-01T10:00:00",
        accountId: "acc-bca",
        accountName: "BCA",
        note: "",
      },
    ]);

    const result = render(() => <Goals />);
    const waterBtn = await screen.findByRole("button", { name: /Water it/i });
    fireEvent.click(waterBtn);

    await waitFor(() => {
      // Period balance = 4,000,000 - 500,000 = Rp 3.500.000 (transfer & Feb tx excluded)
      expect(screen.getByText(/Rp\s*3\.500\.000/)).toBeTruthy();
    });

    result.unmount();
    clearGardenCache("garden-test-user");
  });
});
