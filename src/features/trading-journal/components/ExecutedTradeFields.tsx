import { For, Show } from "solid-js";
import type {
  EntryLeg,
  ExitLeg,
  PosStatusType,
  ResultLabelType,
  TradeDirection,
} from "../../../data/TradingJournal/data/database.types";
import {
  type ExecutedTradeMetrics,
  PSYCHOLOGY_OPTIONS,
} from "./tradeFormCalculations";
import TradeLegsSection from "./TradeLegsSection";

interface ExecutedTradeFieldsProps {
  direction: TradeDirection;
  onDirectionChange: (value: TradeDirection) => void;
  posStatus: PosStatusType;
  onPosStatusChange: (value: PosStatusType) => void;
  entrySession: string;
  onEntrySessionChange: (value: string) => void;
  entryLegs: EntryLeg[];
  exitLegs: ExitLeg[];
  onAddEntryLeg: () => void;
  onRemoveEntryLeg: (index: number) => void;
  onUpdateEntryLeg: <K extends keyof EntryLeg>(
    index: number,
    field: K,
    value: EntryLeg[K],
  ) => void;
  onAddExitLeg: () => void;
  onRemoveExitLeg: (index: number) => void;
  onUpdateExitLeg: <K extends keyof ExitLeg>(
    index: number,
    field: K,
    value: ExitLeg[K],
  ) => void;
  metrics: ExecutedTradeMetrics;
  stopLoss: string;
  onStopLossChange: (value: string) => void;
  tp1Price: string;
  onTp1PriceChange: (value: string) => void;
  tp2Price: string;
  onTp2PriceChange: (value: string) => void;
  trailSl: string;
  onTrailSlChange: (value: string) => void;
  resultLabel: ResultLabelType;
  onResultLabelChange: (value: ResultLabelType) => void;
  holdDays: string;
  onHoldDaysChange: (value: string) => void;
  selectedPsychology: string[];
  onTogglePsychology: (option: string) => void;
}

export default function ExecutedTradeFields(props: ExecutedTradeFieldsProps) {
  return (
    <div class="space-y-4 animate-fade-in-up">
      <div class="grid grid-cols-3 gap-2">
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Direction
          </label>
          <select
            value={props.direction}
            onInput={(e) => props.onDirectionChange(e.currentTarget.value as TradeDirection)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <option value="LONG">LONG (Buy)</option>
            <option value="SHORT">SHORT (Sell)</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Position Status
          </label>
          <select
            value={props.posStatus}
            onInput={(e) => props.onPosStatusChange(e.currentTarget.value as PosStatusType)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <option value="CLOSED">CLOSED (Finished)</option>
            <option value="PARTIAL">PARTIAL (Some running)</option>
            <option value="OPEN">OPEN (All running)</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Session
          </label>
          <select
            value={props.entrySession}
            onInput={(e) => props.onEntrySessionChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <option value="Sesi 1">Sesi 1</option>
            <option value="Sesi 2">Sesi 2</option>
            <option value="Sesi 1 + Sesi 2">Sesi 1 + 2</option>
          </select>
        </div>
      </div>

      <TradeLegsSection
        posStatus={props.posStatus}
        entryLegs={props.entryLegs}
        exitLegs={props.exitLegs}
        onAddEntryLeg={props.onAddEntryLeg}
        onRemoveEntryLeg={props.onRemoveEntryLeg}
        onUpdateEntryLeg={props.onUpdateEntryLeg}
        onAddExitLeg={props.onAddExitLeg}
        onRemoveExitLeg={props.onRemoveExitLeg}
        onUpdateExitLeg={props.onUpdateExitLeg}
      />

      {/* Calculations Heatmap Preview */}
      <div class="bg-sage/15 border border-forest/10 p-3 rounded-xl space-y-2 text-xs font-outfit">
        <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-earth/70">
          <span>Calculations Summary</span>
          <span class="text-[8px] bg-forest/10 px-1 py-0.5 rounded text-forest">
            Stockbit Fee Engine
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="flex justify-between">
            <span class="text-earth">Total Lots:</span>
            <span class="font-bold text-forest">{props.metrics.lots} lot</span>
          </div>
          <div class="flex justify-between">
            <span class="text-earth">Avg Entry:</span>
            <span class="font-bold text-forest">Rp{Math.round(props.metrics.avgEntryPrice)}</span>
          </div>
          <Show when={props.posStatus !== "OPEN"}>
            <>
              <div class="flex justify-between">
                <span class="text-earth">Closed Lots:</span>
                <span class="font-bold text-forest">{props.metrics.lotsClosed} lot</span>
              </div>
              <div class="flex justify-between">
                <span class="text-earth">Avg Exit:</span>
                <span class="font-bold text-forest">
                  Rp{Math.round(props.metrics.avgExitPrice)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-earth">Total Fees:</span>
                <span class="font-bold text-rose-500">
                  Rp{Math.round(props.metrics.totalFee)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-earth">Net P&L:</span>
                <span
                  class="font-bold"
                  classList={{
                    "text-emerald-600": props.metrics.netPnL >= 0,
                    "text-rose-500": props.metrics.netPnL < 0,
                  }}
                >
                  {props.metrics.netPnL >= 0 ? "+" : ""}Rp
                  {Math.round(props.metrics.netPnL).toLocaleString("id-ID")}
                </span>
              </div>
              <div class="flex justify-between col-span-2 border-t border-forest/5 pt-1 mt-1 font-bold">
                <span class="text-earth">Realized ROI %:</span>
                <span
                  classList={{
                    "text-emerald-600": props.metrics.roiPct >= 0,
                    "text-rose-500": props.metrics.roiPct < 0,
                  }}
                >
                  {props.metrics.roiPct >= 0 ? "+" : ""}
                  {props.metrics.roiPct.toFixed(2)}%
                </span>
              </div>
            </>
          </Show>
        </div>
      </div>

      {/* Standard Levels & Meta */}
      <div class="grid grid-cols-3 gap-2">
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth block">Stop Loss</label>
          <input
            type="number"
            placeholder="SL price"
            value={props.stopLoss}
            onInput={(e) => props.onStopLossChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth block">TP 1 Price</label>
          <input
            type="number"
            placeholder="TP 1"
            value={props.tp1Price}
            onInput={(e) => props.onTp1PriceChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth block">TP 2 Price</label>
          <input
            type="number"
            placeholder="TP 2"
            value={props.tp2Price}
            onInput={(e) => props.onTp2PriceChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <Show when={props.posStatus === "PARTIAL"}>
          <div class="space-y-1.5 animate-fade-in-up">
            <label class="text-[9px] font-bold text-earth block">Trailing SL</label>
            <input
              type="number"
              placeholder="Trailing SL"
              value={props.trailSl}
              onInput={(e) => props.onTrailSlChange(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
            />
          </div>
        </Show>
        <Show when={props.posStatus === "CLOSED"}>
          <div class="space-y-1.5 animate-fade-in-up">
            <label class="text-[9px] font-bold text-earth block">Result Label</label>
            <select
              value={props.resultLabel}
              onInput={(e) => props.onResultLabelChange(e.currentTarget.value as ResultLabelType)}
              class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
            >
              <option value="CUAN">CUAN</option>
              <option value="SL HIT">SL HIT</option>
              <option value="TP1">TP1 Hit</option>
              <option value="TP2">TP2 Hit</option>
              <option value="BREAKEVEN">BREAKEVEN</option>
            </select>
          </div>
        </Show>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth block">Hold Days</label>
          <input
            type="number"
            placeholder="e.g. 1"
            value={props.holdDays}
            onInput={(e) => props.onHoldDaysChange(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Psychology Tags */}
      <div class="space-y-1.5">
        <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
          Mindset Tags
        </label>
        <div class="flex flex-wrap gap-1.5">
          <For each={PSYCHOLOGY_OPTIONS}>
            {(option) => {
              const selected = () => props.selectedPsychology.includes(option);
              return (
                <button
                  type="button"
                  onClick={() => props.onTogglePsychology(option)}
                  class="px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer"
                  classList={{
                    "bg-forest text-white border-forest": selected(),
                    "bg-page-bg text-forest/70 border-forest/5 hover:border-forest/20": !selected(),
                  }}
                >
                  {option}
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
