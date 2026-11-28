import {
  createSignal,
  createMemo,
  createEffect,
  For,
  Show,
  onCleanup,
  untrack,
} from "solid-js";
import { state, toggleShowAllTime, setSelectedAccount } from "../../../store";
import { HeroAccountSlide } from "./HeroAccountSlide";
import {
  computeHeroAccountStats,
  deriveHeroAccounts,
} from "./heroCardHelpers";
import type { HeroCardProps } from "../../../types";

export const HeroCard = (props: HeroCardProps) => {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [displayTotal, setDisplayTotal] = createSignal(0);

  const accounts = createMemo(() => deriveHeroAccounts(props.allTransactions));

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

  const allStats = createMemo(() =>
    computeHeroAccountStats(
      props.allTransactions,
      accounts(),
      state.ui.showAllTime,
      state.ui.currentMonth,
      state.ui.datePeriod,
    ),
  );

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
      const easeOut = 1 - (1 - progress) ** 4;

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
      class="w-full flex-1 premium-card p-0 relative overflow-hidden group flex flex-col transition-[background-color,box-shadow] duration-700 ease-out min-h-[260px] sm:min-h-[280px] lg:h-[320px]"
      style={{
        "background-color": activeStats().color || "#FDF5E6",
        "background-image": activeStats().color
          ? "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.6) 100%)"
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
          type="button"
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
          type="button"
          onClick={scrollLeft}
          class="cursor-pointer absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-forest z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
        >
          <span class="material-icons text-sm sm:text-base">chevron_left</span>
        </button>
      </Show>

      {/* Right Arrow */}
      <Show when={activeIndex() < accounts().length - 1}>
        <button
          type="button"
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
              <HeroAccountSlide
                stats={stats}
                displayValue={
                  index() === activeIndex() ? displayTotal() : stats.net
                }
                showAllTime={state.ui.showAllTime}
              />
            )}
          </For>
        </div>
      </div>

      {/* Pagination Dots */}
      <div class="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        <For each={accounts()}>
          {(_, index) => (
            <button
              type="button"
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
