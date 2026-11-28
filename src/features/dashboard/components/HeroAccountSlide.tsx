import { formatRupiah } from "../../../utils/format";
import type { HeroAccountStats } from "./heroCardHelpers";

interface HeroAccountSlideProps {
  stats: HeroAccountStats;
  displayValue: number;
  showAllTime: boolean;
}

export const HeroAccountSlide = (props: HeroAccountSlideProps) => {
  return (
    <div class="px-4 py-4 sm:p-6 lg:px-8 lg:py-5 relative z-10 flex flex-col justify-center space-y-4 sm:space-y-4 min-w-full w-full shrink-0">
      <div class="space-y-0.5 pr-20 sm:pr-0">
        <p class="text-xs sm:text-sm font-bold text-forest/60 uppercase tracking-widest">
          {props.stats.name}
        </p>
        <h3 class="text-5xl sm:text-6xl md:text-6xl lg:text-6xl xl:text-6xl hero-numeral text-forest tabular-nums leading-none tracking-tight">
          {formatRupiah(props.displayValue)}
        </h3>
      </div>

      <div class="h-px bg-forest/10 w-full my-2" />

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 xl:gap-4">
        <div class="min-w-0">
          <p class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate">
            {props.showAllTime ? "All Time Income" : "Monthly Income"}
          </p>
          <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
            {formatRupiah(props.stats.income)}
          </p>
        </div>
        <div class="min-w-0">
          <p class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate">
            {props.showAllTime ? "All Time Expenses" : "Monthly Expenses"}
          </p>
          <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
            {formatRupiah(props.stats.expenses)}
          </p>
        </div>
        <div class="min-w-0">
          <p
            class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate"
            title="Daily Average (All Expenses)"
          >
            {props.showAllTime ? "All Time Daily Avg" : "Daily Average"}
          </p>
          <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
            {formatRupiah(props.stats.dailyAvg)}
          </p>
        </div>
        <div class="min-w-0">
          <p
            class="text-[9px] sm:text-[10px] font-bold text-earth uppercase tracking-widest truncate"
            title="Daily Average excluding recurring transactions"
          >
            {props.showAllTime
              ? "All Time Daily (Ex. Rec)"
              : "Daily (Ex. Rec)"}
          </p>
          <p class="text-sm sm:text-lg xl:text-xl font-outfit font-semibold text-forest truncate mt-0.5">
            {formatRupiah(props.stats.dailyAvgNonRecurring)}
          </p>
        </div>
      </div>
    </div>
  );
};
