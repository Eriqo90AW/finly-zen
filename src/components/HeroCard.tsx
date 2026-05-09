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

  // Derive unique accounts from all transactions
  const accounts = createMemo(() => {
    const uniqueAccounts = Array.from(new Set(props.allTransactions.map(t => t.accountName).filter(Boolean)));
    return ["All Accounts", ...uniqueAccounts];
  });

  const activeAccount = () => accounts()[activeIndex()];

  // Calculate totals for the active account
  const accountTotals = createMemo(() => {
    const currentAccount = activeAccount();
    const isAllTime = state.ui.showAllTime;
    
    // All-time balance (Current Balance)
    const allTimeData = currentAccount === "All Accounts" 
      ? props.allTransactions 
      : props.allTransactions.filter(t => t.accountName === currentAccount);
    
    const totalAllTimeIncome = allTimeData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalAllTimeExpense = allTimeData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = totalAllTimeIncome - totalAllTimeExpense;

    // Data source based on toggle
    const dataSource = isAllTime ? props.allTransactions : props.monthlyTransactions;
    const currentData = currentAccount === "All Accounts"
      ? dataSource
      : dataSource.filter(t => t.accountName === currentAccount);

    const income = currentData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = currentData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const net = income - expenses;

    return {
      currentBalance,
      data: currentData,
      income,
      expenses,
      net
    };
  });

  // Count up animation for the big number
  createEffect(() => {
    const target = accountTotals().net;
    const duration = 1000;
    const startTime = performance.now();
    const startValue = untrack(displayTotal);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayTotal(startValue + (target - startValue) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayTotal(target);
      }
    };
    requestAnimationFrame(animate);
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
    const newIndex = Math.min(accounts().length - 1, activeIndex() + 1);
    scrollToAccount(newIndex);
  };

  return (
    <div class="col-span-8 row-span-2 premium-card p-0 bg-cream relative overflow-hidden group flex flex-col">
      {/* Watermark */}
      <div class="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12 transition-transform group-hover:scale-110 duration-1000 pointer-events-none">
        <span class="material-icons text-[240px]">eco</span>
      </div>

      <div class="absolute top-10 right-10 z-20 flex flex-col items-end gap-2">
        <button 
          onClick={toggleShowAllTime}
          class={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
            state.ui.showAllTime ? 'text-forest font-black' : 'text-forest/30 hover:text-forest/60'
          }`}
        >
          {state.ui.showAllTime ? "Showing All Time" : "Showing This Month"}
        </button>
        <button 
          onClick={toggleRecurringDebt}
          class={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
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
          class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons">chevron_left</span>
        </button>
      </Show>

      {/* Right Arrow */}
      <Show when={activeIndex() < accounts().length - 1}>
        <button
          onClick={scrollRight}
          class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons">chevron_right</span>
        </button>
      </Show>

      {/* Swipeable Container */}
      <div 
        ref={scrollContainer}
        class="hero-swiper flex-1 flex overflow-x-auto h-full"
      >
        <For each={accounts()}>
          {(account, index) => (
            <div class="hero-slide p-10 relative z-10 flex flex-col justify-center space-y-8 min-w-full">
              <div class="space-y-1">
                <p class="text-xs font-bold text-forest/40 uppercase tracking-widest">
                  {account}
                </p>
                <h3 class="text-7xl hero-numeral text-forest">
                  {formatRupiah(index() === activeIndex() ? displayTotal() : accountTotals().net)}
                </h3>
              </div>
              
              <div class="h-px bg-forest/10 w-full" />
              
              <div class="grid grid-cols-3 gap-8">
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Income" : "Monthly Income"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {formatRupiah(accountTotals().income)}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Expenses" : "Monthly Expenses"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {formatRupiah(accountTotals().expenses)}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{state.ui.showAllTime ? "All Time Daily Avg" : "Daily Average"}</p>
                  <p class="text-xl font-outfit font-semibold text-forest">
                    {(() => {
                      if (state.ui.showAllTime) {
                        const allData = accountTotals().data;
                        if (allData.length === 0) return formatRupiah(0);
                        const firstDate = new Date(Math.min(...allData.map(t => new Date(t.date).getTime())));
                        const days = Math.max(1, Math.ceil((new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
                        return formatRupiah(accountTotals().expenses / days);
                      } else {
                        const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
                        const now = new Date();
                        
                        let divisor;
                        if (now >= start && now <= end) {
                          const diffTime = Math.abs(now.getTime() - start.getTime());
                          divisor = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        } else {
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          divisor = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        }
                        
                        return formatRupiah(accountTotals().expenses / (divisor || 1));
                      }
                    })()}
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
