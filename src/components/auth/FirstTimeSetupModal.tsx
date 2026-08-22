import { createSignal, For, Show } from "solid-js";
import { createDefaultUserData } from "../../data/expenseData";
import { setState } from "../../store";
import { formatRupiah } from "../../utils/format";

interface FirstTimeSetupModalProps {
  userId: string;
  onComplete: () => void;
}

const AVAILABLE_CATEGORIES = [
  { name: "Food & Dining", icon: "restaurant", color: "#d47b5a" },
  { name: "Transport", icon: "directions_car", color: "#52c278" },
  { name: "Bills & Utilities", icon: "receipt_long", color: "#6366f1" },
  { name: "Shopping", icon: "shopping_bag", color: "#f43f5e" },
  { name: "Investments", icon: "trending_up", color: "#1a4d2e" },
  { name: "Health & Wellness", icon: "favorite", color: "#a78bfa" },
];

export const FirstTimeSetupModal = (props: FirstTimeSetupModalProps) => {
  const [initialBalance, setInitialBalance] = createSignal<number>(0);
  const [balanceInput, setBalanceInput] = createSignal<string>("");
  const [monthlyLimit, setMonthlyLimit] = createSignal<number>(10000000);
  const [limitInput, setLimitInput] = createSignal<string>("10000000");
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>(
    AVAILABLE_CATEGORIES.map((c) => c.name)
  );
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleBalanceChange = (val: string) => {
    const numeric = parseInt(val.replace(/\D/g, ""), 10) || 0;
    setInitialBalance(numeric);
    setBalanceInput(numeric > 0 ? numeric.toLocaleString("id-ID") : "");
  };

  const handleLimitChange = (val: string) => {
    const numeric = parseInt(val.replace(/\D/g, ""), 10) || 0;
    setMonthlyLimit(numeric);
    setLimitInput(numeric > 0 ? numeric.toLocaleString("id-ID") : "");
  };

  const handleSubmit = async (skip: boolean = false) => {
    if (isSubmitting()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const balance = skip ? 0 : initialBalance();
      const categories = skip ? undefined : selectedCategories();
      const limit = skip ? 10000000 : monthlyLimit();

      await createDefaultUserData(props.userId, balance, categories);

      setState("settings", "monthlyLimit", limit);
      props.onComplete();
    } catch (err: any) {
      console.error("Setup error:", err);
      setErrorMsg(err.message || "Failed to initialize account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/40 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-2xl shadow-2xl border border-forest/10 max-w-lg w-full p-8 flex flex-col gap-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div class="flex items-center gap-4 border-b border-forest/10 pb-5">
          <div class="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-white shrink-0 shadow-md">
            <span class="material-icons text-2xl">spa</span>
          </div>
          <div>
            <span class="text-[10px] font-bold text-earth uppercase tracking-widest">
              Welcome to Finly Zen
            </span>
            <h2 class="text-2xl font-cormorant font-bold text-forest leading-tight">
              Let's Set Up Your Garden
            </h2>
          </div>
        </div>

        <Show when={errorMsg()}>
          <div class="p-3 bg-terracotta/10 border border-terracotta/20 rounded-xl text-terracotta text-xs">
            {errorMsg()}
          </div>
        </Show>

        {/* Step 1: Main Account Initial Balance */}
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold font-outfit text-forest uppercase tracking-wider">
            1. Starting Balance for "Main" Account (IDR)
          </label>
          <p class="text-xs text-earth/80 font-outfit">
            We will create your default primary account named <strong>Main</strong>.
          </p>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-forest/60">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={balanceInput()}
              onInput={(e) => handleBalanceChange(e.currentTarget.value)}
              class="w-full bg-sage/20 border border-forest/10 rounded-xl pl-10 pr-4 py-2.5 font-outfit text-sm font-bold text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
            />
          </div>
        </div>

        {/* Step 2: Monthly Budget Limit */}
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold font-outfit text-forest uppercase tracking-wider">
            2. Monthly Spending Target (IDR)
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-forest/60">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="10,000,000"
              value={limitInput()}
              onInput={(e) => handleLimitChange(e.currentTarget.value)}
              class="w-full bg-sage/20 border border-forest/10 rounded-xl pl-10 pr-4 py-2.5 font-outfit text-sm font-bold text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all placeholder:text-forest/30"
            />
          </div>
        </div>

        {/* Step 3: Starter Categories */}
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold font-outfit text-forest uppercase tracking-wider">
            3. Starter Expense Categories
          </label>
          <div class="grid grid-cols-2 gap-2 mt-1">
            <For each={AVAILABLE_CATEGORIES}>
              {(cat) => {
                const isChecked = () => selectedCategories().includes(cat.name);
                return (
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    class={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                      isChecked()
                        ? "bg-sage/50 border-forest/20 text-forest font-semibold"
                        : "bg-white border-forest/5 text-earth hover:bg-sage/20"
                    }`}
                  >
                    <span
                      class="material-icons text-base shrink-0"
                      style={{ color: cat.color }}
                    >
                      {cat.icon}
                    </span>
                    <span class="truncate">{cat.name}</span>
                    <span class="ml-auto material-icons text-sm text-forest">
                      {isChecked() ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>
                );
              }}
            </For>
          </div>
        </div>

        {/* Action Buttons */}
        <div class="flex items-center justify-between pt-4 border-t border-forest/10">
          <button
            type="button"
            disabled={isSubmitting()}
            onClick={() => handleSubmit(true)}
            class="text-xs font-outfit font-semibold text-earth hover:text-forest transition-colors py-2.5 px-4 cursor-pointer disabled:opacity-50"
          >
            Skip with Defaults
          </button>

          <button
            type="button"
            disabled={isSubmitting()}
            onClick={() => handleSubmit(false)}
            class="flex items-center gap-2 bg-forest hover:bg-forest/90 text-white font-outfit font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Show when={isSubmitting()}>
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </Show>
            <span>{isSubmitting() ? "Initializing..." : "Enter Finly Zen"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeSetupModal;
