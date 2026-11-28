import { getDateRange, isDateInRange } from "../../../utils/date";
import { isTransferTransaction } from "../../../utils/transferUtils";
import type { DatePeriod, Transaction } from "../../../types";

export interface HeroAccountEntry {
  name: string;
  color: string | undefined;
}

export interface HeroAccountStats extends HeroAccountEntry {
  income: number;
  expenses: number;
  nonRecurringExpenses: number;
  firstDateTime: number;
  net: number;
  dailyAvg: number;
  dailyAvgNonRecurring: number;
}

interface RawAccountAccumulator extends HeroAccountEntry {
  income: number;
  expenses: number;
  nonRecurringExpenses: number;
  firstDateTime: number;
}

export const deriveHeroAccounts = (
  allTransactions: Transaction[],
): HeroAccountEntry[] => {
  const accs = new Map<string, string | undefined>();
  allTransactions.forEach((t) => {
    if (t.accountName && !accs.has(t.accountName)) {
      accs.set(t.accountName, t.accountColor);
    }
  });

  return [
    { name: "All Accounts", color: undefined },
    ...Array.from(accs.entries()).map(([name, color]) => ({ name, color })),
  ];
};

export const computeHeroAccountStats = (
  allTransactions: Transaction[],
  accList: HeroAccountEntry[],
  showAllTime: boolean,
  currentMonth: string,
  datePeriod: DatePeriod,
): HeroAccountStats[] => {
  const { start, end } = getDateRange(currentMonth, datePeriod);
  const dataSource = showAllTime
    ? allTransactions
    : (allTransactions || []).filter((t) => isDateInRange(t.date, start, end));
  const now = new Date();

  let monthlyDivisor: number;
  if (now >= start && now <= end) {
    monthlyDivisor = Math.ceil(
      Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  } else {
    monthlyDivisor = Math.ceil(
      Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
  monthlyDivisor = Math.max(1, monthlyDivisor || 1);

  const statsMap = new Map<string, RawAccountAccumulator>();
  accList.forEach((acc) => {
    statsMap.set(acc.name, {
      ...acc,
      income: 0,
      expenses: 0,
      nonRecurringExpenses: 0,
      firstDateTime: Infinity,
    });
  });

  for (const t of dataSource) {
    const isTransfer = isTransferTransaction(t);
    if (!showAllTime && isTransfer) continue;

    const amount = t.amount || 0;
    const type = t.type;
    const accName = t.accountName;
    const isRecurring = t.isRecurring;
    const time = showAllTime ? new Date(t.date).getTime() : 0;

    if (accName) {
      const accountStats = statsMap.get(accName);
      if (accountStats) {
        if (type === "income") accountStats.income += amount;
        else if (type === "expense") {
          accountStats.expenses += amount;
          if (!isRecurring) accountStats.nonRecurringExpenses += amount;
        }
        if (showAllTime && time < accountStats.firstDateTime) {
          accountStats.firstDateTime = time;
        }
      }
    }

    const all = statsMap.get("All Accounts");
    if (all) {
      if (type === "income") all.income += amount;
      else if (type === "expense") {
        all.expenses += amount;
        if (!isRecurring) all.nonRecurringExpenses += amount;
      }
      if (showAllTime && time < all.firstDateTime) all.firstDateTime = time;
    }
  }

  return accList.map((acc) => {
    const s = statsMap.get(acc.name) as RawAccountAccumulator;
    const net = s.income - s.expenses;

    let divisor = monthlyDivisor;
    if (showAllTime) {
      if (s.firstDateTime === Infinity) {
        divisor = 1;
      } else {
        divisor = Math.max(
          1,
          Math.ceil(
            (now.getTime() - s.firstDateTime) / (1000 * 60 * 60 * 24),
          ),
        );
      }
    }

    return {
      ...s,
      net,
      dailyAvg: s.expenses / divisor,
      dailyAvgNonRecurring: s.nonRecurringExpenses / divisor,
    };
  });
};
