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
      <div class="flex items-center gap-4">
        <button 
          onClick={prevMonth}
          class="w-10 h-10 rounded-full hover:bg-sage/50 flex items-center justify-center text-forest transition-colors"
        >
          <ChevronLeftIcon />
        </button>
        <h2 class="text-xl font-outfit font-semibold text-forest min-w-[140px] text-center">
          {formattedDate()}
        </h2>
        <button 
          onClick={nextMonth}
          class="w-10 h-10 rounded-full hover:bg-sage/50 flex items-center justify-center text-forest transition-colors"
        >
          <ChevronRightIcon />
        </button>
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
