import { createRoot } from "solid-js";
import { expect, it } from "vitest";
import {
  addMessage, getActiveMessages, intelligenceState, setIntelligenceError, setStreaming,
  setupIntelligencePersistence, switchIntelligenceUser,
} from "../store/intelligenceStore";

it("isolates receipts, messages and active chat state across users on the same browser", () => {
  localStorage.setItem("finly_zen_hermes_chat_v2", JSON.stringify({
    profileMessages: { finly: [{ role: "user", content: "unowned receipt" }] },
  }));
  const dispose = createRoot(dispose => {
    setupIntelligencePersistence();
    return dispose;
  });
  try {
    switchIntelligenceUser("a");
    expect(getActiveMessages()).toEqual([]);
    addMessage("finly", { id: "receipt", role: "user", content: "My receipt", imageBase64: "receipt-image", createdAt: 1 });
    setStreaming(true);
    setIntelligenceError("Account A error");

    switchIntelligenceUser(null);
    expect(getActiveMessages()).toEqual([]);
    switchIntelligenceUser("b");
    expect(getActiveMessages()).toEqual([]);
    expect(intelligenceState.isStreaming).toBe(false);
    expect(intelligenceState.error).toBeNull();
    addMessage("finly", { id: "b", role: "user", content: "Second account", createdAt: 2 });

    switchIntelligenceUser("a");
    expect(getActiveMessages()).toMatchObject([{ id: "receipt", imageBase64: "receipt-image" }]);
    switchIntelligenceUser("b");
    expect(getActiveMessages()).toMatchObject([{ id: "b" }]);
  } finally {
    switchIntelligenceUser(null);
    dispose();
    localStorage.clear();
  }
});
