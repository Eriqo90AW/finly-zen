import { createSignal, createMemo, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { state } from "../../../store";
import { formatRupiah } from "../../../utils/format";
import { Tooltip } from "../../../components/modules/Tooltip";
import { EditDailyBudgetModal } from "./EditDailyBudgetModal";
import {
  buildBudgetPacingData,
  buildBudgetPacingSeries,
  computeBudgetPacingSummary,
} from "./budgetPacingHelpers";
import { buildBudgetPacingOptions } from "./budgetPacingOptions";
import type { BudgetPacingChartProps } from "../../../types";

export const BudgetPacingChart = (props: BudgetPacingChartProps) => {
  const [isEditBudgetOpen, setIsEditBudgetOpen] = createSignal(false);

  const chartData = createMemo(() =>
    buildBudgetPacingData(
      props.transactions || [],
      state.ui.currentMonth,
      state.ui.datePeriod,
      props.dailyBudget(),
    ),
  );

  const chartComputed = createMemo(() =>
    computeBudgetPacingSummary(chartData()),
  );

  const chartOptions = () =>
    buildBudgetPacingOptions(chartData(), chartComputed());

  const chartSeries = () =>
    buildBudgetPacingSeries(chartData(), chartComputed());

  return (
    <div class="premium-card p-3.5 sm:p-5 lg:p-6 flex flex-col relative h-full">
      <div class="flex items-start justify-between gap-2 mb-1 sm:mb-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h4 class="font-outfit font-bold text-forest text-sm sm:text-base lg:text-lg whitespace-nowrap">
              Expense Pacing
            </h4>
            <div class="flex items-center gap-2 text-[10px] sm:text-xs text-forest/80 shrink-0">
              <span class="flex items-center gap-1 font-medium whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-[#1A4D2E]" /> Target
              </span>
              <span class="flex items-center gap-1 font-medium whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-[#52C278]" /> Actual
              </span>
            </div>
          </div>
          <p class="text-[10px] sm:text-xs text-earth/60">
            Cumulative spending vs monthly target
          </p>
        </div>
        <Tooltip content="Click to edit budget">
          <div
            class="text-right cursor-pointer group/target transition-colors shrink-0 ml-auto whitespace-nowrap"
            onClick={() => setIsEditBudgetOpen(true)}
          >
            <div class="text-[9px] sm:text-[10px] font-bold text-earth group-hover/target:text-forest uppercase tracking-wider flex items-center justify-end gap-1 whitespace-nowrap">
              <span class="material-icons text-[10px] opacity-0 group-hover/target:opacity-100 transition-opacity">
                edit
              </span>
              <span class="whitespace-nowrap">Target Budget</span>
            </div>
            <div class="text-xs sm:text-sm font-bold text-forest group-hover/target:text-mid-green transition-colors whitespace-nowrap">
              {formatRupiah(chartData()[chartData().length - 1]?.target || 0)}
            </div>
          </div>
        </Tooltip>
      </div>

      <div class="flex-1 min-h-[240px] sm:min-h-[260px] w-full">
        <Show
          when={!props.loading}
          fallback={
            <div class="w-full h-full flex items-center justify-center text-earth/30">
              Calculating projections...
            </div>
          }
        >
          <SolidApexCharts
            type="line"
            options={chartOptions()}
            series={chartSeries()}
            height="100%"
          />
        </Show>
      </div>

      <EditDailyBudgetModal
        isOpen={isEditBudgetOpen()}
        onClose={() => setIsEditBudgetOpen(false)}
        currentBudget={props.dailyBudget()}
        onSave={(newBudget) => {
          if (props.setDailyBudget) {
            props.setDailyBudget(newBudget);
          }
        }}
        title="Edit Target Budget"
        subtitle="Set your target daily budget. Cumulative monthly target pacing updates automatically."
      />
    </div>
  );
};
