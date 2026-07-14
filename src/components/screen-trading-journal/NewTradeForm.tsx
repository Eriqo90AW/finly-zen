import { createSignal, For } from "solid-js";
import { Trade } from "../../data/TradingJournal/data/types";

interface NewTradeFormProps {
  onSave: (date: string, trade: Trade) => void;
}

export default function NewTradeForm(props: NewTradeFormProps) {
  const [date, setDate] = createSignal("2024-07-15"); // default to July 15th for easy demo
  const [ticker, setTicker] = createSignal("");
  const [setup, setSetup] = createSignal("Breakout");
  const [pnl, setPnl] = createSignal("");
  const [returnR, setReturnR] = createSignal("");
  const [entry, setEntry] = createSignal("");
  const [stopLoss, setStopLoss] = createSignal("");
  const [takeProfit, setTakeProfit] = createSignal("");
  const [notes, setNotes] = createSignal("");

  // Options
  const setups = ["Breakout", "Reversal", "Momentum Scalp", "Mean Reversion", "Chop"];
  
  // Checklist confluences
  const checklistOptions = [
    "Volume Expansion",
    "VWAP Support",
    "Market Context Alignment",
    "Daily Support/Resistance",
    "21 EMA Bounce",
  ];
  const [selectedChecklist, setSelectedChecklist] = createSignal<string[]>([]);

  // Psychology tags
  const psychologyOptions = [
    "Patience",
    "Disciplined",
    "FOMO Control",
    "Revenge Trading Avoided",
    "Rules Followed",
  ];
  const [selectedPsychology, setSelectedPsychology] = createSignal<string[]>([]);

  const toggleChecklist = (option: string) => {
    if (selectedChecklist().includes(option)) {
      setSelectedChecklist(selectedChecklist().filter((o) => o !== option));
    } else {
      setSelectedChecklist([...selectedChecklist(), option]);
    }
  };

  const togglePsychology = (option: string) => {
    if (selectedPsychology().includes(option)) {
      setSelectedPsychology(selectedPsychology().filter((o) => o !== option));
    } else {
      setSelectedPsychology([...selectedPsychology(), option]);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!ticker() || !pnl() || !returnR()) {
      alert("Please fill in Ticker, PnL, and R-Multiple.");
      return;
    }

    const trade: Trade = {
      ticker: ticker().toUpperCase(),
      setup: setup(),
      pnl: parseFloat(pnl()),
      returnR: parseFloat(returnR()),
      entry: parseFloat(entry()) || 0,
      stopLoss: parseFloat(stopLoss()) || 0,
      takeProfit: parseFloat(takeProfit()) || 0,
      checklist: selectedChecklist(),
      psychologyTags: selectedPsychology(),
      notes: notes(),
    };

    props.onSave(date(), trade);

    // Reset Form
    setTicker("");
    setPnl("");
    setReturnR("");
    setEntry("");
    setStopLoss("");
    setTakeProfit("");
    setSelectedChecklist([]);
    setSelectedPsychology([]);
    setNotes("");
  };

  return (
    <div class="premium-card bg-white p-5 flex flex-col gap-5 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
      <div>
        <h3 class="text-xl font-cormorant font-bold text-forest">Log New Trade</h3>
        <p class="text-[9px] font-bold text-earth uppercase tracking-widest">Record IDX execution details</p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4 text-left">
        {/* Date Selector */}
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Date</label>
          <input
            type="date"
            value={date()}
            onInput={(e) => setDate(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all cursor-pointer"
            required
          />
        </div>

        {/* Ticker & Setup */}
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Ticker</label>
            <input
              type="text"
              placeholder="e.g. BBRI"
              value={ticker()}
              onInput={(e) => setTicker(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all uppercase placeholder:text-forest/20"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Setup</label>
            <select
              value={setup()}
              onInput={(e) => setSetup(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all cursor-pointer"
            >
              <For each={setups}>
                {(s) => <option value={s}>{s}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* PnL and R-Multiple */}
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">PnL (Rp IDR)</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 1500000 or -250000"
              value={pnl()}
              onInput={(e) => setPnl(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all placeholder:text-forest/20"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">R-Multiple</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 2.5 or -1.0"
              value={returnR()}
              onInput={(e) => setReturnR(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all placeholder:text-forest/20"
              required
            />
          </div>
        </div>

        {/* Entry, SL, TP */}
        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1">
            <label class="text-[8px] font-bold text-earth/80 uppercase tracking-wider block">Entry Price</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 4800"
              value={entry()}
              onInput={(e) => setEntry(e.currentTarget.value)}
              class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-[11px] focus:outline-none placeholder:text-forest/20"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[8px] font-bold text-earth/80 uppercase tracking-wider block">Stop Loss</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 4700"
              value={stopLoss()}
              onInput={(e) => setStopLoss(e.currentTarget.value)}
              class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-[11px] focus:outline-none placeholder:text-forest/20"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[8px] font-bold text-earth/80 uppercase tracking-wider block">Target Price</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 5100"
              value={takeProfit()}
              onInput={(e) => setTakeProfit(e.currentTarget.value)}
              class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-[11px] focus:outline-none placeholder:text-forest/20"
            />
          </div>
        </div>

        {/* Confluence Checklist */}
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Confluences</label>
          <div class="flex flex-wrap gap-1.5">
            <For each={checklistOptions}>
              {(option) => {
                const selected = () => selectedChecklist().includes(option);
                return (
                  <button
                    type="button"
                    onClick={() => toggleChecklist(option)}
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

        {/* Psychology Tags */}
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Psychology</label>
          <div class="flex flex-wrap gap-1.5">
            <For each={psychologyOptions}>
              {(option) => {
                const selected = () => selectedPsychology().includes(option);
                return (
                  <button
                    type="button"
                    onClick={() => togglePsychology(option)}
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

        {/* Notes */}
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Journal Notes</label>
          <textarea
            placeholder="Execution comments, feelings, context..."
            value={notes()}
            onInput={(e) => setNotes(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none focus:ring-2 focus:ring-forest/10 transition-all resize-none h-16"
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          class="w-full h-11 bg-forest text-white hover:bg-mid-green font-outfit font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 cursor-pointer mt-2"
        >
          Save Trade Entry
        </button>
      </form>
    </div>
  );
}
