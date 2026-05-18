import { DatePeriod } from "../types";

export const getDateRange = (currentMonthStr: string, period: DatePeriod): { start: Date; end: Date } => {
  const current = new Date(currentMonthStr);
  const year = current.getFullYear();
  const month = current.getMonth();

  if (period === "1-30") {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "21-20") {
    const start = new Date(year, month - 1, 21, 0, 0, 0, 0);
    const end = new Date(year, month, 20, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "25-25") {
    // Assuming 26th of prev to 25th of current
    const start = new Date(year, month - 1, 26, 0, 0, 0, 0);
    const end = new Date(year, month, 25, 23, 59, 59, 999);
    return { start, end };
  }

  // Default to 1-30
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const isDateInRange = (dateStr: string | Date, start: Date, end: Date): boolean => {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d >= start && d <= end;
};
