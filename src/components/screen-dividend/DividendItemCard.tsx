import { Show } from "solid-js";
import type { DividendEntry } from "../../types/dividend";

interface DividendItemCardProps {
  dividend: DividendEntry;
  ttmYield: number | null;
  showIgnore: boolean;
  onIgnore: () => void;
}

const badgeClasses: Record<string, string> = {
  paid: "bg-sage text-forest",
  upcoming: "bg-fin-purple/10 text-fin-purple",
  projected: "bg-gray-100 text-gray-500",
};

const statusText: Record<string, string> = {
  paid: "PAID",
  upcoming: "UPCOMING",
  projected: "PROJECTED",
};

export const DividendItemCard = (props: DividendItemCardProps) => {
  const d = () => props.dividend;

  const hasLastPrice = () => {
    const lp = d().last_price;
    return lp != null && lp > 0;
  };

  const lastPriceVal = () => {
    const div = d();
    return div.last_price != null && div.last_price > 0
      ? `${div.currency} ${div.last_price.toLocaleString()}`
      : "N/A";
  };

  const yieldVal = () => {
    const div = d();
    return div.last_price != null && div.last_price > 0
      ? `${((div.amount / div.last_price) * 100).toFixed(2)}%`
      : "N/A";
  };

  const ttmYieldVal = () => {
    return props.ttmYield != null
      ? `${props.ttmYield.toFixed(2)}%`
      : "N/A";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div class="p-4 rounded-2xl bg-white border border-[#f0f3f1] shadow-[0_4px_20px_rgba(26,77,46,0.03)] hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 relative group">
      <Show when={props.showIgnore}>
        <button
          onClick={props.onIgnore}
          class="absolute top-2.5 right-2.5 text-earth/30 hover:text-fin-red hover:bg-fin-red/10 rounded p-1 cursor-pointer transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Ignore entry"
        >
          <span class="material-icons !text-[14px]">close</span>
        </button>
      </Show>

      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          {/* Ticker Badge */}
          <span class="bg-[#133020] text-white text-[9.5px] px-2 py-0.5 rounded font-bold tracking-wide uppercase font-outfit">
            {d().ticker}
          </span>
          {/* Status Badge */}
          <span
            class={`text-[9.5px] px-2 py-0.5 rounded font-bold tracking-wide uppercase font-outfit ${
              badgeClasses[d().status] || "bg-gray-100 text-gray-500"
            }`}
          >
            {statusText[d().status] || d().status}
          </span>
        </div>
        {/* Frequency */}
        <span class="text-[9.5px] text-earth/60 font-bold uppercase tracking-wider">
          {d().frequency}
        </span>
      </div>

      <h4 class="text-sm font-bold text-near-black font-outfit mt-2 mb-3.5 truncate" title={d().company_name}>
        {d().company_name}
      </h4>

      <div class="grid grid-cols-2 gap-y-3 gap-x-6">
        {/* Amount */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Amount</span>
          <p class="text-[16px] font-bold text-near-black font-outfit mt-0.5">
            {d().currency} {d().amount.toLocaleString()}
          </p>
        </div>

        {/* Last Price */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Last Price</span>
          <p class="text-[16px] font-bold text-near-black font-outfit mt-0.5">
            {lastPriceVal()}
          </p>
        </div>

        {/* Yield */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Yield</span>
          <p class={`text-[16px] font-bold font-outfit mt-0.5 ${hasLastPrice() ? "text-fin-green" : "text-earth/40"}`}>
            {yieldVal()}
            <Show when={props.ttmYield != null}>
              <span class="text-[9.5px] font-normal text-earth/60 ml-1.5">(TTM: {ttmYieldVal()})</span>
            </Show>
          </p>
        </div>

        {/* Cum-Date */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Cum-Date</span>
          <p class="text-[16px] font-bold text-near-black font-outfit mt-0.5">
            {formatDate(d().cum_date)}
          </p>
        </div>
      </div>

      <div class="border-t border-[#f0f3f1] my-3" />

      <div class="grid grid-cols-2 gap-x-6">
        {/* Ex-Date */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Ex-Date</span>
          <p class="text-xs font-bold text-near-black font-outfit mt-0.5">
            {formatDate(d().ex_date).toUpperCase()}
          </p>
        </div>

        {/* Payment Date */}
        <div>
          <span class="text-[9px] font-bold text-earth/50 uppercase tracking-widest block leading-tight">Payment</span>
          <p class="text-xs font-bold text-near-black font-outfit mt-0.5">
            {formatDate(d().payment_date).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};
