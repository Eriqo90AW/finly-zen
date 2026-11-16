import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import type { ApexOptions } from "apexcharts";
import { state, setCategoryBudget, budgetSyncError, budgetSyncLoading, budgetSyncReady } from "../store";
import { transactions, isTransactionsLoading, transactionsError } from "../store/transactionStore";
import { getAccounts } from "../data/expenseData";
import type { Account } from "../types";
import { getDateRange } from "../utils/date";
import { summarizeBudgets } from "../utils/budgetSummary";
import { formatRupiah } from "../utils/format";
import { MoneyFramework } from "../components/screen-budgets/MoneyFramework";

const Budgets = () => {
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = createSignal("");
  const [editing, setEditing] = createSignal<string | null>(null);
  const [amount, setAmount] = createSignal("");
  onMount(async () => setAccounts(await getAccounts()));
  const period = createMemo(() => getDateRange(state.ui.currentMonth, state.ui.datePeriod));
  const categories = createMemo(() => summarizeBudgets(transactions(), state.budgets, period().start, period().end, selectedAccount()));
  const chartOptions = (): ApexOptions => ({ chart: { type: "bar", toolbar: { show: false } }, colors: ["#CBE9D4", "#1A4D2E"], plotOptions: { bar: { horizontal: false, columnWidth: "65%" } }, xaxis: { categories: categories().map(c => c.name) }, yaxis: { labels: { formatter: value => formatRupiah(value) } }, tooltip: { y: { formatter: value => formatRupiah(value) } }, legend: { position: "top" }, grid: { borderColor: "rgba(26,77,46,0.05)" } });
  const series = () => [{ name: "Budgeted", data: categories().map(c => c.limit ?? 0) }, { name: "Actual", data: categories().map(c => c.spent) }];
  const edit = (name: string, limit: number | null) => { setEditing(name); setAmount(limit == null ? "" : String(limit)); };
  const save = (e: Event) => { e.preventDefault(); const name = editing(); const value = Number(amount()); if (!name || !Number.isFinite(value) || value < 0) return; setCategoryBudget(name, value); setEditing(null); };
  return <div class="space-y-6 sm:space-y-8 animate-fade-in-up">
    <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-2xl sm:text-3xl font-cormorant text-forest">Monthly Growth &amp; Budgets</h2>
      <label class="text-sm font-bold text-forest">Account <select class="ml-2 rounded-lg border border-forest/20 bg-white px-3 py-2" value={selectedAccount()} onChange={e => setSelectedAccount(e.currentTarget.value)}><option value="">All Accounts</option><For each={accounts()}>{a => <option value={a.id}>{a.name}</option>}</For></select></label>
    </div>
    <Show when={budgetSyncError()}><p role="alert" class="text-red-700">Budget sync: {budgetSyncError()}</p></Show>
    <Show when={transactionsError()}><p role="alert" class="text-red-700">{transactionsError()}</p></Show>
    <MoneyFramework accountId={selectedAccount()} />
    <section class="premium-card p-4 sm:p-6 lg:p-8 bg-white"><h3 class="text-lg font-outfit font-bold text-forest">Performance vs Target</h3><p class="text-xs text-earth">{period().start.toLocaleDateString()} - {period().end.toLocaleDateString()}. Unbudgeted categories show a zero target.</p>
      <Show when={!isTransactionsLoading() && !budgetSyncLoading() && budgetSyncReady()} fallback={<p>{budgetSyncError() ? "Budget data unavailable." : "Loading budgets..."}</p>}><Show when={categories().length} fallback={<p class="mt-4 text-earth">No budgets or spending in this period.</p>}><div class="h-[280px]"><SolidApexCharts options={chartOptions()} series={series()} type="bar" height="100%" /></div></Show></Show>
    </section>
    <Show when={budgetSyncReady() && !isTransactionsLoading()}><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-20"><For each={categories()}>{c => {
      const percent = () => c.limit ? Math.min(100, c.spent / c.limit * 100) : 0;
      const status = () => c.limit === null ? "Unbudgeted" : c.spent > c.limit ? "Exceeded" : c.spent >= c.limit * .8 ? "Caution" : "Healthy";
      return <article class="premium-card p-6 space-y-4"><div class="flex justify-between gap-3"><div><p class="text-xs font-bold text-earth uppercase">{c.name}</p><p class="font-bold text-forest text-xl">{formatRupiah(c.spent)} <span class="text-sm font-normal text-earth">/ {c.limit === null ? "No budget" : formatRupiah(c.limit)}</span></p></div><button type="button" class="text-sm text-forest underline" onClick={() => edit(c.name,c.limit)}>Edit</button></div><div class="h-2 rounded bg-sage/30"><div class="h-2 rounded bg-forest" style={{ width: `${percent()}%` }} /></div><div class="flex justify-between text-xs"><span>{status()}</span><Show when={c.limit !== null}><span>{c.spent > c.limit! ? `${formatRupiah(c.spent-c.limit!)} over` : `${formatRupiah(c.limit!-c.spent)} left`}</span></Show></div></article>;
    }}</For></div></Show>
    <Show when={editing()}><form onSubmit={save} class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"><h3 class="font-bold text-forest">Budget for {editing()}</h3><label class="block">Recurring limit <input class="border rounded w-full p-2" type="number" min="0" step="1" required value={amount()} onInput={e => setAmount(e.currentTarget.value)} /></label><p class="text-xs text-earth">Use zero for no budget. This limit applies to every period and all accounts.</p><div class="flex gap-4"><button class="bg-forest text-white rounded px-4 py-2" type="submit">Save</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></div></div></form></Show>
  </div>;
};
export default Budgets;
