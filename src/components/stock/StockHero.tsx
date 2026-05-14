import { Show } from "solid-js";
import { formatUSD, formatUSDCompact } from "../../utils/format";
import { MarketStatus } from "../../utils/marketTime";

interface StockHeroProps {
  data: any;
  marketStatus: MarketStatus;
}

export const StockHero = (props: StockHeroProps) => {
  const d = () => props.data;
  const status = () => props.marketStatus;

  return (
    <div class="premium-card relative overflow-hidden p-6 bg-gradient-to-br from-white via-sage/5 to-sage/10 border-forest/10 group transition-all duration-500 hover:shadow-lg">
      {/* Decorative background element */}
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-forest/5 rounded-full blur-3xl group-hover:bg-forest/10 transition-colors duration-700"></div>
      
      <div class="relative flex flex-col lg:flex-row justify-between items-end gap-6">
        {/* Left Side: Company Identity & Market Status */}
        <div class="flex flex-col gap-3 w-full lg:w-auto">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-3xl md:text-4xl font-cormorant font-bold text-forest leading-tight tracking-tight">
                {d().company_name}
              </h1>
              <div class="flex items-center gap-2">
                <span class="bg-forest text-white text-[10px] px-2 py-0.5 rounded-lg font-black tracking-widest shadow-sm">
                  {d().ticker}
                </span>
                <span class="bg-white/80 backdrop-blur-sm text-forest/60 text-[9px] px-1.5 py-0.5 rounded-lg font-bold border border-forest/10 uppercase tracking-widest">
                  {d().exchange}
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-3 flex-wrap mt-0.5">
              <div class="flex gap-2">
                <Show when={d().sector}>
                  <span class="bg-fin-blue/5 text-fin-blue text-[9px] px-2 py-0.5 rounded-full font-bold border border-fin-blue/10 uppercase tracking-wide">
                    {d().sector}
                  </span>
                </Show>
                <Show when={d().industry}>
                  <span class="bg-fin-purple/5 text-fin-purple text-[9px] px-2 py-0.5 rounded-full font-bold border border-fin-purple/10 uppercase tracking-wide">
                    {d().industry}
                  </span>
                </Show>
              </div>

              <div class="h-4 w-px bg-forest/10 mx-1 hidden md:block" />

              {/* Market Status Countdown - inline */}
              <div class="flex items-center gap-2 bg-white/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-forest/5 shadow-sm group/status hover:bg-white/60 transition-all duration-300">
                <div class={`w-1.5 h-1.5 rounded-full ${status().color} animate-pulse-soft`}></div>
                <span class="text-[9px] font-black text-forest uppercase tracking-tight whitespace-nowrap">{status().session}</span>
                <span class="text-[9px] text-earth/60 font-bold uppercase tracking-widest border-l border-forest/10 pl-2">
                  {status().session === 'Market Closed' ? 'Opens' : 'Closes'} in {status().timeRemaining}
                </span>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-earth/60 font-bold uppercase tracking-[0.15em] mt-1">
            Last Updated • {new Date(d().as_of).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>

        {/* Right Side: Financial Stats */}
        <div class="flex items-center gap-6 lg:gap-10 bg-forest/[0.02] p-5 lg:p-6 rounded-2xl border border-forest/5 w-full lg:w-auto justify-between lg:justify-start">
          <div class="flex flex-col items-start">
            <p class="text-[9px] font-bold text-earth/60 uppercase tracking-widest mb-1.5">Price Action</p>
            <div class="flex items-center gap-3">
              <span class="text-[38px] font-outfit font-black text-forest leading-none tracking-tighter">
                {formatUSD(d().valuation.current_price)}
              </span>
                <div class="flex items-center gap-1 bg-fin-green/10 px-1.5 py-0.5 rounded-md border border-fin-green/10">
                  <span class="text-fin-green font-black text-[12px]">
                    +1.24%
                  </span>
                </div>
            </div>
          </div>

          <div class="h-12 w-px bg-forest/10" />

          <div class="flex flex-col items-end">
            <p class="text-[9px] font-bold text-earth/60 uppercase tracking-widest mb-1.5">Market Cap</p>
            <div class="flex flex-col items-end">
              <span class="text-xl font-outfit font-bold text-forest leading-none">
                {formatUSDCompact(d().valuation.market_cap)}
              </span>
              <span class="text-[9px] text-earth/60 font-bold uppercase tracking-widest mt-1">
                {(() => {
                  const cap = d().valuation.market_cap;
                  if (cap >= 500000000000) return 'Large Cap';
                  if (cap >= 10000000000) return 'Mid Cap';
                  if (cap >= 1000000000) return 'Small Cap';
                  return 'Micro Cap';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
