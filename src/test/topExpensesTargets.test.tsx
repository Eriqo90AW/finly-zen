import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  supabase: {},
  SUPABASE_URL: "http://localhost",
  SUPABASE_ANON_KEY: "test-key",
}));

import { render, screen } from "@solidjs/testing-library";
import { TopExpensesAndTargetsCard } from "../components/screen-dashboard/TopExpensesCard";
import { resetAppState, setState } from "../store";
import { formatRupiah } from "../utils/format";
import type { Transaction } from "../types";

const expense = (category: string, amount: number): Transaction => ({
  id: category,
  amount,
  category,
  name: category,
  type: "expense",
  date: "2026-09-10T00:00:00.000Z",
  note: "",
});

describe("Category targets header total", () => {
  beforeEach(() => {
    resetAppState();
  });

  it("shows the sum of listed category targets", () => {
    setState("budgets", [
      { category: "Food", limit: 2_400_000 },
      { category: "Transport", limit: 800_000 },
      { category: "Debt", limit: 9_000_000 },
    ]);

    render(() => (
      <TopExpensesAndTargetsCard
        transactions={[expense("Food", 100_000), expense("Shopping", 50_000)]}
        loading={false}
      />
    ));

    // Food 2.4jt + Transport 800rb + Shopping default 1.2jt. Debt is hidden.
    expect(screen.queryByText("Click target to edit")).toBeNull();
    expect(screen.getByText(formatRupiah(4_400_000))).toBeTruthy();
  });

  it("ranks every expense, highlights the first three, and clips the rest", () => {
    setState("budgets", []);
    const { container } = render(() => (
      <TopExpensesAndTargetsCard
        transactions={[
          expense("Alpha", 10_000),
          expense("Beta", 40_000),
          expense("Gamma", 30_000),
          expense("Delta", 20_000),
          { ...expense("Paycheck", 99_000), id: "income", type: "income" },
        ]}
        loading={false}
      />
    ));

    const names = [...container.querySelectorAll("p.font-semibold")].map((el) => el.textContent);
    const ranks = [...container.querySelectorAll("span.tabular-nums")].map((el) => el.textContent);

    expect(names).toEqual(["Beta", "Gamma", "Delta", "Alpha"]);
    expect(ranks).toEqual(["1", "2", "3", "4"]);
    expect(screen.queryByText("Paycheck")).toBeNull();

    const badges = [...container.querySelectorAll("span.tabular-nums")];
    expect(badges[0].className).toContain("bg-amber-500/20");
    expect(badges[1].className).toContain("bg-slate-400/20");
    expect(badges[2].className).toContain("bg-amber-700/20");
    expect(badges[3].className).not.toContain("bg-");
    expect(container.querySelector(".max-h-36")).toBeTruthy();
  });
});
