import { createMemo, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useAuth } from "../context/authContext";
import { getAccounts } from "../data/expenseData";
import { initializeTransactions, isTransactionPending, isTransactionsLoading, transactions, transactionsError } from "../store/transactionStore";
import { getLocalYmd } from "../utils/date";
import { formatRupiah } from "../utils/format";
import { calculatePaydayPlan, type PaydayPlan, type PlannedBill } from "../utils/paydayPlan";
import { isCashFlowTransaction } from "../utils/transferUtils";

const emptyPlan = (): PaydayPlan => ({ accountId: "", payday: "", savings: 0, bills: [] });
const inputClass = "w-full mt-1 rounded-lg border border-forest/20 bg-white px-3 py-2";
const numberValue = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function Planner(props: { userId: string }) {
  const storageKey = `finly_zen_payday_plan_v1:${props.userId}`;
  const readPlan = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) as PaydayPlan : null;
    } catch {
      return null;
    }
  };
  const [saved, setSaved] = createSignal(readPlan());
  const [plan, setPlan] = createStore<PaydayPlan>(readPlan() ?? emptyPlan());
  const [purchase, setPurchase] = createSignal(0);
  const [notice, setNotice] = createSignal("");
  const [today, setToday] = createSignal(getLocalYmd(new Date()));
  const [accounts, { refetch }] = createResource(async () => {
    try {
      const data = await getAccounts(props.userId);
      return { data: data.filter(a => !a.currency || a.currency === "IDR"), error: false };
    } catch {
      return { data: [], error: true };
    }
  });
  const reloadAccounts = () => { void refetch(); };
  onMount(() => {
    window.addEventListener("finly:accounts-changed", reloadAccounts);
    const timer = window.setInterval(() => setToday(getLocalYmd(new Date())), 30_000);
    onCleanup(() => {
      window.removeEventListener("finly:accounts-changed", reloadAccounts);
      window.clearInterval(timer);
    });
  });

  const validAccount = () => accounts()?.data.some(a => a.id === plan.accountId);
  const result = createMemo(() => calculatePaydayPlan(plan, transactions(), today(), purchase()));
  const savedResult = createMemo(() => {
    const baseline = saved();
    return baseline?.accountId === plan.accountId && baseline.payday > today()
      ? calculatePaydayPlan(baseline, transactions(), today())
      : null;
  });
  const dirty = () => JSON.stringify(plan) !== JSON.stringify(saved());
  const eligiblePayments = createMemo(() => transactions().filter(t =>
    t.type === "expense" && t.accountId === plan.accountId && getLocalYmd(t.date) <= today()
    && t.amount > 0 && isCashFlowTransaction(t) && !isTransactionPending(t.id)
  ));
  const updateBill = (id: string, patch: Partial<PlannedBill>) => {
    setNotice("");
    setPlan("bills", bill => bill.id === id, patch);
  };
  const save = (event: SubmitEvent) => {
    event.preventDefault();
    if (!validAccount() || plan.payday <= today() || accounts.loading || transactionsError()) return;
    try {
      const serialized = JSON.stringify(plan);
      localStorage.setItem(storageKey, serialized);
      setSaved(JSON.parse(serialized));
      setNotice("Plan saved on this browser.");
    } catch {
      setNotice("The browser couldn’t save this plan.");
    }
  };

  return (
    <div class="space-y-6 pb-20">
      <div>
        <h2 class="text-3xl font-cormorant text-forest">Payday planner</h2>
        <p class="text-sm text-earth">Set aside bills and savings, then see what you can spend each day before payday.</p>
      </div>
      <Show when={accounts()?.error || transactionsError()}>
        <div role="alert" class="premium-card p-4">
          <p>Your accounts or transactions couldn’t be loaded.</p>
          <button class="underline text-forest" onClick={() => { reloadAccounts(); void initializeTransactions(true); }}>Retry</button>
        </div>
      </Show>
      <div class="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <form class="premium-card p-5 space-y-5" onSubmit={save}>
          <div class="grid gap-4 md:grid-cols-3">
            <label class="text-sm">
              Spending account
              <select class={inputClass} required value={plan.accountId} disabled={accounts.loading} onChange={e => {
                setPlan({ accountId: e.currentTarget.value, bills: plan.bills.map(bill => ({ ...bill, paymentId: "" })) });
                setNotice("");
              }}>
                <option value="">Choose an IDR account</option>
                <For each={accounts()?.data}>{account => <option value={account.id} selected={plan.accountId === account.id}>{account.name}</option>}</For>
              </select>
            </label>
            <label class="text-sm">
              Next payday
              <input class={inputClass} type="date" min={tomorrow(today())} required value={plan.payday} onInput={e => { setPlan("payday", e.currentTarget.value); setNotice(""); }} />
            </label>
            <label class="text-sm">
              Savings to set aside (Rp)
              <input class={inputClass} type="number" min="0" step="1" value={plan.savings} onInput={e => { setPlan("savings", numberValue(e.currentTarget.valueAsNumber)); setNotice(""); }} />
            </label>
          </div>

          <fieldset class="space-y-3">
            <legend class="font-bold text-forest">Upcoming bills</legend>
            <p class="text-sm text-earth">Bills due before payday are reserved, including overdue bills. Link an expense from the spending account when you pay a bill.</p>
            <For each={plan.bills}>{bill => {
              const selectedPayment = () => eligiblePayments().find(t => t.id === bill.paymentId);
              const remaining = () => result().outstanding.get(bill.id);
              return (
                <div class="rounded-xl border border-forest/10 p-3 space-y-3">
                  <div class="grid gap-3 sm:grid-cols-3">
                    <label class="text-sm">Bill name<input class={inputClass} required value={bill.name} onInput={e => updateBill(bill.id, { name: e.currentTarget.value })} /></label>
                    <label class="text-sm">Amount (Rp)<input class={inputClass} type="number" min="1" step="1" required value={bill.amount || ""} onInput={e => updateBill(bill.id, { amount: numberValue(e.currentTarget.valueAsNumber) })} /></label>
                    <label class="text-sm">Due date<input class={inputClass} type="date" required value={bill.dueDate} onInput={e => updateBill(bill.id, { dueDate: e.currentTarget.value })} /></label>
                  </div>
                  <label class="block text-sm">
                    Linked payment
                    <select class={inputClass} value={bill.paymentId} onChange={e => updateBill(bill.id, { paymentId: e.currentTarget.value })}>
                      <option value="">No payment linked</option>
                      <Show when={bill.paymentId && !selectedPayment()}><option value={bill.paymentId} selected>Payment unavailable</option></Show>
                      <For each={eligiblePayments().filter(t => !plan.bills.some(other => other.id !== bill.id && other.paymentId === t.id))}>{t =>
                        <option value={t.id} selected={bill.paymentId === t.id}>{t.name} · {formatRupiah(t.amount)} · {getLocalYmd(t.date)}</option>
                      }</For>
                    </select>
                  </label>
                  <div class="flex justify-between gap-3 text-sm">
                    <span class="text-earth">
                      {remaining() === undefined ? "Outside this pay period" : remaining() === 0 ? "Paid" : `${formatRupiah(remaining()!)} reserved`}
                    </span>
                    <button type="button" class="underline" onClick={() => { setPlan("bills", bills => bills.filter(item => item.id !== bill.id)); setNotice(""); }}>Remove bill</button>
                  </div>
                </div>
              );
            }}</For>
            <button type="button" class="rounded-lg border border-forest/20 px-3 py-2 text-sm text-forest" onClick={() => {
              setPlan("bills", bills => [...bills, { id: crypto.randomUUID(), name: "", amount: 0, dueDate: "", paymentId: "" }]);
              setNotice("");
            }}>Add bill</button>
          </fieldset>
          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!validAccount() || accounts.loading || isTransactionsLoading() || !!transactionsError()} class="rounded-lg bg-forest px-4 py-2 text-white disabled:opacity-50">Save plan</button>
            <Show when={saved() && dirty()}><button type="button" class="text-sm underline" onClick={() => {
              setPlan(JSON.parse(JSON.stringify(saved())));
              setNotice("");
            }}>Discard changes</button></Show>
            <p aria-live="polite" class="text-sm text-earth">{notice()}</p>
          </div>
        </form>
        <section class="premium-card p-5 space-y-4">
          <label class="block text-sm">
            Try a purchase (Rp)
            <input class={inputClass} type="number" min="0" step="1" value={purchase()} onInput={e => setPurchase(numberValue(e.currentTarget.valueAsNumber))} />
          </label>
          <Show when={validAccount() && result().days > 0 && !accounts.loading && !isTransactionsLoading() && !transactionsError()}
            fallback={<p class="text-sm text-earth">Choose a spending account and a future payday to see your allowance.</p>}>
            <div aria-live="polite">
              <h3 class="font-bold text-forest">{purchase() > 0 || (saved() && dirty()) ? "Preview allowance" : "Daily allowance"}</h3>
              <p class="text-3xl font-bold text-forest">{formatRupiah(result().daily)} <span class="text-base font-normal">/ day</span></p>
              <Show when={savedResult() && (dirty() || purchase() > 0)}>
                <p class="text-sm text-earth">Saved allowance {formatRupiah(savedResult()!.daily)} / day</p>
              </Show>
            </div>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3"><dt>Available balance</dt><dd>{formatRupiah(result().available)}</dd></div>
              <div class="flex justify-between gap-3"><dt>Unpaid bills</dt><dd>−{formatRupiah(result().bills)}</dd></div>
              <div class="flex justify-between gap-3"><dt>Planned savings</dt><dd>−{formatRupiah(plan.savings)}</dd></div>
              <Show when={purchase()}><div class="flex justify-between gap-3"><dt>Purchase preview</dt><dd>−{formatRupiah(purchase())}</dd></div></Show>
              <div class="flex justify-between gap-3 border-t border-forest/10 pt-2 font-bold"><dt>Left to spend</dt><dd>{formatRupiah(result().discretionary)}</dd></div>
              <div class="flex justify-between gap-3"><dt>Spending days left</dt><dd>{result().days}</dd></div>
            </dl>
            <Show when={result().discretionary < 0}><p class="text-sm text-red-700">The account is {formatRupiah(-result().discretionary)} short of this plan.</p></Show>
          </Show>
        </section>
      </div>
    </div>
  );
}

function tomorrow(today: string) {
  return new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10);
}

export default function PaydayPlanner() {
  const { user } = useAuth();
  const owner = createMemo(() => user()?.id);
  return <Show when={owner()} keyed>{userId => <Planner userId={userId} />}</Show>;
}
