import { For, createMemo } from "solid-js";
import { state, updateGoal } from "../store";
import AddIcon from "@suid/icons-material/Add";
import LocalDrinkIcon from "@suid/icons-material/LocalDrinkOutlined";
import { formatRupiah } from "../utils/format";

const PlantCard = (props: { goal: typeof state.goals[0] }) => {
  const percent = () => Math.min((props.goal.current / props.goal.target) * 100, 100);
  
  // Dynamic leaf path that "grows" based on percent
  // Simple representation: height scale
  const plantScale = () => 0.4 + (percent() / 100) * 0.6;

  return (
    <div class="premium-card p-8 bg-white flex flex-col items-center group overflow-hidden">
      <div class="relative w-32 h-40 mb-6 flex items-end justify-center">
        {/* Pot */}
        <div class="absolute bottom-0 w-16 h-12 bg-earth/20 rounded-t-sm rounded-b-xl border-t-4 border-earth/30 z-10" />
        
        {/* Plant SVG */}
        <svg 
          viewBox="0 0 100 100" 
          class="w-full h-full pb-8 origin-bottom transition-transform duration-1000 ease-out"
          style={{ transform: `scale(${plantScale()})` }}
        >
          {/* Stem */}
          <path d="M50 100 Q50 50 50 10" stroke="#1A4D2E" stroke-width="4" fill="none" />
          {/* Leaves */}
          <path d="M50 80 Q30 70 20 50" stroke="#2D7D46" stroke-width="3" fill="none" />
          <path d="M50 80 Q70 70 80 50" stroke="#2D7D46" stroke-width="3" fill="none" />
          <path d="M50 50 Q30 40 15 20" stroke="#52C278" stroke-width="3" fill="none" />
          <path d="M50 50 Q70 40 85 20" stroke="#52C278" stroke-width="3" fill="none" />
          <circle cx="50" cy="10" r="5" fill="#52C278" />
        </svg>

        {/* Floating Percentage */}
        <div class="absolute top-4 right-0 px-2 py-1 bg-spring/10 text-spring text-[10px] font-bold rounded-full">
           {percent().toFixed(0)}%
        </div>
      </div>

      <div class="w-full text-center space-y-1 mb-6">
         <div class="flex items-center justify-center gap-2">
            <span class="text-xl">{props.goal.emoji}</span>
            <h4 class="text-xl font-outfit font-bold text-forest">{props.goal.name}</h4>
         </div>
         <p class="text-xs text-earth">Targeting {formatRupiah(props.goal.target)}</p>
      </div>

      <div class="w-full space-y-4">
        <div class="h-2 w-full bg-sage/30 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-forest to-spring transition-all duration-1000 ease-out"
            style={{ width: `${percent()}%` }}
          />
        </div>
        <div class="flex items-center justify-between text-[10px] font-bold text-earth uppercase tracking-widest">
           <span>Saved: {formatRupiah(props.goal.current)}</span>
           <span>Ends: {new Date(props.goal.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      <button 
        onClick={() => updateGoal(props.goal.id, 500000)}
        class="mt-8 w-full py-3 bg-sage/30 text-forest font-outfit font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-forest hover:text-white transition-all group/btn"
      >
        <LocalDrinkIcon class="w-4 h-4 text-mid-green group-hover/btn:text-white" />
        Water it (+{formatRupiah(500000)})
      </button>
    </div>
  );
};

const Goals = () => {
  return (
    <div class="space-y-8 animate-fade-in-up">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-cormorant text-forest">Savings Garden</h2>
        <p class="text-sm font-outfit text-earth">Nurture your dreams and watch them grow.</p>
      </div>

      <div class="grid grid-cols-3 gap-8 pb-20">
        <For each={state.goals}>
          {(goal) => <PlantCard goal={goal} />}
        </For>

        {/* Add New Goal Card */}
        <div class="premium-card p-8 bg-transparent border-2 border-dashed border-forest/20 flex flex-col items-center justify-center text-forest/40 hover:border-forest/40 hover:text-forest transition-all cursor-pointer group">
          <div class="w-16 h-16 rounded-full bg-forest/5 flex items-center justify-center mb-4 transition-transform">
             <AddIcon sx={{ fontSize: 32 }} />
          </div>
          <p class="font-outfit font-bold text-sm uppercase tracking-widest">New Seed</p>
        </div>
      </div>
    </div>
  );
};

export default Goals;
