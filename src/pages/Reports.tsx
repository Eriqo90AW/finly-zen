import { createMemo, createSignal, For, Show } from "solid-js";
import { state } from "../store";
import { initializeTransactions, isTransactionsLoading, openEditTransaction, transactions, transactionsError } from "../store/transactionStore";
import { getDateRange, isDateInRange } from "../utils/date";
import { formatRupiah } from "../utils/format";
import { isCashFlowTransaction } from "../utils/transferUtils";
import type { Transaction } from "../types";

type View = "income" | "spending" | "net";

const totals = (items: Transaction[]) => {
  const income = items.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const spending = items.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return { income, spending, net: income - spending };
};

const labels: Record<View, string> = { income: "Income", spending: "Spending", net: "Net cash flow" };
const views: View[] = ["income", "spending", "net"];

const Reports = () => {
  const [detail, setDetail] = createSignal<{ offset: number; view: View; category?: string } | null>(null);
  const ledger = createMemo(() => transactions().filter(isCashFlowTransaction));
  const accountLedger = createMemo(() =>
    ledger().filter(t => !state.ui.selectedAccount || t.accountName === state.ui.selectedAccount)
  );
  const periods = createMemo(() => {
    const month = new Date(state.ui.currentMonth);
    return Array.from({ length: 6 }, (_, offset) => {
      const anchor = new Date(month.getFullYear(), month.getMonth() - offset, 1, 12);
      const { start, end } = getDateRange(anchor.toISOString(), state.ui.datePeriod);
      const entries = accountLedger().filter(t => isDateInRange(t.date, start, end));
      return { label: anchor.toLocaleDateString(undefined, { month: "short", year: "numeric" }), start, end, entries, totals: totals(entries) };
    });
  });

  const categories = createMemo(() => {
    const groups = new Map<string, { name: string; amount: number }>();
    for (const t of periods()[0].entries) {
      if (t.type !== "expense") continue;
      const key = t.category.trim().toLowerCase();
      const group = groups.get(key) ?? { name: t.category, amount: 0 };
      group.amount += t.amount;
      groups.set(key, group);
    }
    return Array.from(groups, ([key, group]) => ({ key, ...group })).sort((a, b) => b.amount - a.amount);
  });

  const details = createMemo(() => {
    const selected = detail();
    if (!selected) return null;
    const period = periods()[selected.offset];
    const entries = period.entries.filter(t =>
      (selected.view === "net" || t.type === (selected.view === "income" ? "income" : "expense"))
      && (!selected.category || t.category.trim().toLowerCase() === selected.category)
    );
    return { entries, label: `${selected.category ? categories().find(c => c.key === selected.category)?.name ?? labels[selected.view] : labels[selected.view]} · ${period.label}` };
  });

  return (
    <div class="space-y-6 pb-20">
      <div>
        <h2 class="text-3xl font-cormorant text-forest">Reports</h2>
        <p class="text-sm text-earth">
          {periods()[0].start.toLocaleDateString()} – {periods()[0].end.toLocaleDateString()} · {state.ui.selectedAccount || "All accounts"}
        </p>
      </div>
      <Show when={transactionsError()}>{error =>
        <div role="alert" class="premium-card p-4">
          <p>{error()}</p>
          <button class="text-forest underline" onClick={() => void initializeTransactions(true)}>Retry</button>
        </div>
      }</Show>
      <Show when={!isTransactionsLoading() && !transactionsError()} fallback={<Show when={isTransactionsLoading()}><p>Loading reports…</p></Show>}>
        <Show when={accountLedger().length} fallback={<p class="premium-card p-6 text-earth">Add income or an expense to see your cash-flow reports.</p>}>
          <div class="grid gap-4 sm:grid-cols-3">
            <For each={views}>{view =>
              <button class="premium-card p-5 text-left hover:bg-sage/20" aria-label={`${labels[view]} ${formatRupiah(periods()[0].totals[view])}`} onClick={() => setDetail({ offset: 0, view })}>
                <span class="block text-sm text-earth">{labels[view]}</span>
                <span class="font-bold text-forest text-xl">{formatRupiah(periods()[0].totals[view])}</span>
              </button>
            }</For>
          </div>
          <Show when={details()}>{report =>
            <section class="premium-card p-5 space-y-3" aria-label="Contributing transactions">
              <div class="flex justify-between gap-4">
                <h3 class="font-bold text-forest">{report().label}</h3>
                <button class="underline" onClick={() => setDetail(null)}>Close</button>
              </div>
              <Show when={report().entries.length} fallback={<p class="text-earth">No contributing entries.</p>}>
                <ul class="divide-y divide-forest/10">
                  <For each={report().entries}>{t =>
                    <li>
                      <button class="w-full flex items-center justify-between gap-4 py-2 text-left" onClick={() => openEditTransaction(t.id)}>
                        <span>{t.name}<span class="block text-xs text-earth">{t.accountName} · {new Date(t.date).toLocaleDateString()}</span></span>
                        <span class="shrink-0">{t.type === "expense" ? "−" : "+"}{formatRupiah(t.amount)}</span>
                      </button>
                    </li>
                  }</For>
                </ul>
              </Show>
            </section>
          }</Show>
          <div class="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <section class="premium-card p-5 overflow-x-auto">
              <h3 class="font-bold text-forest mb-3">Six-period cash flow</h3>
              <table class="w-full text-sm">
                <thead><tr class="text-left"><th scope="col">Period</th><For each={views}>{view => <th scope="col" class="text-right pl-3">{labels[view]}</th>}</For></tr></thead>
                <tbody><For each={periods()}>{(period, offset) =>
                  <tr class="border-t border-forest/10">
                    <th scope="row" class="text-left font-normal py-3 whitespace-nowrap">{period.label}</th>
                    <For each={views}>{view =>
                      <td class="text-right pl-3 whitespace-nowrap">
                        <button class="text-forest underline" aria-label={`${period.label} ${labels[view]} ${formatRupiah(period.totals[view])}`} onClick={() => setDetail({ offset: offset(), view })}>{formatRupiah(period.totals[view])}</button>
                      </td>
                    }</For>
                  </tr>
                }</For></tbody>
              </table>
            </section>
            <section class="premium-card p-5">
              <h3 class="font-bold text-forest mb-3">Spending by category</h3>
              <Show when={categories().length} fallback={<p class="text-earth">No spending in this period.</p>}>
                <For each={categories()}>{category =>
                  <button class="flex justify-between w-full gap-3 py-2 text-left border-t border-forest/10" onClick={() => setDetail({ offset: 0, view: "spending", category: category.key })}>
                    <span>{category.name}</span><span class="shrink-0 font-semibold">{formatRupiah(category.amount)}</span>
                  </button>
                }</For>
              </Show>
            </section>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default Reports;
