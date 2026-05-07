import { state } from "../../store";
import TrendingUpIcon from "@suid/icons-material/TrendingUpOutlined";
import ErrorOutlineIcon from "@suid/icons-material/ErrorOutlineOutlined";
import EmojiEventsIcon from "@suid/icons-material/EmojiEventsOutlined";
import InfoOutlinedIcon from "@suid/icons-material/InfoOutlined";

const InsightCard = (props: { type: string, headline: string, body: string, colorClass: string }) => (
  <div class={`p-5 bg-white border border-forest/10 rounded-2xl shadow-premium border-l-4 ${props.colorClass} space-y-2`}>
    <p class="text-[10px] font-bold text-earth uppercase tracking-widest">{props.type}</p>
    <h4 class="font-outfit font-semibold text-forest leading-tight">{props.headline}</h4>
    <p class="text-xs text-earth leading-relaxed">{props.body}</p>
  </div>
);

const InsightsSidebar = () => {
  return (
    <aside 
      class={`h-screen bg-page-bg border-l border-forest/10 flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
        state.ui.insightsOpen ? "w-[280px]" : "w-0 border-none"
      }`}
    >
      <div class="p-6 h-20 flex items-center border-b border-forest/10 shrink-0 bg-white">
        <h3 class="text-lg font-outfit font-bold text-forest">Intelligence</h3>
      </div>

      <div class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <InsightCard 
          type="Trend" 
          headline="Groceries look lean" 
          body="Your grocery spend is 22% lower than your 3-month average — great discipline."
          colorClass="border-l-forest"
        />
        <InsightCard 
          type="Alert" 
          headline="Weekend Variable" 
          body="Weekend dining is your biggest variable cost — $340 this month so far."
          colorClass="border-l-amber-500"
        />
        <InsightCard 
          type="Win" 
          headline="On Target" 
          body="At your current rate, you'll finish April $180 under budget."
          colorClass="border-l-spring"
        />
        <InsightCard 
          type="Forecast" 
          headline="Savings Potential" 
          body="Transferring $200 more to your Travel Goal now will finish it 1 month early."
          colorClass="border-l-mid-green"
        />
      </div>

      <div class="p-6 bg-white border-t border-forest/10">
        <div class="p-4 bg-sage rounded-2xl flex flex-col gap-2">
          <p class="text-[10px] font-bold text-forest/60 uppercase tracking-widest">Earth Impact</p>
          <div class="flex items-center justify-between">
            <span class="text-xs font-outfit text-forest font-medium">Carbon Footprint</span>
            <span class="px-2 py-1 bg-forest text-white text-[10px] rounded-full font-bold">142 kg CO₂</span>
          </div>
          <p class="text-[9px] text-forest/40 italic">Estimated from category spending</p>
        </div>
      </div>
    </aside>
  );
};

export default InsightsSidebar;
