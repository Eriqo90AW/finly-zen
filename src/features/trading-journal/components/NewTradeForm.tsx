import { Show } from "solid-js";
import type { Trade } from "../../../data/TradingJournal/data/types";
import ExecutedTradeFields from "./ExecutedTradeFields";
import SetupTradeFields from "./SetupTradeFields";
import { createTradeFormState } from "./useTradeFormState";

interface NewTradeFormProps {
  onSave: (date: string, trade: Partial<Trade>) => void | Promise<void>;
}

export default function NewTradeForm(props: NewTradeFormProps) {
  const form = createTradeFormState();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const result = form.buildPayload();
    if ("error" in result) {
      alert(result.error);
      return;
    }

    try {
      await props.onSave(form.date(), result.payload);
      form.resetForm();
      alert("Trade logged successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to save: ${message}`);
    }
  };

  return (
    <div class="premium-card bg-white p-5 flex flex-col gap-5 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
      <div>
        <h3 class="text-xl font-cormorant font-bold text-forest">Log Trading Record</h3>
        <p class="text-[9px] font-bold text-earth uppercase tracking-widest">
          Setup Plan or Real Execution
        </p>
      </div>

      {/* Record Type Toggle Selector */}
      <div class="flex bg-page-bg p-1 rounded-xl border border-forest/5 shrink-0">
        <button
          type="button"
          onClick={() => form.setRecordType("EXECUTED")}
          class="flex-1 py-1.5 text-xs font-outfit font-bold rounded-lg transition-all cursor-pointer"
          classList={{
            "bg-forest text-white shadow-sm": form.recordType() === "EXECUTED",
            "text-earth hover:text-forest": form.recordType() !== "EXECUTED",
          }}
        >
          🟩 Executed Trade
        </button>
        <button
          type="button"
          onClick={() => form.setRecordType("SETUP")}
          class="flex-1 py-1.5 text-xs font-outfit font-bold rounded-lg transition-all cursor-pointer"
          classList={{
            "bg-forest text-white shadow-sm": form.recordType() === "SETUP",
            "text-earth hover:text-forest": form.recordType() !== "SETUP",
          }}
        >
          🟦 Setup Plan
        </button>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4 text-left">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
              Trade Date
            </label>
            <input
              type="date"
              value={form.date()}
              onInput={(e) => form.setDate(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
              Ticker
            </label>
            <input
              type="text"
              placeholder="e.g. BREN"
              value={form.ticker()}
              onInput={(e) => form.setTicker(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none uppercase placeholder:text-forest/20"
              required
            />
          </div>
        </div>

        <Show when={form.recordType() === "SETUP"}>
          <SetupTradeFields
            setupQuality={form.setupQuality()}
            onSetupQualityChange={form.setSetupQuality}
            setupStatus={form.setupStatus()}
            onSetupStatusChange={form.setSetupStatus}
            setupType={form.setupType()}
            onSetupTypeChange={form.setSetupType}
            entryZoneIdeal={form.entryZoneIdeal()}
            onEntryZoneIdealChange={form.setEntryZoneIdeal}
            entryZoneMax={form.entryZoneMax()}
            onEntryZoneMaxChange={form.setEntryZoneMax}
            stopLoss={form.stopLoss()}
            onStopLossChange={form.setStopLoss}
            tp1Price={form.tp1Price()}
            onTp1PriceChange={form.setTp1Price}
            tp2Price={form.tp2Price()}
            onTp2PriceChange={form.setTp2Price}
            plannedRR={form.plannedRR()}
            analysisRaw={form.analysisRaw()}
            onAnalysisRawChange={form.setAnalysisRaw}
            selectedChecklist={form.selectedChecklist()}
            onToggleChecklist={form.toggleChecklist}
          />
        </Show>

        <Show when={form.recordType() === "EXECUTED"}>
          <ExecutedTradeFields
            direction={form.direction()}
            onDirectionChange={form.setDirection}
            posStatus={form.posStatus()}
            onPosStatusChange={form.setPosStatus}
            entrySession={form.entrySession()}
            onEntrySessionChange={form.setEntrySession}
            entryLegs={form.entryLegs()}
            exitLegs={form.exitLegs()}
            onAddEntryLeg={form.addEntryLeg}
            onRemoveEntryLeg={form.removeEntryLeg}
            onUpdateEntryLeg={form.updateEntryLeg}
            onAddExitLeg={form.addExitLeg}
            onRemoveExitLeg={form.removeExitLeg}
            onUpdateExitLeg={form.updateExitLeg}
            metrics={form.metrics()}
            stopLoss={form.stopLoss()}
            onStopLossChange={form.setStopLoss}
            tp1Price={form.tp1Price()}
            onTp1PriceChange={form.setTp1Price}
            tp2Price={form.tp2Price()}
            onTp2PriceChange={form.setTp2Price}
            trailSl={form.trailSl()}
            onTrailSlChange={form.setTrailSl}
            resultLabel={form.resultLabel()}
            onResultLabelChange={form.setResultLabel}
            holdDays={form.holdDays()}
            onHoldDaysChange={form.setHoldDays}
            selectedPsychology={form.selectedPsychology()}
            onTogglePsychology={form.togglePsychology}
          />
        </Show>

        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">
            General Notes
          </label>
          <textarea
            placeholder="Additional notes about execution, feelings, plan triggers..."
            value={form.notes()}
            onInput={(e) => form.setNotes(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none resize-none h-16"
          />
        </div>

        <button
          type="submit"
          class="w-full h-11 bg-forest text-white hover:bg-mid-green font-outfit font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 cursor-pointer mt-2"
        >
          Save Trading Entry
        </button>
      </form>
    </div>
  );
}
