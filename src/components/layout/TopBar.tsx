import SearchIcon from "@suid/icons-material/SearchOutlined";
import ChevronLeftIcon from "@suid/icons-material/ChevronLeft";
import ChevronRightIcon from "@suid/icons-material/ChevronRight";
import MenuOpenIcon from "@suid/icons-material/MenuOpen";
import { state, setState, nextMonth, prevMonth } from "../../store";

const TopBar = () => {
  const formattedDate = () => {
    const d = new Date(state.ui.currentMonth);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <header class="h-20 bg-white border-b border-forest/10 flex items-center justify-between px-8 shrink-0">
      {/* Month Navigator */}
      <div class="flex items-center gap-6">
        {/* Month Navigator */}
        <div class="flex items-center gap-3">
          <button 
            onClick={prevMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5"
          >
            <ChevronLeftIcon />
          </button>
          <h2 class="text-lg font-outfit font-bold text-forest min-w-[140px] text-center">
            {formattedDate()}
          </h2>
          <button 
            onClick={nextMonth}
            class="w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest transition-colors border border-forest/5"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Date Period Selector */}
        <div class="relative group">
          <select 
            value={state.ui.datePeriod}
            onInput={(e) => setState("ui", "datePeriod", e.currentTarget.value as any)}
            class="appearance-none bg-sage/20 border border-forest/10 rounded-xl px-4 py-2 pr-10 font-outfit text-xs font-bold text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all cursor-pointer hover:bg-sage/30"
          >
            <option value="1-30">1 - 30</option>
            <option value="21-20">21 - 20</option>
            <option value="25-25">25 - 25</option>
          </select>
          <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 pointer-events-none text-lg">
            expand_more
          </span>
        </div>
      </div>

      {/* Search & User */}
      <div class="flex items-center gap-6">
        <div class="relative w-80">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-earth w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            class="w-full h-11 bg-page-bg rounded-xl pl-11 pr-4 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
          />
        </div>

        <button 
          onClick={() => setState("ui", "insightsOpen", !state.ui.insightsOpen)}
          class={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            state.ui.insightsOpen ? "bg-forest text-white" : "bg-sage/50 text-forest hover:bg-sage"
          }`}
        >
          <span class="material-icons text-2xl">eco</span>
        </button>

        <div class="flex items-center gap-3 pl-4 border-l border-forest/10">
          <div class="text-right">
            <p class="text-sm font-outfit font-semibold text-forest">Hello, {state.settings.userName}</p>
            <p class="text-[10px] text-earth uppercase tracking-widest">Master Gardener</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center overflow-hidden border border-forest/5">
             <img src={`https://ui-avatars.com/api/?name=${state.settings.userName}&background=1A4D2E&color=fff`} alt="Avatar" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
