import { describe, it, expect } from "vitest";
import { getLocalYmd, composeDateWithTime } from "../utils/date";

describe("Transaction Drawer Date & Time Handling", () => {
  it("formats local YMD date without timezone day drift", () => {
    // 2026-08-29
    const localDate = new Date(2026, 7, 29, 23, 30, 0); // local 29 Aug 23:30
    const ymd = getLocalYmd(localDate);
    expect(ymd).toBe("2026-08-29");
  });

  it("preserves original time of day when editing transaction calendar date", () => {
    const originalIso = "2026-08-15T14:45:30.123Z";
    const originalDate = new Date(originalIso);
    const originalHours = originalDate.getHours();
    const originalMinutes = originalDate.getMinutes();
    const originalSeconds = originalDate.getSeconds();

    const updatedDate = composeDateWithTime("2026-08-20", originalIso);

    expect(updatedDate.getFullYear()).toBe(2026);
    expect(updatedDate.getMonth()).toBe(7); // August = 7
    expect(updatedDate.getDate()).toBe(20);
    expect(updatedDate.getHours()).toBe(originalHours);
    expect(updatedDate.getMinutes()).toBe(originalMinutes);
    expect(updatedDate.getSeconds()).toBe(originalSeconds);
  });

  it("uses current time when creating new transaction date", () => {
    const now = new Date();
    const resultDate = composeDateWithTime("2026-08-25");

    expect(resultDate.getFullYear()).toBe(2026);
    expect(resultDate.getMonth()).toBe(7);
    expect(resultDate.getDate()).toBe(25);
    expect(resultDate.getHours()).toBe(now.getHours());
  });
});
