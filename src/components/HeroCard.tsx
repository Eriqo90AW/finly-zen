import { createSignal, createMemo, createEffect, For, Show, onMount, onCleanup, untrack } from "solid-js";
import { Transaction, state, toggleShowAllTime, toggleRecurringDebt } from "../store";
import { formatRupiah } from "../utils/format";
import { getDateRange } from "../utils/date";

interface HeroCardProps {
  allTransactions: Transaction[];
  monthlyTransactions: Transaction[];
  loading: boolean;
}

export const HeroCard = (props: HeroCardProps) => {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [displayTotal, setDisplayTotal] = createSignal(0);
  let scrollContainer: HTMLDivElement | undefined;

  // Derive unique accounts and their colors from all transactions
  const accounts = createMemo(() => {
    const accs = new Map<string, string | undefined>();
    props.allTransactions.forEach(t => {
      if (t.accountName && !accs.has(t.accountName)) {
        accs.set(t.accountName, t.accountColor);
      }
    });
    
    return [
      { name: "All Accounts", color: undefined },
      ...Array.from(accs.entries()).map(([name, color]) => ({ name, color }))
    ];
  });

  const activeAccount = () => accounts()[activeIndex()];

  // Calculate stats for all accounts in one pass
  const allStats = createMemo(() => {
    const isAllTime = state.ui.showAllTime;
    const dataSource = isAllTime ? props.allTransactions : props.monthlyTransactions;
    const accList = accounts();
    const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
    const now = new Date();
    
    // Pre-calculate monthly divisor
    let monthlyDivisor;
    if (now >= start && now <= end) {
      monthlyDivisor = Math.ceil(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      monthlyDivisor = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    monthlyDivisor = Math.max(1, monthlyDivisor || 1);

    // Initialize stats map for O(1) access during aggregation
    const statsMap = new Map();
    accList.forEach(acc => {
      statsMap.set(acc.name, {
        ...acc,
        income: 0,
        expenses: 0,
        firstDateTime: Infinity,
      });
    });

    // Single pass aggregation for performance
    for (const t of dataSource) {
      const amount = t.amount || 0;
      const type = t.type;
      const accName = t.accountName;
      const time = isAllTime ? new Date(t.date).getTime() : 0;

      // Update specific account
      if (accName && statsMap.has(accName)) {
        const s = statsMap.get(accName);
        if (type === 'income') s.income += amount;
        else if (type === 'expense') s.expenses += amount;
        if (isAllTime && time < s.firstDateTime) s.firstDateTime = time;
      }

      // Update "All Accounts"
      const all = statsMap.get("All Accounts");
      if (type === 'income') all.income += amount;
      else if (type === 'expense') all.expenses += amount;
      if (isAllTime && time < all.firstDateTime) all.firstDateTime = time;
    }

    // Finalize stats and calculate daily averages
    return accList.map(acc => {
      const s = statsMap.get(acc.name);
      const net = s.income - s.expenses;
      
      let divisor = monthlyDivisor;
      if (isAllTime) {
        if (s.firstDateTime === Infinity) {
          divisor = 1;
        } else {
          divisor = Math.max(1, Math.ceil((now.getTime() - s.firstDateTime) / (1000 * 60 * 60 * 24)));
        }
      }
      
      return {
        ...s,
        net,
        dailyAvg: s.expenses / divisor
      };
    });
  });

  const activeStats = createMemo(() => allStats()[activeIndex()] || allStats()[0]);

  // Count up animation for the big number
  createEffect(() => {
    const target = activeStats().net;
    const duration = 1000;
    const startTime = performance.now();
    const startValue = untrack(displayTotal);
    let frameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayTotal(startValue + (target - startValue) * easeOut);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayTotal(target);
      }
    };
    frameId = requestAnimationFrame(animate);
    onCleanup(() => cancelAnimationFrame(frameId));
  });

  // Handle scroll to update active index
  const handleScroll = () => {
    if (!scrollContainer) return;
    const width = scrollContainer.offsetWidth;
    const index = Math.round(scrollContainer.scrollLeft / width);
    if (index !== activeIndex()) {
      setActiveIndex(index);
    }
  };

  onMount(() => {
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => {
    scrollContainer?.removeEventListener("scroll", handleScroll);
  });

  const scrollToAccount = (index: number) => {
    if (!scrollContainer) return;
    scrollContainer.scrollTo({
      left: index * scrollContainer.offsetWidth,
      behavior: "smooth"
    });
  };

  const scrollLeft = () => {
    if (!scrollContainer) return;
    const newIndex = Math.max(0, activeIndex() - 1);
    scrollToAccount(newIndex);
  };

  const scrollRight = () => {
    if (!scrollContainer) return;
    const newIndex = Math.min(allStats().length - 1, activeIndex() + 1);
    scrollToAccount(newIndex);
  };

  return (
    <div 
      class="col-span-8 row-span-2 premium-card p-0 relative overflow-hidden group flex flex-col transition-all duration-700 ease-in-out"
      style={{ 
        "background-color": activeStats().color || '#FDF5E6',
        "background-image": activeStats().color 
            ? `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.6) 100%)`
            : 'none',
        "box-shadow": activeStats().color 
            ? "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.05), var(--shadow-premium)" 
            : undefined
      }}
    >

      {/* Physical Card Base Effects */}
      <Show when={activeStats().name !== "All Accounts"}>
        <div class="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/30 via-transparent to-black/5 z-0" />
      </Show>

      {/* Watermark */}
      <div class="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-1000 pointer-events-none z-0">
        <span class="material-icons text-[240px]">eco</span>
      </div>

      <div class="absolute top-10 right-10 z-20 flex flex-col items-end gap-2">
        <button 
          onClick={toggleShowAllTime}
          class={`cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
            state.ui.showAllTime ? 'text-forest font-black' : 'text-forest/30 hover:text-forest/60'
          }`}
        >
          {state.ui.showAllTime ? "Showing All Time" : "Showing This Month"}
        </button>
        <button 
          onClick={toggleRecurringDebt}
          class={`cursor-pointer text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
            state.ui.showRecurringDebt ? 'text-forest font-black' : 'text-forest/30 hover:text-forest/60'
          }`}
        >
          {state.ui.showRecurringDebt ? "Showing Recurring Debt" : "Hiding Recurring Debt"}
        </button>
      </div>

      {/* Left Arrow */}
      <Show when={activeIndex() > 0}>
        <button
          onClick={scrollLeft}
          class="cursor-pointer absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons">chevron_left</span>
        </button>
      </Show>

      {/* Right Arrow */}
      <Show when={activeIndex() < accounts().length - 1}>
        <button
          onClick={scrollRight}
          class="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons">chevron_right</span>
        </button>
      </Show>

      {/* Swipeable Container */}
      <div 
        ref={scrollContainer}
        class="hero-swiper flex-1 flex overflow-x-auto h-full"
      >
        <For each={allStats()}>
          {(stats, index) => (
            <div class="hero-slide p-10 relative z-10 flex flex-col justify-center space-y-8 min-w-full">
              <div class="space-y-1">
                <p class="text-xs font-bold text-forest/40 uppercase tracking-widest">
                  {stats.name}
                </p>
                <h3 class="text-7xl hero-numeral text-forest">
                  {formatRupiah(index() === activeIndex() ? displayTotal() : stats.net)}
                </h3>
              </div>
              
              <div class="h-px bg-forest/10 w-full" />
              
              <div class="grid grid-cols-3 gap-8">
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Income" : "Monthly Income"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {formatRupiah(stats.income)}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Expenses" : "Monthly Expenses"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {formatRupiah(stats.expenses)}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Daily Avg" : "Daily Average"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {formatRupiah(stats.dailyAvg)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Pagination Dots */}
      <div class="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        <For each={accounts()}>
          {(_, index) => (
            <button
              onClick={() => scrollToAccount(index())}
              class={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index() === activeIndex() ? 'bg-forest w-4' : 'bg-forest/20 hover:bg-forest/40'
              }`}
            />
          )}
        </For>
      </div>
    </div>
  );
};
