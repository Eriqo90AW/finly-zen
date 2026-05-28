import { Show, For, createSignal } from "solid-js";
import type { DividendEntry } from "../../types/dividend";

interface CalendarDayCellProps {
  day: number;
  dateStr: string;
  dividends: DividendEntry[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (dateStr: string) => void;
}

const statusColors: Record<string, string> = {
  paid: "bg-fin-green",
  projected: "bg-gray-400",
  upcoming: "bg-blue-500",
};

const statusBorders: Record<string, string> = {
  paid: "border-l-3 border-fin-green",
  projected: "border-l-3 border-gray-400",
  upcoming: "border-l-3 border-blue-500",
};

const statusBackgrounds: Record<string, string> = {
  paid: "bg-fin-green/8 hover:bg-fin-green/15",
  projected: "bg-gray-400/8 hover:bg-gray-400/15",
  upcoming: "bg-blue-500/8 hover:bg-blue-500/15",
};

const formatAmountCompact = (amount: number, currency: string) => {
  if (currency === "USD") {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  }
  // IDR
  if (amount >= 1000000) return `Rp${(amount / 1000000).toFixed(2)}jt`;
  if (amount >= 1000) return `Rp${(amount / 1000).toFixed(2)}rb`;
  return `Rp${amount.toFixed(2)}`;
};

const CalendarDayCell = (props: CalendarDayCellProps) => {
  const [showTooltip, setShowTooltip] = createSignal(false);

  const handleClick = () => {
    if (props.dividends.length > 0) {
      props.onSelect(props.dateStr);
    }
  };

  const handleMouseEnter = () => {
    if (props.dividends.length > 0) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Determine dominant status: upcoming > projected > paid
  const dominantStatus = () => {
    if (props.dividends.length === 0) return null;
    if (props.dividends.some((d) => d.status === "upcoming")) return "upcoming";
    if (props.dividends.some((d) => d.status === "projected")) return "projected";
    return "paid";
  };

  const totalsByCurrency = () => {
    const totals: Record<string, number> = {};
    props.dividends.forEach((d) => {
      totals[d.currency] = (totals[d.currency] || 0) + d.amount;
    });
    return totals;
  };

  const hasDividends = () => props.dividends.length > 0 && props.isCurrentMonth;
  const status = dominantStatus();

  const sortedDividends = () => {
    return [...props.dividends].sort((a, b) => b.amount - a.amount);
  };

  return (
    <div
      class="relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        class={`w-full h-full min-h-[45px] rounded-xl flex flex-col items-start p-1.5 transition-all cursor-pointer relative overflow-hidden
          ${props.isCurrentMonth ? "hover:bg-sage/50" : "opacity-30 cursor-default"}
          ${props.isToday ? "ring-2 ring-forest/40 bg-sage/30" : ""}
          ${props.isSelected ? "bg-sage ring-2 ring-forest" : ""}
          ${hasDividends() && status ? `${statusBackgrounds[status]} ${statusBorders[status]}` : "border border-transparent"}
          ${hasDividends() ? "hover:shadow-sm" : ""}
        `}
        disabled={!props.isCurrentMonth}
      >
        <div class="flex justify-between w-full items-center">
          <span
            class={`text-xs font-outfit font-bold
              ${props.isToday ? "text-forest" : props.isCurrentMonth ? "text-near-black" : "text-earth/40"}
            `}
          >
            {props.day}
          </span>

          {/* Count Badge */}
          <Show when={hasDividends()}>
            <span
              class={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full text-white ${status ? statusColors[status] : ""}`}
            >
              {props.dividends.length}
            </span>
          </Show>
        </div>

        {/* Display Tickers and Compact Summed Amount */}
        <Show when={hasDividends()}>
          <div class="mt-auto flex flex-col items-start w-full gap-1 overflow-hidden">
            <div class="flex flex-wrap gap-0.5 max-h-[22px] overflow-hidden w-full">
              <For each={sortedDividends()}>
                {(d) => (
                  <span class="text-[7.5px] font-extrabold px-1 py-0.2 rounded bg-forest/15 text-forest truncate max-w-full" title={`${d.ticker}: ${d.amount}`}>
                    {d.ticker}
                  </span>
                )}
              </For>
            </div>
            <For each={Object.entries(totalsByCurrency())}>
              {([currency, val]) => (
                <span class="text-[9px] font-extrabold text-forest/70 font-outfit leading-none truncate max-w-full">
                  {formatAmountCompact(val, currency)}
                </span>
              )}
            </For>
          </div>
        </Show>
      </button>

      <Show when={showTooltip()}>
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in-up">
          <div class="bg-white rounded-xl shadow-premium border border-forest/10 p-3 min-w-[200px]">
            <p class="text-[10px] font-bold text-earth uppercase tracking-wider mb-2">
              {new Date(props.dateStr + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <For each={props.dividends}>
              {(dividend) => (
                <div class="flex items-center gap-2 py-1">
                  <div
                    class={`w-2 h-2 rounded-full ${statusColors[dividend.status]}`}
                  />
                  <span class="text-xs font-bold text-forest">
                    {dividend.ticker}
                  </span>
                  <span class="text-[10px] text-earth flex-1 text-right">
                    {dividend.currency} {dividend.amount.toLocaleString()}
                  </span>
                </div>
              )}
            </For>
          </div>
          <div class="w-2 h-2 bg-white border-r border-b border-forest/10 rotate-45 mx-auto -mt-1" />
        </div>
      </Show>
    </div>
  );
};

export default CalendarDayCell;
