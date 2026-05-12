import { createSignal, For, createResource, Show, createMemo, createEffect } from "solid-js";
import { state, setState } from "../../store";
import { getCategories, getAccounts, addTransaction } from "../../lib/db";
import CloseIcon from "@suid/icons-material/Close";
import CheckIcon from "@suid/icons-material/Check";
import LocalOfferIcon from "@suid/icons-material/LocalOfferOutlined";
import AccountBalanceWalletIcon from "@suid/icons-material/AccountBalanceWalletOutlined";
import CalendarTodayIcon from "@suid/icons-material/CalendarTodayOutlined";
import NotesIcon from "@suid/icons-material/NotesOutlined";
import SyncIcon from "@suid/icons-material/Sync";
import RepeatIcon from "@suid/icons-material/Repeat";
import HistoryIcon from "@suid/icons-material/History";
import { formatIconName, formatNumericInput } from "../../utils/format";

const AddExpenseSlideOver = () => {
  // Form State
  const [amount, setAmount] = createSignal("");
  const [type, setType] = createSignal<"expense" | "income">("expense");
  const [merchant, setMerchant] = createSignal("");
  const [categoryId, setCategoryId] = createSignal("");
  const [accountId, setAccountId] = createSignal("");
  const [date, setDate] = createSignal(new Date().toISOString().split("T")[0]);
  const [note, setNote] = createSignal("");
  const [isRecurring, setIsRecurring] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Data Resources
  const [categories] = createResource(getCategories);
  const [accounts] = createResource(getAccounts);

  // Suggestions (could be dynamic later)
  const suggestions = [
    "Starbucks",
    "Amazon",
    "Grab",
    "GoJek",
    "Netflix",
    "Spotify",
  ];

  const filteredCategories = createMemo(() => {
    const cats = categories() || [];
    if (type() === "income") {
      return cats.filter((c) => c.name.toLowerCase() === "income");
    } else {
      return cats.filter((c) => c.name.toLowerCase() !== "income");
    }
  });

  // Default category handling
  createEffect(() => {
    const currentType = type();
    const cats = categories() || [];
    if (cats.length === 0) return;

    if (currentType === "income") {
      const incomeCat = cats.find((c) => c.name.toLowerCase() === "income");
      if (incomeCat) setCategoryId(incomeCat.id);
    } else {
      const currentCatName = cats.find((c) => c.id === categoryId())?.name.toLowerCase();
      if (!categoryId() || currentCatName === "income") {
        const foodCat = cats.find((c) => c.name.toLowerCase() === "food");
        if (foodCat) setCategoryId(foodCat.id);
        else {
          const firstExpense = cats.find((c) => c.name.toLowerCase() !== "income");
          if (firstExpense) setCategoryId(firstExpense.id);
        }
      }
    }
  });

  const handleAdd = async (e: Event) => {
    e.preventDefault();
    if (!amount() || !merchant() || !categoryId() || !accountId()) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        amount: parseFloat(amount()),
        name: merchant(),
        category_id: categoryId(),
        account_id: accountId(),
        type: type(),
        note: note(),
        is_recurring: isRecurring(),
        created_at: new Date(date()).toISOString(),
      });

      // Reset and close
      resetForm();
      setState("ui", "showAddExpense", false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Failed to add transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setMerchant("");
    setCategoryId("");
    setAccountId("");
    setNote("");
    setIsRecurring(false);
    setType("expense");
  };

  const selectedCategory = createMemo(() =>
    categories()?.find((c) => c.id === categoryId()),
  );

  const selectedAccount = createMemo(() =>
    accounts()?.find((a) => a.id === accountId()),
  );

  return (
    <div
      class="fixed inset-0 z-50 flex justify-end"
      classList={{
        "pointer-events-auto": state.ui.showAddExpense,
        "pointer-events-none": !state.ui.showAddExpense,
      }}
    >
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-forest/40 transition-opacity duration-300 will-change-opacity"
        classList={{
          "opacity-100": state.ui.showAddExpense,
          "opacity-0": !state.ui.showAddExpense,
        }}
        onClick={() => setState("ui", "showAddExpense", false)}
      />

      {/* Panel */}
      <div
        class="relative w-full max-w-[420px] h-screen bg-white flex flex-col transition-transform duration-300 ease-out will-change-transform contain-content"
        style={{
          transform: state.ui.showAddExpense ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)"
        }}
      >
        {/* Header */}
        <div class="px-8 py-6 flex items-center justify-between border-b border-forest/5">
          <div class="space-y-1">
            <h3 class="text-2xl font-cormorant font-bold text-forest">
              New Transaction
            </h3>
            <p class="text-[10px] font-bold text-earth uppercase tracking-widest">
              Tending to your garden
            </p>
          </div>
          <button
            onClick={() => setState("ui", "showAddExpense", false)}
            class="w-10 h-10 rounded-full flex items-center justify-center text-earth hover:bg-sage/20 transition-all cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={handleAdd}
          class="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 pb-32 will-change-scroll contain-paint overscroll-contain"
        >
          {/* Type Toggle */}
          <div class="flex p-1 bg-page-bg rounded-2xl border border-forest/5">
            <button
              type="button"
              onClick={() => setType("expense")}
              class={`flex-1 py-3 rounded-xl font-outfit text-sm font-bold transition-all cursor-pointer ${
                type() === "expense"
                  ? "bg-white text-forest shadow-md"
                  : "text-earth hover:text-forest"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              class={`flex-1 py-3 rounded-xl font-outfit text-sm font-bold transition-all cursor-pointer ${
                type() === "income"
                  ? "bg-white text-spring shadow-md"
                  : "text-earth hover:text-spring"
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div class="space-y-2 group">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <span class="material-icons !text-[14px]">payments</span> Amount
            </label>
            <div class="relative group-focus-within:scale-[1.02] transition-transform duration-300 origin-left">
              <span class="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-outfit font-semibold text-forest/40">
                Rp
              </span>
              <input
                type="text"
                inputmode="numeric"
                placeholder="0"
                required
                value={formatNumericInput(amount())}
                onInput={(e) => {
                  const rawValue = e.currentTarget.value.replace(/\D/g, "");
                  setAmount(rawValue);
                }}
                class="w-full pl-8 pb-2 bg-transparent border-b-2 border-sage/30 focus:border-forest outline-none text-5xl font-outfit font-semibold text-forest transition-all placeholder:text-forest/10"
              />
            </div>
          </div>

          {/* Merchant / Name */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <LocalOfferIcon sx={{ fontSize: 14 }} /> Name / Merchant
            </label>
            <input
              type="text"
              placeholder="Where did you spend?"
              required
              value={merchant()}
              onInput={(e) => setMerchant(e.currentTarget.value)}
              class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all"
            />
            <div class="flex flex-wrap gap-2">
              <For each={suggestions}>
                {(s) => (
                  <button
                    type="button"
                    onClick={() => setMerchant(s)}
                    class="px-3 py-1 bg-sage/40 border-forest/10 border text-forest text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-sage/40 transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Category Selector */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <span class="material-icons !text-[14px]">category</span> Category
            </label>
            <div class="grid grid-cols-3 gap-3">
              <Show
                when={!categories.loading}
                fallback={
                  <For each={[1, 2, 3, 4, 5, 6]}>
                    {() => (
                      <div class="h-20 bg-page-bg rounded-2xl animate-pulse" />
                    )}
                  </For>
                }
              >
                <For each={filteredCategories()}>
                  {(cat) => (
                    <button
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      class="p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-[transform,colors,shadow] duration-200 group cursor-pointer"
                      classList={{
                        "border-transparent text-white shadow-xl scale-[1.05]": categoryId() === cat.id,
                        "bg-white border-forest/10 text-forest hover:border-forest/30": categoryId() !== cat.id,
                      }}
                      style={{
                        "background-color": categoryId() === cat.id 
                          ? (cat.color?.startsWith('0x') ? '#' + cat.color.substring(4) : cat.color) || "var(--color-forest)"
                          : (cat.color?.startsWith('0x') ? '#' + cat.color.substring(4) + '15' : cat.color + '15') || "rgba(232, 245, 236, 0.5)"
                      }}
                    >
                      <span
                        class={`material-icons text-xl h-6 w-6 ${categoryId() === cat.id ? "text-white" : ""}`}
                        style={{
                          color: categoryId() === cat.id 
                            ? "white" 
                            : (cat.color?.startsWith('0x') ? '#' + cat.color.substring(4) : cat.color) || "var(--color-forest)"
                        }}
                      >
                        {formatIconName(cat.icon)}
                      </span>
                      <span 
                        class="text-[10px] font-bold font-outfit uppercase tracking-tighter truncate w-full text-center"
                        style={{
                          color: categoryId() === cat.id 
                            ? "white" 
                            : "var(--color-forest)"
                        }}
                      >
                        {cat.name}
                      </span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </div>

          {/* Account Selector */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <AccountBalanceWalletIcon sx={{ fontSize: 14 }} /> Account
            </label>
            <div class="space-y-2">
              <Show
                when={!accounts.loading}
                fallback={
                  <div class="h-12 bg-page-bg rounded-2xl animate-pulse" />
                }
              >
                <For each={accounts()}>
                  {(acc) => (
                    <button
                      type="button"
                      onClick={() => setAccountId(acc.id)}
                      class="w-full p-4 rounded-2xl border flex items-center justify-between transition-[colors,shadow,border-color] duration-200 cursor-pointer"
                      classList={{
                        "shadow-sm": accountId() === acc.id,
                        "bg-page-bg border-forest/5 hover:border-forest/20": accountId() !== acc.id,
                      }}
                      style={{
                        "background-color": accountId() === acc.id 
                          ? (acc.color?.startsWith('0x') ? '#' + acc.color.substring(4) + '15' : acc.color + '15') || "rgba(26,77,46,0.05)"
                          : "var(--color-page-bg)",
                        "border-color": accountId() === acc.id
                          ? (acc.color?.startsWith('0x') ? '#' + acc.color.substring(4) : acc.color) || "var(--color-forest)"
                          : "rgba(26,77,46,0.05)"
                      }}
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-2 h-2 rounded-full"
                          style={{
                            "background-color": (acc.color?.startsWith('0x') ? '#' + acc.color.substring(4) : acc.color) || "var(--color-forest)",
                          }}
                        />
                        <span
                          class={`font-outfit text-sm font-semibold`}
                          style={{
                            color: accountId() === acc.id 
                              ? (acc.color?.startsWith('0x') ? '#' + acc.color.substring(4) : acc.color) || "var(--color-forest)"
                              : "var(--color-earth)"
                          }}
                        >
                          {acc.name}
                        </span>
                      </div>
                      <Show when={accountId() === acc.id}>
                        <div 
                          class="w-5 h-5 rounded-full text-white flex items-center justify-center"
                          style={{
                            "background-color": (acc.color?.startsWith('0x') ? '#' + acc.color.substring(4) : acc.color) || "var(--color-forest)"
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 12 }} />
                        </div>
                      </Show>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </div>

          {/* Date & Note Row */}
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <CalendarTodayIcon sx={{ fontSize: 14 }} /> Date
              </label>
              <input
                type="date"
                value={date()}
                onInput={(e) => setDate(e.currentTarget.value)}
                class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none cursor-pointer"
              />
            </div>
            <div class="space-y-3 flex flex-col">
              <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
                <SyncIcon sx={{ fontSize: 14 }} /> Is Recurring?
              </label>
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring())}
                class={`flex p-4 rounded-2xl border gap-2 transition-all font-outfit text-sm font-bold cursor-pointer ${
                  isRecurring()
                    ? "bg-spring/10 border-spring text-spring"
                    : "bg-page-bg border-forest/5 text-earth"
                }`}
              >
                <Show when={isRecurring()} fallback={<HistoryIcon sx={{ fontSize: 18 }} />}>
                  <RepeatIcon sx={{ fontSize: 18 }} />
                </Show>
                {isRecurring() ? "Every Month" : "One-time"}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div class="space-y-3">
            <label class="text-[10px] font-bold text-earth uppercase tracking-widest flex items-center gap-1.5">
              <NotesIcon sx={{ fontSize: 14 }} /> Note (Optional)
            </label>
            <textarea
              placeholder="What was this for? (e.g. Lunch with friends)"
              value={note()}
              onInput={(e) => setNote(e.currentTarget.value)}
              class="w-full p-4 bg-page-bg rounded-2xl border border-forest/5 font-outfit text-sm focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-24"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div class="absolute bottom-0 left-0 right-0 p-8 bg-white">
          <button
            type="submit"
            onClick={handleAdd}
            disabled={isSubmitting()}
            class={`w-full h-16 rounded-2xl font-outfit font-bold flex items-center justify-center gap-3 transition-all shadow-2xl cursor-pointer ${
              isSubmitting()
                ? "bg-sage text-forest/40 cursor-not-allowed"
                : "bg-forest text-white hover:bg-mid-green shadow-forest/20 hover:-translate-y-1"
            }`}
          >
            <Show
              when={isSubmitting()}
              fallback={
                <>
                  <CheckIcon /> Add Transaction
                </>
              }
            >
              <div class="w-5 h-5 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
              Saving...
            </Show>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseSlideOver;
