import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { supabase } from "../../lib/supabase";
import { getAccounts } from "../../data/expenseData";
import { state } from "../../store";
import { transactions, isTransactionsLoading, transactionsError } from "../../store/transactionStore";
import { getDateRange, isDateInRange } from "../../utils/date";
import { isTransferTransaction } from "../../utils/transferUtils";
import { formatRupiah } from "../../utils/format";
import type { Account } from "../../types";

type Bucket = { id: string; name: string; is_emergency: boolean; target: number; contribution: number };
type Link = { bucket_id: string; account_id: string };
type Draft = { id: string | null; name: string; is_emergency: boolean; target: number; contribution: number; accounts: string[] };
const empty = (): Draft => ({ id: null, name: "", is_emergency: false, target: 0, contribution: 0, accounts: [] });
export function MoneyFramework(props: { accountId?: string }) {
  const [buckets, setBuckets] = createSignal<Bucket[]>([]);
  const [links, setLinks] = createSignal<Link[]>([]);
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [draft, setDraft] = createSignal<Draft | null>(null);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const init = await supabase.rpc("initialize_money_framework");
      if (init.error) throw init.error;
      const [b, l, a] = await Promise.all([supabase.from("money_buckets").select("*").order("name"), supabase.from("money_bucket_accounts").select("bucket_id,account_id"), getAccounts()]);
      if (b.error) throw b.error; if (l.error) throw l.error;
      setBuckets(b.data || []); setLinks(l.data || []); setAccounts(a);
    } catch (e) { setError((e as any)?.message || String(e)); }
    finally { setLoading(false); }
  }
  onMount(load);
  const nonTransfers = createMemo(() => transactions().filter(t => !isTransferTransaction(t)));
  const selected = createMemo(() => {
    const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
    const items = nonTransfers().filter(t => isDateInRange(t.date, start, end) && (!props.accountId || t.accountId === props.accountId));
    return { income: items.filter(t => t.type === "income").reduce((n,t) => n+t.amount,0), expense: items.filter(t => t.type === "expense").reduce((n,t) => n+t.amount,0) };
  });
  const baseline = createMemo(() => {
    const tx = nonTransfers(); if (!tx.length) return [] as { label: string; expense: number }[];
    const earliest = Math.min(...tx.map(t => new Date(t.date).getTime()).filter(Number.isFinite));
    const now = new Date(); const month = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    const result: { label: string; expense: number }[] = [];
    while (month.getTime() >= earliest - 62 * 86400000 && result.length < 3) {
      const { start, end } = getDateRange(month.toISOString(), state.ui.datePeriod);
      if (end < now) {
        const items = tx.filter(t => isDateInRange(t.date, start, end));
        if (items.length) result.push({ label: end.toLocaleDateString("en-US", { month: "short", year: "numeric" }), expense: items.filter(t => t.type === "expense").reduce((n,t) => n+t.amount,0) });
      }
      month.setMonth(month.getMonth()-1);
    }
    return result;
  });
  const emergencyTarget = () => baseline().length ? baseline().reduce((n,p) => n+p.expense,0) / baseline().length * 6 : null;
  const balance = (id: string) => {
    const ids = new Set(links().filter(l => l.bucket_id === id).map(l => l.account_id));
    return transactions().filter(t => t.accountId && ids.has(t.accountId)).reduce((n,t) => n + (t.type === "income" ? t.amount : -t.amount), 0);
  };
  const planned = () => buckets().reduce((n,b) => n+Number(b.contribution),0);
  const remainder = () => selected().income-selected().expense-planned();
  const patch = (v: Partial<Draft>) => setDraft(d => d ? { ...d, ...v } : d);
  const edit = (b: Bucket) => setDraft({ ...b, target: Number(b.target), contribution: Number(b.contribution), accounts: links().filter(l => l.bucket_id === b.id).map(l => l.account_id) });
  async function save(e: Event) {
    e.preventDefault(); const d = draft(); if (!d || saving()) return; setSaving(true); setError("");
    try { const { error } = await supabase.rpc("save_money_bucket", { p_id: d.id, p_name: d.name.trim(), p_emergency: d.is_emergency, p_target: d.target, p_contribution: d.contribution, p_accounts: d.accounts });
      if (error) throw error; setDraft(null); await load();
    } catch (e) { setError((e as any)?.message || String(e)); } finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Remove this bucket? Assigned accounts will remain unchanged.")) return;
    const { error } = await supabase.from("money_buckets").delete().eq("id", id);
    if (error) setError(error.message); else await load();
  }
  const projection = (target: number | null, current: number, contribution: number) => {
    if (target === null) return "No estimate"; if (current >= target) return "Complete"; if (contribution <= 0) return "No estimate";
    const months = Math.ceil((target-current)/contribution); const date = new Date(); date.setDate(1); date.setMonth(date.getMonth()+months);
    return `${months} months - ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };
  return <section class="space-y-4">
    <div class="flex flex-wrap justify-between items-center gap-3"><div><h3 class="text-xl font-outfit font-bold text-forest">Money framework</h3><p class="text-sm text-earth">Account balances and planned monthly contributions</p></div><button class="px-4 py-2 rounded-xl bg-forest text-white" onClick={() => setDraft(empty())}>Add bucket</button></div>
    <Show when={error() || transactionsError()}><p role="alert" class="text-red-700">{error() || transactionsError()}</p></Show>
    <Show when={!loading() && !isTransactionsLoading()} fallback={<p>Loading framework...</p>}>
      <div class="grid gap-4 md:grid-cols-3"><For each={buckets()}>{b => {
        const target = () => b.is_emergency ? emergencyTarget() : Number(b.target); const current = () => balance(b.id);
        return <article class="premium-card p-5 space-y-2"><div class="flex justify-between gap-2"><h4 class="font-bold text-forest">{b.name}</h4><div class="flex gap-2 text-sm"><button onClick={() => edit(b)}>Edit</button><button onClick={() => remove(b.id)}>Remove</button></div></div>
          <p>{formatRupiah(current())} / {target() === null ? "Insufficient data" : formatRupiah(target()!)}</p>
          <div class="h-2 rounded bg-sage/30"><div class="h-2 rounded bg-forest" style={{ width: `${target() && target()! > 0 ? Math.max(0, Math.min(100, current()/target()!*100)) : 0}%` }} /></div>
          <p class="text-sm text-earth">Planned: {formatRupiah(Number(b.contribution))} / month</p><p class="text-sm">{projection(target(), current(), Number(b.contribution))}</p>
          <p class="text-xs text-earth">Accounts: {links().filter(l => l.bucket_id === b.id).map(l => accounts().find(a => a.id === l.account_id)?.name || "Unknown").join(", ") || "None assigned"}</p>
          <Show when={b.is_emergency}><p class="text-xs text-earth">{baseline().length ? `Six times average spending (${baseline().map(p => p.label).join(", ")}): ${formatRupiah(emergencyTarget()! / 6)} per period` : "No completed periods with transaction data."}</p></Show>
        </article>;
      }}</For></div>
      <div class="premium-card p-5"><h4 class="font-bold text-forest">Monthly money flow</h4><p class="text-sm text-earth">Selected period. Recorded income and expenses; contributions are plans.</p>
        <div class="flex flex-wrap items-center gap-3 mt-4 text-sm"><div>Income<br/><strong>{formatRupiah(selected().income)}</strong></div><span aria-hidden="true">&rarr;</span><div>Spending<br/><strong>{formatRupiah(selected().expense)}</strong></div><span aria-hidden="true">&rarr;</span><div>Planned buckets<br/><strong>{formatRupiah(planned())}</strong><For each={buckets()}>{b => <div>{b.name}: {formatRupiah(Number(b.contribution))}</div>}</For></div><span aria-hidden="true">&rarr;</span><div>Unallocated<br/><strong>{formatRupiah(remainder())}</strong></div></div>
        <Show when={remainder() < 0}><p class="text-red-700 mt-2">Income after spending and planned contributions is short by {formatRupiah(-remainder())}.</p></Show>
      </div>
    </Show>
    <Show when={draft()}>{d => <form onSubmit={save} class="premium-card p-5 space-y-3"><h4 class="font-bold">{d().id ? "Edit bucket" : "New bucket"}</h4>
      <label class="block">Name <input class="border rounded p-2 w-full" required value={d().name} onInput={e => patch({ name: e.currentTarget.value })} /></label>
      <label class="block"><input type="checkbox" checked={d().is_emergency} onChange={e => patch({ is_emergency: e.currentTarget.checked })} /> Emergency fund target (six months of spending)</label>
      <Show when={!d().is_emergency}><label class="block">Target <input class="border rounded p-2 w-full" type="number" min="0" required value={d().target} onInput={e => patch({ target: Number(e.currentTarget.value) })} /></label></Show>
      <label class="block">Planned contribution per month <input class="border rounded p-2 w-full" type="number" min="0" required value={d().contribution} onInput={e => patch({ contribution: Number(e.currentTarget.value) })} /></label>
      <fieldset><legend>Accounts</legend><For each={accounts()}>{a => { const occupied = () => links().some(l => l.account_id === a.id && l.bucket_id !== d().id); return <label class="block"><input type="checkbox" disabled={occupied()} checked={d().accounts.includes(a.id)} onChange={e => patch({ accounts: e.currentTarget.checked ? [...d().accounts,a.id] : d().accounts.filter(id => id !== a.id) })} /> {a.name}{occupied() ? " (assigned to another bucket)" : ""}</label>; }}</For></fieldset>
      <div class="flex gap-3"><button class="bg-forest text-white rounded px-4 py-2" disabled={saving()} type="submit">Save</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}</Show>
  </section>;
}
