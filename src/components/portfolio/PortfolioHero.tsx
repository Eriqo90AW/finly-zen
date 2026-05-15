import { formatPortfolioValue } from "../../utils/format";
import { Portfolio } from "../../types";
import { portfolioState } from "../../store/portfolioStore";

interface PortfolioHeroProps {
  portfolio: Portfolio;
}

export const PortfolioHero = (props: PortfolioHeroProps) => {
  const currency = () => portfolioState.currencyView;
  const isPositive = () => props.portfolio.allTimeGain >= 0;

  return (
    <div class="premium-card relative overflow-hidden p-8 bg-gradient-to-br from-white via-sage/5 to-sage/10 border-forest/10 group transition-all duration-500 mb-8 hover:shadow-lg">
      {/* Decorative background element */}
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-forest/5 rounded-full blur-3xl group-hover:bg-forest/10 transition-colors duration-700"></div>
      <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-spring/5 rounded-full blur-3xl group-hover:bg-spring/10 transition-colors duration-700"></div>
      
      <div class="relative flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Main Highlight: Net Worth */}
        <div class="flex flex-col items-center md:items-start text-center md:text-left min-w-[300px]">
          <div class="flex items-center gap-2 mb-2">
            <div class={`w-2 h-2 rounded-full ${isPositive() ? 'bg-spring' : 'bg-red-500'} animate-pulse-soft`}></div>
            <p class="text-[10px] font-bold text-earth/60 uppercase tracking-[0.25em]">Portfolio Net Worth</p>
          </div>
          <div class="flex flex-col">
            <span class="text-[56px] font-outfit font-black text-forest leading-none tracking-tighter">
              {formatPortfolioValue(props.portfolio.totalValue, currency())}
            </span>
            <div class="flex items-center gap-3 mt-4 justify-center md:justify-start">
              <div class={`px-3 py-1 rounded-full text-[13px] font-black shadow-sm flex items-center gap-1.5 ${isPositive() ? 'bg-spring/10 text-spring border border-spring/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                <span class="material-icons text-sm">{isPositive() ? 'trending_up' : 'trending_down'}</span>
                {isPositive() ? '+' : ''}{formatPortfolioValue(props.portfolio.allTimeGain, currency(), true)}
              </div>
              <span class={`text-sm font-bold ${isPositive() ? 'text-spring/60' : 'text-red-500/60'}`}>
                ({props.portfolio.allTimeGainPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-10 lg:gap-16 bg-white/40 backdrop-blur-md p-8 rounded-[40px] border border-forest/5 shadow-inner-soft w-full md:w-auto">
          <div class="flex flex-col items-center md:items-start group/stat">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">payments</span>
              <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">Cash</p>
            </div>
            <span class="text-2xl font-outfit font-bold text-forest leading-none">
              {formatPortfolioValue(props.portfolio.cash, currency())}
            </span>
            <div class="w-8 h-1 bg-forest/10 rounded-full mt-3 group-hover/stat:w-full transition-all duration-500"></div>
          </div>

          <div class="flex flex-col items-center md:items-start group/stat">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">bolt</span>
              <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">Buying Power</p>
            </div>
            <span class="text-2xl font-outfit font-bold text-forest leading-none">
              {formatPortfolioValue(props.portfolio.totalBuyingPower, currency())}
            </span>
            <div class="w-8 h-1 bg-forest/10 rounded-full mt-3 group-hover/stat:w-full transition-all duration-500"></div>
          </div>

          <div class="flex flex-col items-center md:md:items-start group/stat">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[16px] text-forest/30 group-hover/stat:text-forest transition-colors">inventory_2</span>
              <p class="text-[9px] font-bold text-earth/60 uppercase tracking-[0.2em]">Assets Value</p>
            </div>
            <span class="text-2xl font-outfit font-bold text-forest leading-none">
              {formatPortfolioValue(props.portfolio.totalValue - props.portfolio.cash, currency())}
            </span>
            <div class="w-8 h-1 bg-forest/10 rounded-full mt-3 group-hover/stat:w-full transition-all duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
