import { For } from "solid-js";

export const GardenWins = () => {
  return (
    <div class="col-span-3 row-span-3 premium-card p-6 flex flex-col justify-between">
      <div>
        <h4 class="font-outfit font-bold text-forest mb-4">Garden Wins</h4>
        <div class="space-y-4">
          <div class="p-3 bg-sage/20 rounded-xl space-y-2">
            <p class="text-[10px] font-bold text-forest uppercase tracking-widest">Under Budget Streak</p>
            <div class="flex gap-2">
              <For each={Array(5).fill(0)}>
                {() => <div class="w-3 h-3 rounded-full bg-forest" />}
              </For>
              <div class="w-3 h-3 rounded-full bg-forest/10" />
            </div>
            <p class="text-xs font-outfit text-forest font-semibold">12 Days and growing!</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">Lowest Food Spend</span>
            <span class="px-3 py-1.5 bg-sage text-forest text-[10px] font-bold rounded-full border border-forest/10">No Impulse Buys</span>
          </div>
        </div>
      </div>

      <div class="p-4 bg-forest rounded-2xl text-white space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">Insight</p>
        <p class="text-xs font-outfit">Your savings are 12% higher than last month.</p>
      </div>
    </div>
  );
};
