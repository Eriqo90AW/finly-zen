import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveBatchTransactions,
  finishBatchAction,
  cancelPendingAction,
  resetConversation,
  sendIntelligenceMessage,
} from "./chatOrchestrator";
import {
  intelligenceState,
  setIntelligenceState,
  clearIntelligenceChat,
} from "../../store/intelligenceStore";
import * as expenseDataModule from "../../data/expenseData";
import * as hermesModule from "../../lib/hermesClient";
import * as ocrModule from "../../lib/ocrService";
import type {
  PendingBatchTransactionAction,
} from "../../types/intelligence";

vi.mock("../../data/expenseData", () => ({
  addTransactions: vi.fn(),
  getAccounts: vi.fn().mockResolvedValue([]),
  getCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../lib/hermesClient", () => ({
  isHermesConfigured: vi.fn().mockReturnValue(true),
  createChatCompletion: vi.fn(),
}));


vi.mock("../../lib/ocrService", () => ({
  extractTextFromImage: vi.fn(),
}));

vi.mock("../../lib/userContext", () => ({
  buildUserContext: vi.fn().mockResolvedValue({
    userId: "user-123",
    userName: "Eriqo",
    accounts: [{ id: "acc-1", name: "BCA Main" }],
    portfolios: [],
    categories: [{ id: "cat-1", name: "Food & Dining" }],
    selectedAccountName: "BCA Main",
    selectedAccountId: "acc-1",
    activePortfolioId: null,
    activePortfolioName: null,
    budgets: [],
    goals: [],
    currentPage: {
      name: "Dashboard",
      path: "/",
      focus: "Overview",
      assistantName: "Finly",
      assistantRole: "Financial Assistant",
      model: "finly",
      suggestedQuestions: [],
    },
  }),
  formatContextForPrompt: vi.fn().mockReturnValue("System prompt"),
}));

describe("chatOrchestrator Multi-Entry & Batch Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIntelligenceChat("finly");
  });

  it("saves valid selected drafts, locks them as saved, and finishes when all complete", async () => {
    const mockAction: PendingBatchTransactionAction = {
      id: "batch-1",
      kind: "transaction-batch",
      toolCallId: "call-1",
      toolName: "propose_add_transactions",
      source: "chat",
      originatingProfile: "finly",
      originatingPath: "/",
      createdAt: Date.now(),
      drafts: [
        {
          id: "draft-1",
          name: "Coffee",
          amount: 25000,
          type: "expense",
          entryKind: "item",
          accountId: "acc-1",
          accountName: "BCA Main",
          categoryId: "cat-1",
          categoryName: "Food & Dining",
          status: "ready",
          selected: true,
        },
      ],
    };

    setIntelligenceState("pendingAction", mockAction);

    vi.spyOn(expenseDataModule, "addTransactions").mockResolvedValue([
      {
        index: 0,
        success: true,
        data: {
          transaction_id: "tx-coffee",
          amount: 25000,
          category_name: "Food & Dining",
          transaction_name: "Coffee",
          account_name: "BCA Main",
          transaction_type: "expense",
          created_at: new Date().toISOString(),
          is_recurring: false,
        },
      },
    ]);

    await saveBatchTransactions();

    // After saving all drafts, pendingAction is cleared and summary message is added
    expect(intelligenceState.pendingAction).toBeNull();
    const messages = intelligenceState.profileMessages.finly || [];
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain("Saved 1 transaction totaling Rp25.000 net.");
  });

  it("handles partial failure, locks successful row, and leaves failed row editable", async () => {
    const mockAction: PendingBatchTransactionAction = {
      id: "batch-partial",
      kind: "transaction-batch",
      toolCallId: "call-partial",
      toolName: "propose_add_transactions",
      source: "chat",
      originatingProfile: "finly",
      originatingPath: "/",
      createdAt: Date.now(),
      drafts: [
        {
          id: "draft-1",
          name: "Lunch",
          amount: 50000,
          type: "expense",
          entryKind: "item",
          accountId: "acc-1",
          categoryId: "cat-1",
          status: "ready",
          selected: true,
        },
        {
          id: "draft-2",
          name: "Dinner",
          amount: 75000,
          type: "expense",
          entryKind: "item",
          accountId: "acc-1",
          categoryId: "cat-1",
          status: "ready",
          selected: true,
        },
      ],
    };

    setIntelligenceState("pendingAction", mockAction);

    vi.spyOn(expenseDataModule, "addTransactions").mockResolvedValue([
      {
        index: 0,
        success: true,
        data: {
          transaction_id: "tx-lunch",
          amount: 50000,
          category_name: "Food & Dining",
          transaction_name: "Lunch",
          account_name: "BCA Main",
          transaction_type: "expense",
          created_at: new Date().toISOString(),
          is_recurring: false,
        },
      },
      {
        index: 1,
        success: false,
        error: "Database constraint error",
      },
    ]);

    await saveBatchTransactions();

    const pending = intelligenceState.pendingAction as PendingBatchTransactionAction;
    expect(pending).not.toBeNull();
    expect(pending.drafts[0].status).toBe("saved");
    expect(pending.drafts[0].selected).toBe(false);

    expect(pending.drafts[1].status).toBe("failed");
    expect(pending.drafts[1].errorMessage).toBe("Database constraint error");

    // User finishes with 1 saved
    await finishBatchAction();
    expect(intelligenceState.pendingAction).toBeNull();
    const messages = intelligenceState.profileMessages.finly || [];
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain("Saved 1 transaction totaling Rp50.000 net (1 failed).");
  });

  it("cancelling after partial save resolves with saved count rather than discarding saved rows", async () => {
    const mockAction: PendingBatchTransactionAction = {
      id: "batch-partial-2",
      kind: "transaction-batch",
      toolCallId: "call-partial-2",
      toolName: "propose_add_transactions",
      source: "chat",
      originatingProfile: "finly",
      originatingPath: "/",
      createdAt: Date.now(),
      drafts: [
        {
          id: "draft-1",
          name: "Item 1",
          amount: 20000,
          type: "expense",
          entryKind: "item",
          accountId: "acc-1",
          categoryId: "cat-1",
          status: "saved",
          selected: false,
        },
        {
          id: "draft-2",
          name: "Item 2",
          amount: 30000,
          type: "expense",
          entryKind: "item",
          accountId: "acc-1",
          categoryId: "cat-1",
          status: "failed",
          selected: true,
        },
      ],
    };

    setIntelligenceState("pendingAction", mockAction);

    await cancelPendingAction();

    expect(intelligenceState.pendingAction).toBeNull();
    const messages = intelligenceState.profileMessages.finly || [];
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.content).toContain("Saved 1 transaction totaling Rp20.000 net (1 failed).");
  });

  it("resetConversation cancels and resolves any pending action without hanging", () => {
    const mockAction: PendingBatchTransactionAction = {
      id: "batch-reset",
      kind: "transaction-batch",
      toolCallId: "call-reset",
      toolName: "propose_add_transactions",
      source: "chat",
      originatingProfile: "finly",
      originatingPath: "/",
      createdAt: Date.now(),
      drafts: [],
    };

    setIntelligenceState("pendingAction", mockAction);
    resetConversation("finly");

    expect(intelligenceState.pendingAction).toBeNull();
    expect(intelligenceState.profileMessages.finly).toEqual([]);
  });

  it("passes OCR confidence with image text handoff to the model", async () => {
    vi.mocked(ocrModule.extractTextFromImage).mockResolvedValue({
      rawText: "Total: 50.000 Indomaret",
      confidence: 88,
    });

    vi.mocked(hermesModule.createChatCompletion).mockResolvedValue({
      id: "resp-1",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "I have read your receipt with 88% confidence.",
          },
          finish_reason: "stop",
        },
      ],
    });

    await sendIntelligenceMessage("", "/", {
      base64: "data:image/png;base64,abc",
      fileName: "receipt.png",
    });

    const messages = intelligenceState.profileMessages.finly || [];
    expect(messages.length).toBeGreaterThan(0);
    const userMsg = messages[0];
    expect(userMsg.content).toContain("OCR Confidence: 88%");
    expect(userMsg.content).toContain("Total: 50.000 Indomaret");
  });
});
