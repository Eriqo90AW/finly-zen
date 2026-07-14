import { MonthlyPerformance, DailySummary } from "./types";

export const mockMonthlyPerformance: MonthlyPerformance = {
  monthName: "July 2026",
  streak: 12,
  totalPnL: 12450000, // Rp12.450.000
  totalR: 42.5,
  winRate: 68,
  profitFactor: 2.4,
};

export const mockDailySummaries: DailySummary[] = [
  {
    date: "2026-07-01",
    dayNumber: 1,
    grossReturn: 470000,
    netReturn: 450000,
    fees: 20000,
    tradesCount: 1,
    trades: [
      {
        ticker: "BBRI",
        setup: "Breakout",
        returnR: 1.2,
        pnl: 470000,
        entry: 4800,
        stopLoss: 4750,
        takeProfit: 4920,
        checklist: ["Volume Expansion", "VWAP Support"],
        psychologyTags: ["Patience"],
        notes: "Solid breakout play at market open.",
      },
    ],
  },
  {
    date: "2026-07-02",
    dayNumber: 2,
    grossReturn: 1250000,
    netReturn: 1200000,
    fees: 50000,
    tradesCount: 2,
    trades: [
      {
        ticker: "TLKM",
        setup: "Reversal",
        returnR: 3.0,
        pnl: 900000,
        entry: 3600,
        stopLoss: 3550,
        takeProfit: 3750,
        checklist: ["Daily Support", "Hammer Candle"],
        psychologyTags: ["Disciplined"],
        notes: "Caught the reversal off the 21 EMA.",
      },
      {
        ticker: "ADRO",
        setup: "Momentum",
        returnR: 1.0,
        pnl: 350000,
        entry: 2800,
        stopLoss: 2750,
        takeProfit: 2900,
        checklist: ["VWAP Support"],
        psychologyTags: ["FOMO Control"],
        notes: "Quick scalp, scaled out fast.",
      }
    ],
  },
  {
    date: "2026-07-03",
    dayNumber: 3,
    grossReturn: 30000,
    netReturn: 0,
    fees: 30000,
    tradesCount: 2,
    trades: [
      {
        ticker: "GOTO",
        setup: "Chop",
        returnR: 0.5,
        pnl: 150000,
        entry: 70,
        stopLoss: 68,
        takeProfit: 75,
        checklist: ["Range Bound"],
        psychologyTags: ["Overtrading Tendency"],
        notes: "Chop day, chopped up. Closed early.",
      },
      {
        ticker: "ASII",
        setup: "Chop",
        returnR: -0.5,
        pnl: -120000,
        entry: 5200,
        stopLoss: 5250,
        takeProfit: 5100,
        checklist: ["Range Bound"],
        psychologyTags: ["Disciplined"],
        notes: "Stopped out, did not re-enter. Good discipline.",
      }
    ],
  },
  {
    date: "2026-07-04",
    dayNumber: 4,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isHoliday: true,
  },
  {
    date: "2026-07-05",
    dayNumber: 5,
    grossReturn: -270000,
    netReturn: -300000,
    fees: 30000,
    tradesCount: 1,
    trades: [
      {
        ticker: "BBNI",
        setup: "Breakout Failed",
        returnR: -1.0,
        pnl: -270000,
        entry: 5100,
        stopLoss: 5000,
        takeProfit: 5300,
        checklist: ["Volume Expansion"],
        psychologyTags: ["Patience"],
        notes: "Fakeout breakout. Stopped out.",
      },
    ],
  },
  {
    date: "2026-07-06",
    dayNumber: 6,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
  {
    date: "2026-07-07",
    dayNumber: 7,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
  {
    date: "2026-07-08",
    dayNumber: 8,
    grossReturn: 840000,
    netReturn: 800000,
    fees: 40000,
    tradesCount: 1,
    trades: [
      {
        ticker: "BBRI",
        setup: "Breakout",
        returnR: 2.5,
        pnl: 840000,
        entry: 4850,
        stopLoss: 4800,
        takeProfit: 4980,
        checklist: ["VWAP Support", "Volume Expansion"],
        psychologyTags: ["Patience"],
        notes: "Nice run up to target.",
      }
    ],
  },
  {
    date: "2026-07-09",
    dayNumber: 9,
    grossReturn: 380000,
    netReturn: 350000,
    fees: 30000,
    tradesCount: 1,
    trades: [
      {
        ticker: "TLKM",
        setup: "Continuation",
        returnR: 1.0,
        pnl: 380000,
        entry: 3620,
        stopLoss: 3580,
        takeProfit: 3700,
        checklist: ["VWAP Support"],
        psychologyTags: ["Disciplined"],
        notes: "Standard trend play.",
      }
    ],
  },
  {
    date: "2026-07-10",
    dayNumber: 10,
    grossReturn: -1150000,
    netReturn: -1200000,
    fees: 50000,
    tradesCount: 2,
    trades: [
      {
        ticker: "GOTO",
        setup: "Reversal Failed",
        returnR: -2.0,
        pnl: -800000,
        entry: 72,
        stopLoss: 69,
        takeProfit: 78,
        checklist: ["Daily Support"],
        psychologyTags: ["Revenge Trading"],
        notes: "Forced the second entry after first stop. Violated rules.",
      },
      {
        ticker: "ASII",
        setup: "Breakout Failed",
        returnR: -1.5,
        pnl: -350000,
        entry: 5300,
        stopLoss: 5225,
        takeProfit: 5450,
        checklist: ["Volume Expansion"],
        psychologyTags: ["Frustration"],
        notes: "Stopped out quickly, market turned down.",
      }
    ],
  },
  {
    date: "2026-07-11",
    dayNumber: 11,
    grossReturn: 520000,
    netReturn: 500000,
    fees: 20000,
    tradesCount: 1,
    trades: [
      {
        ticker: "UNVR",
        setup: "Breakout",
        returnR: 1.5,
        pnl: 520000,
        entry: 2600,
        stopLoss: 2560,
        takeProfit: 2680,
        checklist: ["Volume Expansion", "Market Context Alignment"],
        psychologyTags: ["Patience"],
        notes: "Clean breakout. Scaled out at 1.5R.",
      }
    ],
  },
  {
    date: "2026-07-12",
    dayNumber: 12,
    grossReturn: 20000,
    netReturn: 0,
    fees: 20000,
    tradesCount: 1,
    trades: [
      {
        ticker: "ADRO",
        setup: "Chop",
        returnR: 0.0,
        pnl: 20000,
        entry: 2850,
        stopLoss: 2820,
        takeProfit: 2920,
        checklist: ["VWAP Support"],
        psychologyTags: ["Disciplined"],
        notes: "Flat trade, scratched at breakeven.",
      }
    ],
  },
  {
    date: "2026-07-13",
    dayNumber: 13,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
  {
    date: "2026-07-14",
    dayNumber: 14,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
  {
    date: "2026-07-15",
    dayNumber: 15,
    grossReturn: 2900000,
    netReturn: 2850000,
    fees: 50000,
    tradesCount: 4,
    trades: [
      {
        ticker: "BBRI",
        setup: "Breakout",
        returnR: 3.0,
        pnl: 1500000,
        entry: 4900,
        stopLoss: 4850,
        takeProfit: 5050,
        checklist: ["Volume Expansion", "VWAP Support", "Market Context Alignment"],
        psychologyTags: ["Patience", "Disciplined"],
        notes: "Waited for the 15m candle to close above key resistance before entering. Scaled out half at 2R and trailed the rest. Execution was flawless according to plan.",
      },
      {
        ticker: "TLKM",
        setup: "Momentum Scalp",
        returnR: 1.5,
        pnl: 800000,
        entry: 3650,
        stopLoss: 3620,
        takeProfit: 3710,
        checklist: ["Volume Expansion", "VWAP Support"],
        psychologyTags: ["Disciplined"],
        notes: "Quick momentum entry on high volume. Scaled out quickly.",
      },
      {
        ticker: "BBNI",
        setup: "Breakout",
        returnR: 3.0,
        pnl: 800000,
        entry: 5200,
        stopLoss: 5125,
        takeProfit: 5350,
        checklist: ["VWAP Support", "Market Context Alignment"],
        psychologyTags: ["Patience"],
        notes: "Held through minor pullback, hit target.",
      },
      {
        ticker: "ADRO",
        setup: "Mean Reversion",
        returnR: -1.0,
        pnl: -200000,
        entry: 2900,
        stopLoss: 2930,
        takeProfit: 2840,
        checklist: ["Overextended"],
        psychologyTags: ["FOMO Control"],
        notes: "Stopped out. Tried to fade the strength, but counter-trend setup failed.",
      }
    ],
  },
  {
    date: "2026-07-16",
    dayNumber: 16,
    grossReturn: -120000,
    netReturn: -150000,
    fees: 30000,
    tradesCount: 1,
    trades: [
      {
        ticker: "GOTO",
        setup: "Pullback",
        returnR: -0.5,
        pnl: -120000,
        entry: 74,
        stopLoss: 71,
        takeProfit: 80,
        checklist: ["VWAP Support"],
        psychologyTags: ["Patience"],
        notes: "Pulled back deeper than expected, stopped out.",
      }
    ],
  },
  {
    date: "2026-07-17",
    dayNumber: 17,
    grossReturn: 430000,
    netReturn: 400000,
    fees: 30000,
    tradesCount: 1,
    trades: [
      {
        ticker: "ASII",
        setup: "VWAP Bounce",
        returnR: 1.2,
        pnl: 430000,
        entry: 5250,
        stopLoss: 5200,
        takeProfit: 5350,
        checklist: ["VWAP Support", "Volume Expansion"],
        psychologyTags: ["Disciplined"],
        notes: "Clean bounce at VWAP.",
      }
    ],
  },
  {
    date: "2026-07-18",
    dayNumber: 18,
    grossReturn: 1540000,
    netReturn: 1500000,
    fees: 40000,
    tradesCount: 2,
    trades: [
      {
        ticker: "BBRI",
        setup: "Breakout",
        returnR: 2.5,
        pnl: 1000000,
        entry: 4950,
        stopLoss: 4900,
        takeProfit: 5080,
        checklist: ["Volume Expansion", "Market Context Alignment"],
        psychologyTags: ["Patience"],
        notes: "Follow-through breakout, hit target.",
      },
      {
        ticker: "TLKM",
        setup: "Momentum",
        returnR: 1.0,
        pnl: 540000,
        entry: 3680,
        stopLoss: 3650,
        takeProfit: 3740,
        checklist: ["VWAP Support"],
        psychologyTags: ["Disciplined"],
        notes: "Quick momentum scalp.",
      }
    ],
  },
  {
    date: "2026-07-19",
    dayNumber: 19,
    grossReturn: 20000,
    netReturn: 0,
    fees: 20000,
    tradesCount: 1,
    trades: [
      {
        ticker: "BBNI",
        setup: "Chop",
        returnR: 0.0,
        pnl: 20000,
        entry: 5250,
        stopLoss: 5200,
        takeProfit: 5300,
        checklist: ["VWAP Support"],
        psychologyTags: ["Disciplined"],
        notes: "No follow through, closed at flat.",
      }
    ],
  },
  {
    date: "2026-07-20",
    dayNumber: 20,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
  {
    date: "2026-07-21",
    dayNumber: 21,
    grossReturn: 0,
    netReturn: 0,
    fees: 0,
    tradesCount: 0,
    trades: [],
    isWeekend: true,
  },
];

// Generate remainder of July 2026 (22 to 31) with scaled Rupiah data
for (let d = 22; d <= 31; d++) {
  const dateStr = `2026-07-${d}`;
  const isWeekend = new Date(2026, 6, d).getDay() % 6 === 0;
  
  if (isWeekend) {
    mockDailySummaries.push({
      date: dateStr,
      dayNumber: d,
      grossReturn: 0,
      netReturn: 0,
      fees: 0,
      tradesCount: 0,
      trades: [],
      isWeekend: true,
    });
  } else {
    let net = 0;
    let gross = 0;
    let fees = 0;
    let trades = [];

    if (d === 22) {
      net = 1100000; fees = 40000; gross = 1140000;
      trades = [{ ticker: "BBRI", setup: "Breakout", returnR: 2.0, pnl: 1140000, entry: 5000, stopLoss: 4950, takeProfit: 5100, checklist: ["Volume Expansion"], psychologyTags: ["Patience"], notes: "Good trade" }];
    } else if (d === 23) {
      net = -400000; fees = 30000; gross = -370000;
      trades = [{ ticker: "TLKM", setup: "Pullback", returnR: -1.0, pnl: -370000, entry: 3700, stopLoss: 3660, takeProfit: 3780, checklist: ["VWAP Support"], psychologyTags: ["Disciplined"], notes: "Stopped out" }];
    } else if (d === 24) {
      net = 1500000; fees = 50000; gross = 1550000;
      trades = [{ ticker: "ASII", setup: "Breakout", returnR: 3.5, pnl: 1550000, entry: 5350, stopLoss: 5250, takeProfit: 5550, checklist: ["Volume Expansion", "Market Context Alignment"], psychologyTags: ["Patience"], notes: "Strong runner" }];
    } else if (d === 25) {
      net = 950000; fees = 30000; gross = 980000;
      trades = [{ ticker: "GOTO", setup: "Continuation", returnR: 2.0, pnl: 980000, entry: 76, stopLoss: 74, takeProfit: 80, checklist: ["VWAP Support"], psychologyTags: ["Disciplined"], notes: "Smooth play" }];
    } else if (d === 26) {
      net = 1200000; fees = 40000; gross = 1240000;
      trades = [{ ticker: "BBRI", setup: "Breakout", returnR: 2.5, pnl: 1240000, entry: 5050, stopLoss: 5000, takeProfit: 5150, checklist: ["Volume Expansion"], psychologyTags: ["Patience"], notes: "Very clean" }];
    } else if (d === 29) {
      net = 1400000; fees = 40000; gross = 1440000;
      trades = [{ ticker: "TLKM", setup: "Breakout", returnR: 3.0, pnl: 1440000, entry: 3720, stopLoss: 3680, takeProfit: 3800, checklist: ["Volume Expansion"], psychologyTags: ["Patience"], notes: "Strong run" }];
    } else if (d === 30) {
      net = 800000; fees = 30000; gross = 830000;
      trades = [{ ticker: "BBNI", setup: "VWAP Bounce", returnR: 1.8, pnl: 830000, entry: 5300, stopLoss: 5250, takeProfit: 5380, checklist: ["VWAP Support"], psychologyTags: ["Disciplined"], notes: "Solid bounce" }];
    } else if (d === 31) {
      net = -500000; fees = 30000; gross = -470000;
      trades = [{ ticker: "UNVR", setup: "Failed Breakout", returnR: -1.2, pnl: -470000, entry: 2650, stopLoss: 2600, takeProfit: 2750, checklist: ["Volume Expansion"], psychologyTags: ["Overtrading Tendency"], notes: "Forced breakout on low relative volume" }];
    }

    mockDailySummaries.push({
      date: dateStr,
      dayNumber: d,
      grossReturn: gross,
      netReturn: net,
      fees: fees,
      tradesCount: trades.length,
      trades: trades,
    });
  }
}
