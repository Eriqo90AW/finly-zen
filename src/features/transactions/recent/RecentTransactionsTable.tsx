import { For } from "solid-js";
import type { SortDirection, SortKey, Transaction } from "../../../types";
import { formatRupiah } from "../../../utils/format";
import {
  getSortArrowIcon,
  type TransactionDayGroup,
} from "./recentTransactionsHelpers";
import { RecentTransactionRow } from "./RecentTransactionRow";

interface RecentTransactionsTableProps {
  groups: TransactionDayGroup[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onRequestDelete: (t: Transaction) => void;
}

export const RecentTransactionsTable = (
  props: RecentTransactionsTableProps,
) => {
  const headerClass = (key: SortKey) =>
    `px-3 sm:px-6 py-3 sm:py-4 font-semibold cursor-pointer select-none transition-colors hover:text-forest group${key === "amount" ? " text-right" : ""}`;

  const sortArrow = (key: SortKey) =>
    getSortArrowIcon(props.sortKey, key, props.sortDirection);

  return (
    <div class="overflow-x-hidden sm:overflow-x-auto overflow-y-auto flex-1 h-[412px] min-h-[412px] max-h-[412px] sm:h-auto sm:min-h-0 sm:max-h-none custom-scrollbar rounded-b-2xl">
      <table class="w-full min-w-0 sm:min-w-[640px] text-left font-outfit relative">
        <thead class="bg-sage text-earth text-[9px] sm:text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-forest/10 shadow-xs">
          <tr>
            <th
              class={`${headerClass("name")} pl-3.5 sm:pl-6 pr-1.5 sm:pr-4`}
              onClick={() => props.onSort("name")}
            >
              <span class="inline-flex items-center gap-1">
                Name
                <span
                  class="material-icons !text-[12px] transition-all"
                  classList={{
                    "opacity-100 text-spring": props.sortKey === "name",
                    "opacity-0 group-hover:opacity-50":
                      props.sortKey !== "name",
                  }}
                >
                  {sortArrow("name")}
                </span>
              </span>
            </th>
            <th
              class={`${headerClass("category")} hidden sm:table-cell`}
              onClick={() => props.onSort("category")}
            >
              <span class="inline-flex items-center gap-1">
                Category
                <span
                  class="material-icons !text-[12px] transition-all"
                  classList={{
                    "opacity-100 text-spring": props.sortKey === "category",
                    "opacity-0 group-hover:opacity-50":
                      props.sortKey !== "category",
                  }}
                >
                  {sortArrow("category")}
                </span>
              </span>
            </th>
            <th
              class={`${headerClass("account")} hidden sm:table-cell`}
              onClick={() => props.onSort("account")}
            >
              <span class="inline-flex items-center gap-1">
                Account
                <span
                  class="material-icons !text-[12px] transition-all"
                  classList={{
                    "opacity-100 text-spring": props.sortKey === "account",
                    "opacity-0 group-hover:opacity-50":
                      props.sortKey !== "account",
                  }}
                >
                  {sortArrow("account")}
                </span>
              </span>
            </th>
            <th
              class={`${headerClass("date")} hidden sm:table-cell`}
              onClick={() => props.onSort("date")}
            >
              <span class="inline-flex items-center gap-1">
                Date
                <span
                  class="material-icons !text-[12px] transition-all"
                  classList={{
                    "opacity-100 text-spring": props.sortKey === "date",
                    "opacity-0 group-hover:opacity-50":
                      props.sortKey !== "date",
                  }}
                >
                  {sortArrow("date")}
                </span>
              </span>
            </th>
            <th
              class={`${headerClass("amount")} px-1.5 sm:px-6 whitespace-nowrap w-px sm:w-auto`}
              onClick={() => props.onSort("amount")}
            >
              <span class="inline-flex items-center gap-1 justify-end">
                Amount
                <span
                  class="material-icons !text-[12px] transition-all"
                  classList={{
                    "opacity-100 text-spring": props.sortKey === "amount",
                    "opacity-0 group-hover:opacity-50":
                      props.sortKey !== "amount",
                  }}
                >
                  {sortArrow("amount")}
                </span>
              </span>
            </th>
            <th class="pr-3.5 sm:pr-6 pl-1 sm:pl-4 py-3 sm:py-4 w-20 sm:w-24 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-earth">
              Action
            </th>
          </tr>
        </thead>
        <tbody class="text-xs sm:text-sm divide-y divide-forest/5">
          <For each={props.groups}>
            {(group) => (
              <>
                <tr class="bg-sage/50 text-forest">
                  <th
                    scope="rowgroup"
                    class="sm:hidden pl-3.5 pr-2 py-2 text-left text-[10px] font-bold"
                  >
                    {group.label}
                  </th>
                  <th
                    colspan="4"
                    scope="rowgroup"
                    class="hidden sm:table-cell pl-6 pr-2 py-2 text-left text-xs font-bold"
                  >
                    {group.label}
                  </th>
                  <td
                    colspan="2"
                    class="sm:hidden pr-3.5 py-2 text-right text-[10px] font-bold whitespace-nowrap"
                  >
                    <span
                      class="inline-block rounded-full px-2 py-1"
                      classList={{
                        "bg-red-50 text-red-600": group.total < 0,
                        "bg-green-50 text-green-600": group.total > 0,
                        "bg-forest/5 text-forest": group.total === 0,
                      }}
                    >
                      {group.total > 0 ? "+" : ""}
                      {formatRupiah(group.total)}
                    </span>
                  </td>
                  <td class="hidden sm:table-cell px-6 py-2 text-right text-xs font-bold whitespace-nowrap">
                    <span
                      class="inline-block rounded-full px-2 py-1"
                      classList={{
                        "bg-red-50 text-red-600": group.total < 0,
                        "bg-green-50 text-green-600": group.total > 0,
                        "bg-forest/5 text-forest": group.total === 0,
                      }}
                    >
                      {group.total > 0 ? "+" : ""}
                      {formatRupiah(group.total)}
                    </span>
                  </td>
                  <td class="hidden sm:table-cell" />
                </tr>
                <For each={group.transactions}>
                  {(t) => (
                    <RecentTransactionRow
                      transaction={t}
                      onRequestDelete={props.onRequestDelete}
                    />
                  )}
                </For>
              </>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};
