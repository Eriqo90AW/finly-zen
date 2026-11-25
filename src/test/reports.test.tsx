import { cleanup, fireEvent, render, screen, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, expect, it, vi } from "vitest";
import type { Transaction } from "../types";
import { summarizeBudgets } from "../utils/budgetSummary";
import { getDateRange } from "../utils/date";
import { formatRupiah } from "../utils/format";
import Reports from "../pages/Reports";
import { HeroCard } from "../components/screen-dashboard/HeroCard";

const currentMonth = "2026-11-10T12:00:00";
vi.mock("../store", () => ({
  state: { ui: { currentMonth: "2026-11-10T12:00:00", datePeriod: "21-20", selectedAccount: null, showAllTime: false } },
  setSelectedAccount: vi.fn(),
  toggleShowAllTime: vi.fn(),
}));
const [ledger, setLedger] = createSignal<Transaction[]>([]);
vi.mock("../store/transactionStore", () => ({
  transactions: () => ledger(),
  isTransactionsLoading: () => false,
  transactionsError: () => null,
  openEditTransaction: vi.fn(),
  initializeTransactions: vi.fn(),
}));

const entry = (patch: Partial<Transaction>): Transaction => ({
  id: "loan", accountId: "main", type: "expense", category: "Debt", name: "Loan repayment",
  amount: 600_000, date: "2026-11-12T12:00:00", note: "", isRecurring: true,
  ...patch,
});

afterEach(() => {
  cleanup();
  setLedger([]);
  vi.useRealTimers();
});

it("shows an empty state and reconciles edited and deleted entries with budgets", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T12:00:00"));
  render(() => <Reports />);
  expect(screen.getByText("Add income or an expense to see your cash-flow reports.")).toBeVisible();
  const opening = entry({ id: "opening", amount: 2_000_000, type: "income", entryKind: "opening_balance" });
  const salary = entry({ id: "salary", amount: 1_500_000, type: "income", name: "Salary" });
  const transfer = entry({ id: "transfer", amount: 800_000, entryKind: "transfer", transferId: "pair" });
  const incoming = entry({ ...transfer, id: "transfer-in", accountId: "savings", type: "income" });
  const nextPeriod = entry({ id: "later", name: "Later expense", date: "2026-11-21T12:00:00" });
  const { start, end } = getDateRange(currentMonth, "21-20");
  setLedger([opening, salary, transfer, incoming, nextPeriod, entry({})]);

  const dashboard = render(() => <HeroCard allTransactions={ledger()} monthlyTransactions={[]} loading={false} />);
  const dashboardCard = within(dashboard.container);
  expect(dashboardCard.getByText(`Monthly net cash flow · Available ${formatRupiah(2_300_000)}`)).toBeVisible();
  expect(screen.getByLabelText(`Income ${formatRupiah(1_500_000)}`)).toBeVisible();
  fireEvent.click(screen.getByLabelText(`Spending ${formatRupiah(600_000)}`));
  const detail = screen.getByLabelText("Contributing transactions");
  expect(within(detail).getByText("Loan repayment")).toBeVisible();
  expect(within(detail).queryByText("Later expense")).toBeNull();
  expect(summarizeBudgets(ledger(), [], start, end, "")[0].spent).toBe(600_000);

  setLedger([opening, salary, transfer, incoming, nextPeriod, entry({ amount: 300_000 })]);
  expect(within(detail).getByText(`−${formatRupiah(300_000)}`)).toBeVisible();
  expect(summarizeBudgets(ledger(), [], start, end, "")[0].spent).toBe(300_000);
  expect(dashboardCard.getByText(`Monthly net cash flow · Available ${formatRupiah(2_600_000)}`)).toBeVisible();

  setLedger([opening, salary, transfer, incoming, nextPeriod]);
  expect(within(detail).getByText("No contributing entries.")).toBeVisible();
  expect(summarizeBudgets(ledger(), [], start, end, "")).toEqual([]);
  expect(dashboardCard.getByText(`Monthly net cash flow · Available ${formatRupiah(2_900_000)}`)).toBeVisible();
}, 15_000);
