import { Plus } from "lucide-solid";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useAuth } from "../../../context/authContext";
import { getAccounts } from "../../../data/expenseData";
import { clearGardenCache, readGardenCache, writeGardenCache } from "../../../data/gardenCache";
import {
  createGardenGoal,
  importLocalGoals,
  loadGarden,
  waterGoal,
  type GardenGoal,
} from "../../../data/gardenData";
import { setState, state } from "../../../store";
import { transactions } from "../../../store/transactionStore";
import type { Account } from "../../../types";
import { computePeriodAccountBalances } from "../../../utils/accountBalance";
import { CreateGoalDialog } from "../components/CreateGoalDialog";
import { PlantCard } from "../components/PlantCard";
import { WaterGoalDialog } from "../components/WaterGoalDialog";

export function GoalsPage() {
  const { user } = useAuth();
  const userId = user()?.id;
  const cached = userId ? readGardenCache(userId) : null;

  const [goals, setGoals] = createSignal<GardenGoal[]>(cached?.goals || []);
  const [accounts, setAccounts] = createSignal<Account[]>(cached?.accounts || []);
  const [now, setNow] = createSignal(Date.now());
  const [dialog, setDialog] = createSignal<"create" | "water" | null>(null);
  const [selectedGoal, setSelectedGoal] = createSignal<GardenGoal>();
  const [name, setName] = createSignal("");
  const [emoji, setEmoji] = createSignal("🌱");
  const [target, setTarget] = createSignal("");
  const [date, setDate] = createSignal("");
  const [amount, setAmount] = createSignal("");
  const [accountId, setAccountId] = createSignal("");
  const [loading, setLoading] = createSignal(!cached);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  let requestId = "";
  let refreshVersion = 0;
  let active = true;

  const periodAccounts = createMemo(() =>
    computePeriodAccountBalances(
      accounts(),
      transactions(),
      state.ui.currentMonth,
      state.ui.datePeriod,
    ),
  );

  const periodLabel = createMemo(() => {
    const monthStr = new Date(state.ui.currentMonth).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${monthStr} · ${state.ui.datePeriod}`;
  });

  const message = (e: unknown) =>
    e instanceof Error
      ? e.message
      : (e as { message?: string })?.message || "Something went wrong. Please try again.";

  async function refresh() {
    const version = ++refreshVersion;
    const [g, a] = await Promise.all([loadGarden(), getAccounts()]);
    if (!active || version !== refreshVersion || user()?.id !== userId) return;
    setGoals(g);
    setAccounts(a);
    setState("goals", g);
    setError("");
    if (userId) writeGardenCache(userId, { goals: g, accounts: a });
  }

  const changed = (event: Event) => {
    if ((event as CustomEvent).detail?.source === "garden") return;
    void refresh().catch((e) => {
      if (active) setError(message(e));
    });
  };

  onMount(() => {
    if (cached) setState("goals", cached.goals);
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    window.addEventListener("finly:data-changed", changed);
    onCleanup(() => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("finly:data-changed", changed);
    });
    void (async () => {
      try {
        if (!cached) await importLocalGoals();
        await refresh();
      } catch (e) {
        if (active) setError(message(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
  });

  function openWater(goal: GardenGoal) {
    setSelectedGoal(goal);
    setAmount("");
    setAccountId(periodAccounts()[0]?.id || "");
    setError("");
    requestId = crypto.randomUUID();
    setDialog("water");
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (busy()) return;
    setError("");
    const value = Number(dialog() === "water" ? amount() : target());
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (dialog() === "water" && !accountId()) {
      setError("Select an account.");
      return;
    }
    if (dialog() === "create" && (!name().trim() || !date())) {
      setError("Enter a name and target date.");
      return;
    }
    setBusy(true);
    try {
      const targetGoal = selectedGoal();
      if (dialog() === "water" && targetGoal) {
        await waterGoal(targetGoal.id, accountId(), value, requestId);
      } else {
        await createGardenGoal({
          name: name().trim(),
          emoji: emoji().trim() || "🌱",
          target: value,
          date: date(),
        });
      }
      setDialog(null);
      setName("");
      setEmoji("🌱");
      setTarget("");
      setDate("");
      if (userId) clearGardenCache(userId);
      window.dispatchEvent(
        new CustomEvent("finly:data-changed", { detail: { source: "garden" } }),
      );
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="animate-fade-in-up space-y-6 sm:space-y-8">
      <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <h2 class="font-cormorant text-2xl text-forest sm:text-3xl">Savings Garden</h2>
        <p class="font-outfit text-xs text-earth sm:text-sm">
          Nurture your dreams and watch them grow.
        </p>
      </div>

      <Show when={error() && !dialog()}>
        <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error()}
        </p>
      </Show>

      <Show when={loading()}>
        <p class="text-earth">Loading your garden...</p>
      </Show>

      <div class="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        <For each={goals()}>
          {(goal) => <PlantCard goal={goal} now={now()} onWater={() => openWater(goal)} />}
        </For>

        <button
          type="button"
          onClick={() => {
            setError("");
            setDialog("create");
          }}
          class="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-white/40 p-6 text-forest/50 transition-all hover:border-forest/40 hover:bg-white/70 hover:text-forest sm:p-8"
        >
          <span class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/60 transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
            <Plus class="h-7 w-7" />
          </span>
          <span class="font-outfit text-sm font-bold uppercase tracking-widest">New Seed</span>
        </button>
      </div>

      <WaterGoalDialog
        open={dialog() === "water"}
        goal={selectedGoal()}
        accounts={periodAccounts()}
        accountId={accountId()}
        onAccountChange={setAccountId}
        amount={amount()}
        onAmountChange={setAmount}
        periodLabel={periodLabel()}
        busy={busy()}
        error={error()}
        onClose={() => {
          setDialog(null);
          setError("");
        }}
        onSubmit={submit}
      />

      <CreateGoalDialog
        open={dialog() === "create"}
        name={name()}
        onNameChange={setName}
        emoji={emoji()}
        onEmojiChange={setEmoji}
        target={target()}
        onTargetChange={setTarget}
        date={date()}
        onDateChange={setDate}
        busy={busy()}
        error={error()}
        onClose={() => {
          setDialog(null);
          setError("");
        }}
        onSubmit={submit}
      />
    </div>
  );
}

export default GoalsPage;
