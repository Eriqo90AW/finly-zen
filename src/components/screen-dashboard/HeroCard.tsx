import {
  createSignal,
  createMemo,
  createEffect,
  For,
  Show,
  onMount,
  onCleanup,
  untrack,
} from "solid-js";
import { state, toggleShowAllTime, setSelectedAccount } from "../../store";
import { formatRupiah } from "../../utils/format";
import { getDateRange, isDateInRange } from "../../utils/date";
import { isTransferTransaction } from "../../utils/transferUtils";
import type { HeroCardProps } from "../../types";

export const HeroCard = (props: HeroCardProps) => {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [displayTotal, setDisplayTotal] = createSignal(0);

  // Derive unique accounts and their colors from all transactions
  const accounts = createMemo(() => {
    const accs = new Map<string, string | undefined>();
    props.allTransactions.forEach((t) => {
      if (t.accountName && !accs.has(t.accountName)) {
        accs.set(t.accountName, t.accountColor);
      }
    });

    return [
      { name: "All Accounts", color: undefined },
      ...Array.from(accs.entries()).map(([name, color]) => ({ name, color })),
    ];
  });

  const activeAccount = () => accounts()[activeIndex()] || accounts()[0];

  // Respond to external selectedAccount changes (e.g. from the RecentTransactions dropdown)
  createEffect(() => {
    const selected = state.ui.selectedAccount;
    const accList = accounts();
    let targetIndex = 0;
    if (selected) {
      const foundIdx = accList.findIndex((a) => a.name === selected);
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
      }
    }
    if (targetIndex !== untrack(activeIndex)) {
      setActiveIndex(targetIndex);
    }
  });

  // Sync internal swipe/change to the global store
  createEffect(() => {
    const acc = activeAccount();
    const isAll = !acc || acc.name === "All Accounts";
    const targetName = isAll ? null : acc.name;
    const targetColor = isAll ? null : (acc.color ?? null);
    if (untrack(() => state.ui.selectedAccount) !== targetName) {
      setSelectedAccount(targetName, targetColor);
    }
  });

  // Calculate stats for all accounts in one pass
  const allStats = createMemo(() => {
    const isAllTime = state.ui.showAllTime;
    const { start, end } = getDateRange(
      state.ui.currentMonth,
      state.ui.datePeriod,
    );
    const dataSource = isAllTime
      ? props.allTransactions
      : (props.allTransactions || []).filter((t) =>
          isDateInRange(t.date, start, end),
        );
    const accList = accounts();
    const now = new Date();

    // Pre-calculate monthly divisor
    let monthlyDivisor;
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

    // Initialize stats map for O(1) access during aggregation
    const statsMap = new Map();
    accList.forEach((acc) => {
      statsMap.set(acc.name, {
        ...acc,
        income: 0,
        expenses: 0,
        nonRecurringExpenses: 0,
        firstDateTime: Infinity,
      });
    });

    // Single pass aggregation for performance
    for (const t of dataSource) {
      const isTransfer = isTransferTransaction(t);
      if (isTransfer) continue;

      const amount = t.amount || 0;
      const type = t.type;
      const accName = t.accountName;
      const isRecurring = t.isRecurring;
      const time = isAllTime ? new Date(t.date).getTime() : 0;

      // Update specific account
      if (accName && statsMap.has(accName)) {
        const s = statsMap.get(accName);
        if (type === "income") s.income += amount;
        else if (type === "expense") {
          s.expenses += amount;
          if (!isRecurring) s.nonRecurringExpenses += amount;
        }
        if (isAllTime && time < s.firstDateTime) s.firstDateTime = time;
      }

      // Update "All Accounts"
      const all = statsMap.get("All Accounts");
      if (type === "income") all.income += amount;
      else if (type === "expense") {
        all.expenses += amount;
        if (!isRecurring) all.nonRecurringExpenses += amount;
      }
      if (isAllTime && time < all.firstDateTime) all.firstDateTime = time;
    }

    // Finalize stats and calculate daily averages
    return accList.map((acc) => {
      const s = statsMap.get(acc.name);
      const net = s.income - s.expenses;

      let divisor = monthlyDivisor;
      if (isAllTime) {
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
  });

  const activeStats = createMemo(
    () => allStats()[activeIndex()] || allStats()[0],
  );

  // Count up animation for the active big numeral
  createEffect(() => {
    const target = activeStats().net;
    const duration = 1200;
    const startTime = performance.now();
    const startValue = untrack(displayTotal);
    let frameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setDisplayTotal(Math.round(startValue + (target - startValue) * easeOut));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayTotal(target);
      }
    };
    frameId = requestAnimationFrame(animate);
    onCleanup(() => cancelAnimationFrame(frameId));
  });

  const scrollLeft = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const scrollRight = () => {
    setActiveIndex((prev) => Math.min(allStats().length - 1, prev + 1));
  };

  // Touch / Swipe handling
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        scrollRight();
      } else {
        scrollLeft();
      }
    }
  };

  // Mouse drag handling
  let mouseStartX = 0;
  let isDragging = false;

  const handleMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    mouseStartX = e.clientX;
    isDragging = true;
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    isDragging = false;
    const deltaX = e.clientX - mouseStartX;
    if (deltaX < -40) {
      scrollRight();
    } else if (deltaX > 40) {
      scrollLeft();
    }
  };

  return (
    <div
      class="w-full flex-1 premium-card p-0 relative overflow-hidden group flex flex-col transition-[background-color,box-shadow] duration-700 ease-out min-h-[260px] sm:min-h-[290px] lg:h-[340px]"
      style={{
        "background-color": activeStats().color || "#FDF5E6",
        "background-image": activeStats().color
          ? `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.6) 100%)`
          : "none",
        "box-shadow": activeStats().color
          ? "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.05), var(--shadow-premium)"
          : undefined,
      }}
    >
      {/* Physical Card Base Effects */}
      <Show when={activeStats().name !== "All Accounts"}>
        <div class="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-black/5 z-0" />
      </Show>

      {/* Watermark */}
      <div class="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-1000 pointer-events-none z-0">
        <span class="material-icons text-[140px] sm:text-[240px]">eco</span>
      </div>

      <div class="absolute top-3.5 right-3.5 sm:top-6 sm:right-8 z-20 flex flex-col items-end gap-2">
        <button
          onClick={toggleShowAllTime}
          class={`cursor-pointer text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
            state.ui.showAllTime
              ? "text-forest font-black"
              : "text-forest/40 hover:text-forest/60"
          }`}
        >
          {state.ui.showAllTime ? "All Time" : "This Month"}
        </button>
      </div>

      {/* Left Arrow */}
      <Show when={activeIndex() > 0}>
        <button
          onClick={scrollLeft}
          class="cursor-pointer absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons text-sm sm:text-base">chevron_left</span>
        </button>
      </Show>

      {/* Right Arrow */}
      <Show when={activeIndex() < accounts().length - 1}>
        <button
          onClick={scrollRight}
          class="cursor-pointer absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons text-sm sm:text-base">chevron_right</span>
        </button>
      </Show>

      {/* Swipeable / Animated Transform Container */}
      <div
        class="flex-1 overflow-hidden relative select-none cursor-grab active:cursor-grabbing h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div
          class="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{
            transform: `translateX(-${activeIndex() * 100}%)`,
          }}
        >
          <For each={allStats()}>
            {(stats, index) => (
              <div class="px-4 py-4 sm:p-6 lg:px-8 lg:py-5 relative z-10 flex flex-col justify-center space-y-4 sm:space-y-4 min-w-full w-full shrink-0">
                <div class="space-y-0.5 pr-20 sm:pr-0">
                  <p class="text-xs sm:text-sm font-bold text-forest/60 uppercase tracking-widest">
                    {stats.name}
                  </p>
                  <h3 class="text-5xl sm:text-6xl md:text-6xl lg:text-6xl xl:text-6xl hero-numeral text-forest tabular-nums leading-none tracking-tight">
                    {formatRupiah(
                      index() === activeIndex() ? displayTotal() : stats.net,
                    )}
                  </h3>
                </div>

                <div class="h-px bg-forest/10 w-full my-2" />

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 xl:gap-4">
                  <div class="min-w-0">
                    <p class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate">
                      {state.ui.showAllTime
                        ? "All Time Income"
                        : "Monthly Income"}
                    </p>
                    <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
                      {formatRupiah(stats.income)}
                    </p>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate">
                      {state.ui.showAllTime
                        ? "All Time Expenses"
                        : "Monthly Expenses"}
                    </p>
                    <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
                      {formatRupiah(stats.expenses)}
                    </p>
                  </div>
                  <div class="min-w-0">
                    <p
                      class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate"
                      title="Daily Average (All Expenses)"
                    >
                      {state.ui.showAllTime
                        ? "All Time Daily Avg"
                        : "Daily Average"}
                    </p>
                    <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
                      {formatRupiah(stats.dailyAvg)}
                    </p>
                  </div>
                  <div class="min-w-0">
                    <p
                      class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate"
                      title="Daily Average excluding recurring transactions"
                    >
                      {state.ui.showAllTime
                        ? "All Time Daily (Ex. Rec)"
                        : "Daily (Ex. Rec)"}
                    </p>
                    <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
                      {formatRupiah(stats.dailyAvgNonRecurring)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Pagination Dots */}
      <div class="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        <For each={accounts()}>
          {(_, index) => (
            <button
              onClick={() => setActiveIndex(index())}
              class={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                index() === activeIndex()
                  ? "bg-forest w-4"
                  : "bg-forest/20 hover:bg-forest/40"
              }`}
            />
          )}
        </For>
      </div>
    </div>
  );
};
