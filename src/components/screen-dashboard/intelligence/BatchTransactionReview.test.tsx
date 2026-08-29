import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import BatchTransactionReview from "./BatchTransactionReview";
import type { PendingBatchTransactionAction } from "../../../types/intelligence";
import {
  intelligenceState,
  setIntelligenceState,
} from "../../../store/intelligenceStore";

vi.mock("../../../data/expenseData", () => ({
  getAccounts: vi.fn().mockResolvedValue([
    { id: "acc-1", name: "BCA Main", color: "#1a4d2e" },
    { id: "acc-2", name: "Bank Jago", color: "#f59e0b" },
  ]),
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-1", name: "Food & Dining", color: "#d47b5a" },
    { id: "cat-2", name: "Bills & Utilities", color: "#6366f1" },
    { id: "cat-3", name: "Shopping", color: "#f43f5e" },
  ]),
  addTransactions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../services/intelligence/chatOrchestrator", () => ({
  saveBatchTransactions: vi.fn(),
  finishBatchAction: vi.fn(),
  cancelPendingAction: vi.fn(),
}));

describe("BatchTransactionReview Component", () => {
  const createMockAction = (): PendingBatchTransactionAction => ({
    id: "action-1",
    kind: "transaction-batch",
    toolCallId: "tool-1",
    toolName: "propose_add_transactions",
    source: "ocr",
    merchant: "Superindo Supermarket",
    receiptTotal: 65000,
    ocrConfidence: 95,
    originatingProfile: "finly",
    originatingPath: "/",
    createdAt: Date.now(),
    drafts: [
      {
        id: "draft-1",
        name: "Fresh Milk",
        amount: 25000,
        type: "expense",
        entryKind: "item",
        accountId: "acc-1",
        accountName: "BCA Main",
        categoryId: "cat-1",
        categoryName: "Food & Dining",
        date: "2026-08-29",
        status: "ready",
        selected: true,
      },
      {
        id: "draft-2",
        name: "Laundry Detergent",
        amount: 45000,
        type: "expense",
        entryKind: "item",
        accountId: "acc-1",
        accountName: "BCA Main",
        categoryId: "cat-3",
        categoryName: "Shopping",
        date: "2026-08-29",
        status: "ready",
        selected: true,
      },
      {
        id: "draft-3",
        name: "Member Discount",
        amount: 5000,
        type: "income",
        entryKind: "discount",
        accountId: "acc-1",
        accountName: "BCA Main",
        categoryId: "cat-1",
        categoryName: "Food & Dining",
        date: "2026-08-29",
        status: "ready",
        selected: true,
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const action = createMockAction();
    setIntelligenceState("pendingAction", action);
  });

  it("renders all entries, merchant header, and calculates net selected total (65,000)", () => {
    render(() => (
      <BatchTransactionReview
        action={intelligenceState.pendingAction as PendingBatchTransactionAction}
      />
    ));

    expect(screen.getByText("Superindo Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Receipt OCR")).toBeInTheDocument();
    expect(screen.getByText("Fresh Milk")).toBeInTheDocument();
    expect(screen.getByText("Laundry Detergent")).toBeInTheDocument();
    expect(screen.getByText("Member Discount")).toBeInTheDocument();

    // Net total: 25,000 + 45,000 - 5,000 = 65,000
    expect(screen.getAllByText("Rp65.000").length).toBeGreaterThan(0);
    expect(screen.getByText(/Reconciled: Receipt matches selected total/)).toBeInTheDocument();
  });

  it("allows selecting and deselecting drafts", () => {
    render(() => (
      <BatchTransactionReview
        action={intelligenceState.pendingAction as PendingBatchTransactionAction}
      />
    ));

    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    // Selected count should be 0 valid
    expect(screen.getByText(/Selected: 0 valid/)).toBeInTheDocument();

    const selectValidButton = screen.getByText("Select Valid");
    fireEvent.click(selectValidButton);

    // Selected count restored to 3 valid
    expect(screen.getByText(/Selected: 3 valid/)).toBeInTheDocument();
  });

  it("allows excluding a draft line and updates the live net total", () => {
    render(() => (
      <BatchTransactionReview
        action={intelligenceState.pendingAction as PendingBatchTransactionAction}
      />
    ));

    const excludeButtons = screen.getAllByTitle("Exclude entry");
    expect(excludeButtons.length).toBe(3);

    // Exclude the 2nd item (Laundry Detergent: 45,000)
    fireEvent.click(excludeButtons[1]);

    // Net total becomes: 25,000 - 5,000 = 20,000
    expect(screen.getByText("Rp20.000")).toBeInTheDocument();
  });

  it("displays Finish button when some rows are saved instead of Cancel", () => {
    const action = createMockAction();
    action.drafts[0].status = "saved";
    action.drafts[0].selected = false;
    setIntelligenceState("pendingAction", action);

    render(() => (
      <BatchTransactionReview
        action={intelligenceState.pendingAction as PendingBatchTransactionAction}
      />
    ));

    expect(screen.getByText("Finish (1 saved)")).toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});
