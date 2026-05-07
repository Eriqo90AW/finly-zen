import { For, Show, Resource } from "solid-js";
import { Transaction } from "../store";
import {
  formatIconName,
  formatRupiah,
  formatDateDetail,
} from "../utils/format";

interface RecentTransactionsProps {
  transactions: Resource<Transaction[]>;
  currentMonth: string;
}

export const RecentTransactions = (props: RecentTransactionsProps) => {
  const filteredTransactions = () => {
    const data = props.transactions() || [];
    const targetDate = new Date(props.currentMonth);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    return data
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div class="col-span-12 premium-card overflow-hidden">
      <div class="p-6 border-b border-forest/10 flex items-center justify-between">
        <h4 class="font-outfit font-bold text-forest">Recent Transactions</h4>
        <button class="text-[10px] font-bold text-mid-green uppercase tracking-widest hover:underline">
          View All
        </button>
      </div>
      <div class="overflow-auto max-h-[500px]">
        <table class="w-full text-left font-outfit relative">
          <thead class="bg-sage/70 text-earth text-[10px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-sm shadow-sm">
            <tr>
              <th class="px-6 py-4 font-semibold">Name</th>
              <th class="px-6 py-4 font-semibold">Category</th>
              <th class="px-6 py-4 font-semibold">Account</th>
              <th class="px-6 py-4 font-semibold">Date</th>
              <th class="px-6 py-4 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-forest/5">
            <For each={filteredTransactions()}>
              {(t) => (
                <tr class="group hover:bg-page-bg transition-all">
                  <td class="px-6 py-4 border-l-3 border-transparent group-hover:border-spring">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center gap-1.5">
                        <p class="font-semibold text-forest leading-none">
                          {t.name}
                        </p>
                        <Show when={t.isRecurring}>
                          <span class="material-icons text-[14px] text-spring" title="Recurring Transaction">
                            autorenew
                          </span>
                        </Show>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <span
                        class="pl-2 pr-3 py-1 text-[12px] rounded-md font-medium flex items-center gap-1.5 whitespace-nowrap"
                        style={{
                          "background-color": t.categoryColor
                            ? `${t.categoryColor}15`
                            : "rgba(232, 245, 236, 0.3)",
                          color: t.categoryColor || "var(--color-forest)",
                        }}
                      >
                        <Show when={formatIconName(t.categoryIcon)}>
                          <span class="material-icons !text-[16px] w-4 h-4 flex items-center justify-center">
                            {formatIconName(t.categoryIcon)}
                          </span>
                        </Show>
                        {t.category}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 text-[10px] rounded-md font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{
                        "background-color": t.accountColor
                          ? `${t.accountColor}15`
                          : "rgba(82, 194, 120, 0.1)",
                        color: t.accountColor || "var(--color-mid-green)",
                      }}
                    >
                      {t.accountName}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-earth">
                    {formatDateDetail(t.date)}
                  </td>
                  <td
                    class="px-6 py-4 text-right font-bold"
                    classList={{
                      "text-red-600": t.type?.toLowerCase() === "expense",
                      "text-green-600": t.type?.toLowerCase() === "income",
                      "text-forest": !["expense", "income"].includes(
                        t.type?.toLowerCase() || "",
                      ),
                    }}
                  >
                    {t.type?.toLowerCase() === "income"
                      ? "+"
                      : t.type?.toLowerCase() === "expense"
                        ? "-"
                        : ""}
                    {formatRupiah(t.amount)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={props.transactions.loading}>
        <div class="p-12 text-center text-earth/50 animate-pulse">
          <span class="material-icons text-4xl mb-2">sync</span>
          <p class="text-sm">Fetching your garden data...</p>
        </div>
      </Show>

      <Show
        when={
          !props.transactions.loading && filteredTransactions().length === 0
        }
      >
        <div class="p-12 text-center text-earth/50">
          <span class="material-icons text-4xl mb-2">eco</span>
          <p class="text-sm">
            No transactions this month. Start tending your garden!
          </p>
        </div>
      </Show>
    </div>
  );
};
