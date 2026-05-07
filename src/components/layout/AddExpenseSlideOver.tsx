import { createSignal, For } from "solid-js";
import { state, setState, addTransaction } from "../../store";
import CloseIcon from "@suid/icons-material/Close";
import CheckIcon from "@suid/icons-material/Check";

const CATEGORIES = [
  { name: "Food", emoji: "🍱" },
  { name: "Transport", emoji: "🚗" },
  { name: "Entertainment", emoji: "🍿" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Health", emoji: "🏥" },
  { name: "Utilities", emoji: "💡" },
];

const SUGGESTIONS = ["Starbucks", "Amazon", "Uber", "Grocery Store", "Shell", "Netflix"];

const AddExpenseSlideOver = () => {
  const [amount, setAmount] = createSignal("");
  const [selectedCategory, setSelectedCategory] = createSignal(CATEGORIES[0].name);
  const [merchant, setMerchant] = createSignal("");
  const [note, setNote] = createSignal("");

  const handleAdd = () => {
    if (!amount() || !merchant()) return;
    
    addTransaction({
      amount: parseFloat(amount()),
      category: selectedCategory(),
      name: merchant(),
      note: note(),
      date: new Date().toISOString(),
    });

    // Reset and close
    setAmount("");
    setMerchant("");
    setNote("");
    setState("ui", "showAddExpense", false);
  };

  return (
    <div 
      class={`fixed inset-0 z-50 flex justify-end transition-all duration-500 ${
        state.ui.showAddExpense ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div 
        class={`absolute inset-0 bg-forest/20 backdrop-blur-sm transition-opacity duration-500 ${
          state.ui.showAddExpense ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setState("ui", "showAddExpense", false)}
      />

      {/* Panel */}
      <div 
        class={`relative w-[340px] h-screen bg-white shadow-[-20px_0_40px_rgba(26,77,46,0.1)] p-8 flex flex-col transition-transform duration-500 ease-out ${
          state.ui.showAddExpense ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div class="flex items-center justify-between mb-10">
          <h3 class="text-xl font-outfit font-bold text-forest">Add Expense</h3>
          <button 
            onClick={() => setState("ui", "showAddExpense", false)}
            class="text-earth hover:text-forest"
          >
            <CloseIcon />
          </button>
        </div>

        <div class="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          {/* Amount Input */}
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest">Amount</label>
            <div class="relative">
              <span class="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-outfit font-semibold text-forest">Rp</span>
              <input 
                type="number" 
                placeholder="0.00"
                value={amount()}
                onInput={(e) => setAmount(e.currentTarget.value)}
                class="w-full pl-6 pb-2 bg-transparent border-b-2 border-sage focus:border-forest outline-none text-4xl font-outfit font-semibold text-forest transition-colors"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest">Category</label>
            <div class="grid grid-cols-2 gap-3">
              <For each={CATEGORIES}>
                {(cat) => (
                  <button 
                    onClick={() => setSelectedCategory(cat.name)}
                    class={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      selectedCategory() === cat.name 
                        ? "bg-forest border-forest text-white shadow-lg" 
                        : "bg-sage/20 border-forest/5 text-forest hover:bg-sage/40"
                    }`}
                  >
                    <span class="text-xl">{cat.emoji}</span>
                    <span class="text-[10px] font-medium font-outfit">{cat.name}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Merchant */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest">Merchant</label>
            <input 
              type="text" 
              placeholder="Where did you spend?"
              value={merchant()}
              onInput={(e) => setMerchant(e.currentTarget.value)}
              class="w-full p-4 bg-page-bg rounded-xl font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
            />
            <div class="flex flex-wrap gap-2">
              <For each={SUGGESTIONS}>
                {(s) => (
                  <button 
                    onClick={() => setMerchant(s)}
                    class="px-3 py-1 bg-sage/20 text-forest text-[10px] font-medium rounded-full hover:bg-sage/40"
                  >
                    {s}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Notes */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest">Note (Optional)</label>
            <textarea 
              placeholder="What was it for?"
              value={note()}
              onInput={(e) => setNote(e.currentTarget.value)}
              class="w-full p-4 bg-page-bg rounded-xl font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-24"
            />
          </div>
        </div>

        <button 
          onClick={handleAdd}
          class="mt-8 w-full h-14 bg-forest text-white rounded-2xl font-outfit font-semibold flex items-center justify-center gap-2 hover:bg-mid-green transition-all shadow-xl shadow-forest/20"
        >
          <CheckIcon />
          Add Expense
        </button>
      </div>
    </div>
  );
};

export default AddExpenseSlideOver;
