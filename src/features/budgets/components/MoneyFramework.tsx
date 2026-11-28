import { Layers, Plus } from "lucide-solid";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { Button, Card, CardContent } from "../../../components/ui";
import { getAccounts } from "../../../data/expenseData";
import {
  deleteMoneyBucketRecord,
  loadMoneyFrameworkData,
  saveMoneyBucketRecord,
  type MoneyBucketAccountLink,
  type MoneyBucketRecord,
  type SaveMoneyBucketInput,
} from "../../../data/moneyFrameworkData";
import { state } from "../../../store";
import {
  isTransactionsLoading,
  transactions,
  transactionsError,
} from "../../../store/transactionStore";
import type { Account } from "../../../types";
import { getDateRange, isDateInRange } from "../../../utils/date";
import { isTransferTransaction } from "../../../utils/transferUtils";
import { computeEmergencyBaseline } from "../model/budgetMetrics";
import { MoneyBucketCard } from "./MoneyBucketCard";
import { DeleteBucketDialog, MoneyBucketDialog } from "./MoneyBucketDialog";
import { MonthlyMoneyFlowCard } from "./MonthlyMoneyFlowCard";

const emptyDraft = (): SaveMoneyBucketInput => ({
  id: null,
  name: "",
  is_emergency: false,
  target: 0,
  contribution: 0,
  accounts: [],
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return String(error);
}

export function MoneyFramework(props: { accountId?: string }) {
  const [buckets, setBuckets] = createSignal<MoneyBucketRecord[]>([]);
  const [links, setLinks] = createSignal<MoneyBucketAccountLink[]>([]);
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [draft, setDraft] = createSignal<SaveMoneyBucketInput | null>(null);
  const [pendingDelete, setPendingDelete] = createSignal<MoneyBucketRecord | null>(null);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [framework, accs] = await Promise.all([
        loadMoneyFrameworkData(),
        getAccounts(),
      ]);
      setBuckets(framework.buckets);
      setLinks(framework.links);
      setAccounts(accs);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  onMount(load);

  const nonTransfers = createMemo(() =>
    transactions().filter((t) => !isTransferTransaction(t)),
  );

  const selected = createMemo(() => {
    const { start, end } = getDateRange(state.ui.currentMonth, state.ui.datePeriod);
    const items = nonTransfers().filter(
      (t) =>
        isDateInRange(t.date, start, end) &&
        (!props.accountId || t.accountId === props.accountId),
    );
    return {
      income: items
        .filter((t) => t.type === "income")
        .reduce((n, t) => n + t.amount, 0),
      expense: items
        .filter((t) => t.type === "expense")
        .reduce((n, t) => n + t.amount, 0),
    };
  });

  const baseline = createMemo(() =>
    computeEmergencyBaseline(nonTransfers(), state.ui.datePeriod),
  );

  const emergencyTarget = () =>
    baseline().length
      ? (baseline().reduce((n, p) => n + p.expense, 0) / baseline().length) * 6
      : null;

  const bucketBalance = (id: string) => {
    const ids = new Set(
      links()
        .filter((l) => l.bucket_id === id)
        .map((l) => l.account_id),
    );
    return transactions()
      .filter((t) => t.accountId && ids.has(t.accountId))
      .reduce((n, t) => n + (t.type === "income" ? t.amount : -t.amount), 0);
  };

  const assignedAccountNames = (bucketId: string) =>
    links()
      .filter((l) => l.bucket_id === bucketId)
      .map((l) => accounts().find((a) => a.id === l.account_id)?.name || "Unknown");

  const planned = () =>
    buckets().reduce((n, b) => n + Number(b.contribution), 0);
  const remainder = () => selected().income - selected().expense - planned();

  const patchDraft = (v: Partial<SaveMoneyBucketInput>) =>
    setDraft((d) => (d ? { ...d, ...v } : d));

  const openEdit = (b: MoneyBucketRecord) =>
    setDraft({
      ...b,
      target: Number(b.target),
      contribution: Number(b.contribution),
      accounts: links()
        .filter((l) => l.bucket_id === b.id)
        .map((l) => l.account_id),
    });

  async function save(e: Event) {
    e.preventDefault();
    const d = draft();
    if (!d || saving()) return;
    setSaving(true);
    setError("");
    try {
      await saveMoneyBucketRecord(d);
      setDraft(null);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const target = pendingDelete();
    if (!target || deleting()) return;
    setDeleting(true);
    try {
      const errorMessage = await deleteMoneyBucketRecord(target.id);
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setPendingDelete(null);
        await load();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="flex items-center gap-2 font-outfit text-lg font-bold text-forest">
            <Layers class="h-4 w-4 text-mid-green" />
            Money Framework
          </h3>
          <p class="font-outfit text-xs text-earth">
            Long-term account buckets, emergency target, and monthly contribution plan.
          </p>
        </div>

        <Button size="sm" onClick={() => setDraft(emptyDraft())}>
          <Plus class="h-4 w-4" />
          Add bucket
        </Button>
      </div>

      <Show when={error() || transactionsError()}>
        <p role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error() || transactionsError()}
        </p>
      </Show>

      <Show
        when={!loading() && !isTransactionsLoading()}
        fallback={
          <Card>
            <CardContent class="py-10 text-center font-outfit text-sm text-earth">
              Loading money framework...
            </CardContent>
          </Card>
        }
      >
        <Show
          when={buckets().length > 0}
          fallback={
            <Card>
              <CardContent class="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <p class="font-outfit text-sm text-earth">
                  No money buckets yet. Create buckets to organize emergency funds and savings targets.
                </p>
                <Button variant="outline" size="sm" onClick={() => setDraft(emptyDraft())}>
                  <Plus class="h-4 w-4" />
                  Create first bucket
                </Button>
              </CardContent>
            </Card>
          }
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <For each={buckets()}>
              {(bucket) => (
                <MoneyBucketCard
                  bucket={bucket}
                  currentBalance={bucketBalance(bucket.id)}
                  target={bucket.is_emergency ? emergencyTarget() : Number(bucket.target)}
                  assignedAccountNames={assignedAccountNames(bucket.id)}
                  baselinePeriods={baseline()}
                  onEdit={() => openEdit(bucket)}
                  onRemove={() => setPendingDelete(bucket)}
                />
              )}
            </For>
          </div>
        </Show>

        <MonthlyMoneyFlowCard
          income={selected().income}
          expense={selected().expense}
          planned={planned()}
          remainder={remainder()}
          buckets={buckets()}
        />
      </Show>

      <MoneyBucketDialog
        draft={draft()}
        accounts={accounts()}
        links={links()}
        saving={saving()}
        onPatch={patchDraft}
        onClose={() => setDraft(null)}
        onSave={save}
      />

      <DeleteBucketDialog
        bucketName={pendingDelete()?.name ?? null}
        deleting={deleting()}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
