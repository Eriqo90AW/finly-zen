import { describe, it, expect } from "vitest";
import { getDateRange, getLocalYmd, isDateInRange, resolveCalendarMonth } from "../utils/date";

describe("getDateRange 21-20", () => {
  it("starts on the 21st of the shown month and ends on the 20th of the next month", () => {
    const september = new Date(2026, 8, 15, 12, 0, 0, 0).toISOString();
    const { start, end } = getDateRange(september, "21-20");

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(21);
    expect(start.getHours()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(20);
    expect(end.getHours()).toBe(23);

    expect(isDateInRange(new Date(2026, 8, 20, 15, 0, 0, 0), start, end)).toBe(false);
    expect(isDateInRange(new Date(2026, 8, 21, 0, 0, 0, 0), start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 9, 20, 23, 59, 59, 999), start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 9, 21, 0, 0, 0, 0), start, end)).toBe(false);
  });

  it("rolls December into January of the next year", () => {
    const december = new Date(2026, 11, 1, 12, 0, 0, 0).toISOString();
    const { start, end } = getDateRange(december, "21-20");

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(11);
    expect(start.getDate()).toBe(21);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(20);
  });

  it("opens a cross-month period on today's month", () => {
    const september = new Date(2026, 8, 15, 12, 0, 0, 0).toISOString();
    const period = getDateRange(september, "21-20");
    const today = new Date(2026, 8, 27, 6, 39, 0, 0);
    const view = resolveCalendarMonth(period, today, new Date(2026, 8, 1));

    expect(view.getFullYear()).toBe(2026);
    expect(view.getMonth()).toBe(8);
    expect(view.getDate()).toBe(1);
    expect(getLocalYmd(new Date(2026, 8, 21, 0, 0, 0, 0))).toBe("2026-09-21");
    expect(getLocalYmd(new Date(2026, 8, 26, 0, 0, 0, 0))).toBe("2026-09-26");
  });

  it("stays on September on the 27th even if the header month is October", () => {
    const period = {
      start: new Date(2026, 8, 21, 0, 0, 0, 0),
      end: new Date(2026, 9, 20, 23, 59, 59, 999),
    };
    const view = resolveCalendarMonth(
      period,
      new Date(2026, 8, 27, 6, 39, 0, 0),
      new Date(2026, 9, 1),
    );

    expect(view.getMonth()).toBe(8);
  });
});
