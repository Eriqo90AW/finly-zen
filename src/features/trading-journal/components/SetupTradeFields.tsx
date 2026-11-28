import { For } from "solid-js";
import type {
  SetupQualityType,
  SetupStatusType,
} from "../../../data/TradingJournal/data/database.types";
import { CHECKLIST_OPTIONS, SETUP_TYPES } from "./tradeFormCalculations";

interface SetupTradeFieldsProps {
  setupQuality: SetupQualityType;
  onSetupQualityChange: (value: SetupQualityType) => void;
  setupStatus: SetupStatusType;
  onSetupStatusChange: (value: SetupStatusType) => void;
  setupType: string;
  onSetupTypeChange: (value: string) => void;
  entryZoneIdeal: string;
  onEntryZoneIdealChange: (value: string) => void;
  entryZoneMax: string;
  onEntryZoneMaxChange: (value: string) => void;
  stopLoss: string;
  onStopLossChange: (value: string) => void;
  tp1Price: string;
  onTp1PriceChange: (value: string) => void;
  tp2Price: string;
  onTp2PriceChange: (value: string) => void;
  plannedRR: string;
  analysisRaw: string;
  onAnalysisRawChange: (value: string) => void;
  selectedChecklist: string[];
  onToggleChecklist: (option: string) => void;
}

export default function SetupTradeFields(props: SetupTradeFieldsProps) {
  return (
    <div class="space-y-4 animate-fade-in-up">
      <div class="grid grid-cols-3 gap-2">
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Quality
          </label>
          <select
            value={props.setupQuality}
            onInput={(e) => props.onSetupQualityChange(e.currentTarget.value as SetupQualityType)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Status
          </label>
          <select
            value={props.setupStatus}
            onInput={(e) => props.onSetupStatusChange(e.currentTarget.value as SetupStatusType)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <option value="PLANNED">PLANNED</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="SKIPPED">SKIPPED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Setup Type
          </label>
          <select
            value={props.setupType}
            onInput={(e) => props.onSetupTypeChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
          >
            <For each={SETUP_TYPES}>{(s) => <option value={s}>{s}</option>}</For>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Entry Ideal Zone
          </label>
          <input
            type="number"
            placeholder="Ideal price"
            value={props.entryZoneIdeal}
            onInput={(e) => props.onEntryZoneIdealChange(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
            required
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            Entry Max Zone
          </label>
          <input
            type="number"
            placeholder="Max tolerance price"
            value={props.entryZoneMax}
            onInput={(e) => props.onEntryZoneMaxChange(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
            required
          />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth/80 block">Stop Loss</label>
          <input
            type="number"
            placeholder="SL price"
            value={props.stopLoss}
            onInput={(e) => props.onStopLossChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth/80 block">TP 1 Price</label>
          <input
            type="number"
            placeholder="TP 1"
            value={props.tp1Price}
            onInput={(e) => props.onTp1PriceChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth/80 block">TP 2 Price</label>
          <input
            type="number"
            placeholder="TP 2"
            value={props.tp2Price}
            onInput={(e) => props.onTp2PriceChange(e.currentTarget.value)}
            class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
          Planned R:R
        </label>
        <input
          type="text"
          placeholder="Auto-calculated from Ideal Entry & SL"
          value={props.plannedRR}
          disabled
          class="w-full p-2.5 bg-sage/20 rounded-xl border border-forest/5 font-outfit text-xs text-forest font-bold"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
          Analysis Notes
        </label>
        <textarea
          placeholder="Market context, bandarmology accumulation, foreign flows..."
          value={props.analysisRaw}
          onInput={(e) => props.onAnalysisRawChange(e.currentTarget.value)}
          class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none resize-none h-16"
        />
      </div>

      {/* Checklist Confluences */}
      <div class="space-y-1.5">
        <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
          Confluences
        </label>
        <div class="flex flex-wrap gap-1.5">
          <For each={CHECKLIST_OPTIONS}>
            {(option) => {
              const selected = () => props.selectedChecklist.includes(option);
              return (
                <button
                  type="button"
                  onClick={() => props.onToggleChecklist(option)}
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
