import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import AddIcon from "@suid/icons-material/Add";
import LocalDrinkIcon from "@suid/icons-material/LocalDrinkOutlined";
import { getAccountsWithBalances } from "../data/expenseData";
import { readGardenCache, writeGardenCache, clearGardenCache } from "../data/gardenCache";
import { useAuth } from "../context/authContext";
import { setState } from "../store";
import { createGardenGoal, gardenProgress, importLocalGoals, isPlantDead, lastWateredLabel, loadGarden, waterGoal, type GardenGoal } from "../data/gardenData";
import type { Account } from "../types";
import { formatNumericInput, formatRupiah } from "../utils/format";

const inputClass = "w-full rounded-xl border border-forest/20 bg-white px-3 py-2 text-forest outline-none focus:border-mid-green";
const quickWaterAmounts = [50000, 100000, 500000, 1000000];
const buttonClass = "w-full cursor-pointer rounded-xl bg-forest px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

function PlantCard(props: { goal: GardenGoal; now: number; onWater: () => void }) {
  const percent = () => gardenProgress(props.goal.current, props.goal.target);
  const dead = () => isPlantDead(props.goal, props.now);
  return <div class="premium-card flex flex-col items-center overflow-hidden bg-white p-4 sm:p-6 lg:p-8">
    <div class="relative mb-4 flex h-36 w-28 items-end justify-center sm:mb-6 sm:h-40 sm:w-32" aria-label={dead() ? "Dead plant" : `Plant grown ${Math.round(percent())}%`}>
      <div class="absolute bottom-0 z-10 h-12 w-16 rounded-t-sm rounded-b-xl border-t-4 border-earth/30 bg-earth/20" />
      <svg viewBox="0 0 100 100" class="h-full w-full origin-bottom pb-8 transition-transform duration-1000" style={{ transform: `scale(${0.4 + percent() / 100 * 0.6})` }}>
        <path d={dead() ? "M50 100 Q50 50 72 25" : "M50 100 Q50 50 50 10"} stroke={dead() ? "#8b7866" : "#1A4D2E"} stroke-width="4" fill="none" />
        <path d={dead() ? "M52 75 Q28 75 20 90 M57 55 Q76 58 82 75" : "M50 80 Q30 70 20 50 M50 80 Q70 70 80 50"} stroke={dead() ? "#a18b77" : "#2D7D46"} stroke-width="3" fill="none" />
        <Show when={percent() >= 25}><path d={dead() ? "M65 38 Q45 40 39 55" : "M50 50 Q30 40 15 20 M50 50 Q70 40 85 20"} stroke={dead() ? "#a18b77" : "#52C278"} stroke-width="3" fill="none" /></Show>
        <Show when={percent() >= 65 && !dead()}><path d="M50 30 Q38 22 33 8 M50 30 Q62 22 67 8" stroke="#52C278" stroke-width="3" fill="none" /><circle cx="50" cy="10" r="5" fill="#52C278" /></Show>
      </svg>
      <div class="absolute right-0 top-4 rounded-full bg-spring/10 px-2 py-1 text-[10px] font-bold text-spring">{percent().toFixed(0)}%</div>
    </div>
    <div class="mb-4 w-full space-y-1 text-center sm:mb-6"><h4 class="font-outfit text-lg font-bold text-forest sm:text-xl">{props.goal.emoji} {props.goal.name}</h4><p class="text-xs text-earth">Targeting {formatRupiah(props.goal.target)}</p><p class="text-xs text-earth">{lastWateredLabel(props.goal.lastWateredAt, props.now)}{dead() ? " · Plant is dead" : ""}</p></div>
    <div class="w-full space-y-4"><div class="h-2 w-full overflow-hidden rounded-full bg-sage/30"><div class="h-full bg-gradient-to-r from-forest to-spring transition-all duration-1000" style={{ width: `${percent()}%` }} /></div><div class="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-earth"><span>Saved: {formatRupiah(props.goal.current)}</span><span>Ends: {new Date(`${props.goal.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div></div>
    <button onClick={props.onWater} class="group/btn mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sage/30 py-3 font-outfit font-bold text-forest transition-all hover:bg-forest hover:text-white sm:mt-8"><LocalDrinkIcon class="h-4 w-4 text-mid-green group-hover/btn:text-white" />Water it</button>
  </div>;
}

export default function Goals() {
  const { user } = useAuth();
  const userId = user()?.id;
  const cached = userId ? readGardenCache(userId) : null;
  const [goals, setGoals] = createSignal<GardenGoal[]>(cached?.goals || []);
  const [accounts, setAccounts] = createSignal<Account[]>(cached?.accounts || []);
  const [now, setNow] = createSignal(Date.now());
  const [dialog, setDialog] = createSignal<"create" | "water" | null>(null);
  const [selectedGoal, setSelectedGoal] = createSignal<GardenGoal>();
  const [name, setName] = createSignal(""); const [emoji, setEmoji] = createSignal("🌱");
  const [target, setTarget] = createSignal(""); const [date, setDate] = createSignal("");
  const [amount, setAmount] = createSignal(""); const [accountId, setAccountId] = createSignal("");
  const [accountMenuOpen, setAccountMenuOpen] = createSignal(false);
  const selectedAccount = () => accounts().find(account => account.id === accountId());
  const [loading, setLoading] = createSignal(!cached); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal("");
  let requestId = "";
  const message = (e: unknown) => e instanceof Error ? e.message : (e as { message?: string })?.message || "Something went wrong. Please try again.";
  let refreshVersion = 0;
  let active = true;
  async function refresh() {
    const version = ++refreshVersion;
    const [g, a] = await Promise.all([loadGarden(), getAccountsWithBalances()]);
    if (!active || version !== refreshVersion || user()?.id !== userId) return;
    setGoals(g); setAccounts(a); setState("goals", g); setError("");
    if (userId) writeGardenCache(userId, { goals: g, accounts: a });
  }
  const changed = (event: Event) => {
    if ((event as CustomEvent).detail?.source === "garden") return;
    void refresh().catch(e => { if (active) setError(message(e)); });
  };
  onMount(() => {
    if (cached) setState("goals", cached.goals);
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    window.addEventListener("finly:data-changed", changed);
    onCleanup(() => { active = false; clearInterval(timer); window.removeEventListener("finly:data-changed", changed); });
    void (async () => { try { if (!cached) await importLocalGoals(); await refresh(); } catch (e) { if (active) setError(message(e)); } finally { if (active) setLoading(false); } })();
  });
  function openWater(goal: GardenGoal) { setSelectedGoal(goal); setAmount(""); setAccountId(accounts()[0]?.id || ""); setAccountMenuOpen(false); setError(""); requestId = crypto.randomUUID(); setDialog("water"); }
  async function submit(e: Event) {
    e.preventDefault(); if (busy()) return; setError("");
    const value = Number(dialog() === "water" ? amount() : target());
    if (!Number.isFinite(value) || value <= 0) { setError("Enter an amount greater than zero."); return; }
    if (dialog() === "water" && !accountId()) { setError("Select an account."); return; }
    if (dialog() === "create" && (!name().trim() || !date())) { setError("Enter a name and target date."); return; }
    setBusy(true);
    try {
      if (dialog() === "water") await waterGoal(selectedGoal()!.id, accountId(), value, requestId);
      else await createGardenGoal({ name: name().trim(), emoji: emoji().trim() || "🌱", target: value, date: date() });
      setDialog(null); setName(""); setEmoji("🌱"); setTarget(""); setDate("");
      if (userId) clearGardenCache(userId);
      window.dispatchEvent(new CustomEvent("finly:data-changed", { detail: { source: "garden" } }));
      await refresh();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <div class="animate-fade-in-up space-y-6 sm:space-y-8">
    <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><h2 class="font-cormorant text-2xl text-forest sm:text-3xl">Savings Garden</h2><p class="font-outfit text-xs text-earth sm:text-sm">Nurture your dreams and watch them grow.</p></div>
    <Show when={error() && !dialog()}><p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error()}</p></Show>
    <Show when={loading()}><p class="text-earth">Loading your garden...</p></Show>
    <div class="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"><For each={goals()}>{goal => <PlantCard goal={goal} now={now()} onWater={() => openWater(goal)} />}</For>
      <button type="button" onClick={() => { setError(""); setDialog("create"); }} class="premium-card group flex min-h-[280px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-forest/20 bg-transparent p-6 text-forest/40 transition-all hover:border-forest/40 hover:text-forest sm:p-8"><span class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest/5 sm:h-16 sm:w-16"><AddIcon sx={{ fontSize: 32 }} /></span><span class="font-outfit text-sm font-bold uppercase tracking-widest">New Seed</span></button>
    </div>
    <Show when={dialog()}><Portal><div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget && !busy()) { setDialog(null); setError(""); setAccountMenuOpen(false); } }}><div role="dialog" aria-modal="true" aria-labelledby="garden-dialog-title" class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><h3 id="garden-dialog-title" class="mb-4 font-outfit text-xl font-bold text-forest">{dialog() === "water" ? `Water ${selectedGoal()?.name}` : "Plant a new seed"}</h3><form onSubmit={submit} class="space-y-4">
      <Show when={dialog() === "create"}><label class="block text-sm text-earth">Goal name<input class={inputClass} value={name()} onInput={e => setName(e.currentTarget.value)} required /></label><label class="block text-sm text-earth">Emoji<input class={inputClass} value={emoji()} onInput={e => setEmoji(e.currentTarget.value)} /></label><label class="block text-sm text-earth">Target amount<input class={inputClass} type="number" min="0.01" step="any" value={target()} onInput={e => setTarget(e.currentTarget.value)} required /></label><label class="block text-sm text-earth">Target date<input class={inputClass} type="date" value={date()} onInput={e => setDate(e.currentTarget.value)} required /></label></Show>
      <Show when={dialog() === "water"}><div class="relative" onFocusOut={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAccountMenuOpen(false); }} onKeyDown={e => { if (e.key === "Escape" && accountMenuOpen()) { e.preventDefault(); setAccountMenuOpen(false); e.currentTarget.querySelector<HTMLButtonElement>("button")?.focus(); } }}>
        <span id="watering-account-label" class="mb-1 block text-sm text-earth">Account</span>
        <button type="button" aria-labelledby="watering-account-label watering-account-value" aria-expanded={accountMenuOpen()} aria-controls="watering-account-options" disabled={!accounts().length || busy()} onClick={() => setAccountMenuOpen(open => !open)} class="flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mid-green disabled:cursor-not-allowed disabled:opacity-50" style={{ "background-color": selectedAccount()?.color ? `${selectedAccount()!.color}15` : "rgba(44,74,56,0.05)", "border-color": selectedAccount()?.color ? `${selectedAccount()!.color}45` : "rgba(44,74,56,0.15)" }}>
          <span class="material-icons !text-lg" style={{ color: selectedAccount()?.color || "var(--color-mid-green)" }}>account_balance_wallet</span>
          <span id="watering-account-value" class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-forest">{selectedAccount()?.name || "Select an account"}</span><Show when={selectedAccount()}><span class="block text-xs text-earth">{formatRupiah(selectedAccount()?.balance ?? 0)}</span></Show></span>
          <span aria-hidden="true" class="material-icons !text-lg text-forest transition-transform" classList={{ "rotate-180": accountMenuOpen() }}>expand_more</span>
        </button>
        <Show when={accountMenuOpen()}><div id="watering-account-options" class="absolute left-0 right-0 z-10 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-forest/10 bg-white p-1 shadow-xl">
          <For each={accounts()}>{account => <button type="button" onClick={() => { setAccountId(account.id); setAccountMenuOpen(false); }} class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-mid-green" classList={{ "bg-forest/10": account.id === accountId() }}>
            <span class="h-2.5 w-2.5 shrink-0 rounded-full border border-forest/20" style={{ "background-color": account.color || "var(--color-mid-green)" }} />
            <span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold text-forest">{account.name}</span><span class="block text-xs text-earth">{formatRupiah(account.balance ?? 0)}</span></span>
            <Show when={account.id === accountId()}><span aria-label="Selected" class="material-icons !text-base text-forest">check</span></Show>
          </button>}</For>
        </div></Show>
      </div><Show when={!accounts().length}><p class="text-sm text-earth">Create an account before watering this goal.</p></Show><div>
        <label for="watering-amount" class="mb-1 block text-sm text-earth">Amount</label>
        <div class="relative"><span aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-earth">Rp</span><input id="watering-amount" class={`${inputClass} pl-10`} type="text" inputmode="numeric" autocomplete="off" placeholder="0" value={formatNumericInput(amount())} onInput={e => { const raw = e.currentTarget.value.replace(/\D/g, ""); setAmount(raw); e.currentTarget.value = formatNumericInput(raw); }} required /></div>
        <div class="mt-2 flex flex-wrap gap-2" aria-label="Quick pick amounts"><For each={quickWaterAmounts}>{value => <button type="button" aria-pressed={Number(amount()) === value} onClick={() => setAmount(String(value))} class="cursor-pointer rounded-full border border-forest/15 bg-sage/30 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:border-mid-green hover:bg-spring/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mid-green" classList={{ "!border-mid-green !bg-spring/20": Number(amount()) === value }}>{formatRupiah(value)}</button>}</For></div>
      </div></Show>
      <Show when={error()}><p role="alert" class="text-sm text-red-700">{error()}</p></Show><button class={buttonClass} type="submit" disabled={busy() || (dialog() === "water" && !accounts().length)}>{busy() ? "Saving..." : dialog() === "water" ? "Water goal" : "Create goal"}</button><button type="button" class="w-full cursor-pointer rounded-xl py-2 text-sm text-earth transition-colors hover:bg-forest/5 hover:text-forest disabled:cursor-not-allowed" disabled={busy()} onClick={() => { setDialog(null); setError(""); }}>Cancel</button>
    </form></div></div></Portal></Show>
  </div>;
}
