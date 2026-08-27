import { createSignal, For, createEffect, Show } from "solid-js";
import { Trade } from "../../data/TradingJournal/data/types";
import { EntryLeg, ExitLeg, SetupQualityType, SetupStatusType, PosStatusType, TradeDirection, ResultLabelType } from "../../data/TradingJournal/data/database.types";
import { calculateTradeR } from "../../utils/tradingJournalR";

interface NewTradeFormProps {
  onSave: (date: string, trade: Partial<Trade>) => void;
}

export default function NewTradeForm(props: NewTradeFormProps) {
  // Base details
  const [date, setDate] = createSignal(new Date().toISOString().split("T")[0]);
  const [ticker, setTicker] = createSignal("");
  const [recordType, setRecordType] = createSignal<'SETUP' | 'EXECUTED'>('EXECUTED');
  const [notes, setNotes] = createSignal("");

  // Setup specific signals
  const [setupQuality, setSetupQuality] = createSignal<SetupQualityType>('A');
  const [setupStatus, setSetupStatus] = createSignal<SetupStatusType>('PLANNED');
  const [setupType, setSetupType] = createSignal("Breakout");
  const [entryZoneIdeal, setEntryZoneIdeal] = createSignal("");
  const [entryZoneMax, setEntryZoneMax] = createSignal("");
  const [plannedRR, setPlannedRR] = createSignal("");
  const [analysisRaw, setAnalysisRaw] = createSignal("");
  const [selectedChecklist, setSelectedChecklist] = createSignal<string[]>([]);

  // Executed specific signals
  const [direction, setDirection] = createSignal<TradeDirection>('LONG');
  const [posStatus, setPosStatus] = createSignal<PosStatusType>('CLOSED');
  const [stopLoss, setStopLoss] = createSignal("");
  const [tp1Price, setTp1Price] = createSignal("");
  const [tp2Price, setTp2Price] = createSignal("");
  const [trailSl, setTrailSl] = createSignal("");
  const [entrySession, setEntrySession] = createSignal("Sesi 1");
  const [holdDays, setHoldDays] = createSignal("");
  const [resultLabel, setResultLabel] = createSignal<ResultLabelType>('CUAN');
  const [selectedPsychology, setSelectedPsychology] = createSignal<string[]>([]);

  // Legs for multi-leg execution
  const [entryLegs, setEntryLegs] = createSignal<EntryLeg[]>([{ lot: 0, price: 0, reason: "Initial entry" }]);
  const [exitLegs, setExitLegs] = createSignal<ExitLeg[]>([{ lot: 0, price: 0, type: "TP1" }]);

  // Options
  const setups = ["Breakout", "Reversal", "Momentum Scalp", "Mean Reversion", "Chop", "Bandarmology Accumulation", "Foreign Flow"];
  const checklistOptions = [
    "Volume Expansion",
    "VWAP Support",
    "Market Context Alignment",
    "Daily Support/Resistance",
    "21 EMA Bounce",
    "Net Foreign Buy",
    "Big Accumulation"
  ];
  const psychologyOptions = [
    "Patience",
    "Disciplined",
    "FOMO Control",
    "Revenge Trading Avoided",
    "Rules Followed"
  ];

  // Auto-calculated fields for Executed trades
  const [autoCalc, setAutoCalc] = createSignal(true);
  const [lots, setLots] = createSignal(0);
  const [lotsRemaining, setLotsRemaining] = createSignal(0);
  const [lotsClosed, setLotsClosed] = createSignal(0);
  const [avgEntryPrice, setAvgEntryPrice] = createSignal(0);
  const [avgExitPrice, setAvgExitPrice] = createSignal(0);
  const [commissionBuy, setCommissionBuy] = createSignal(0);
  const [commissionSell, setCommissionSell] = createSignal(0);
  const [totalFee, setTotalFee] = createSignal(0);
  const [grossPnL, setGrossPnL] = createSignal(0);
  const [netPnL, setNetPnL] = createSignal(0);
  const [roiPct, setRoiPct] = createSignal(0);
  const [riskR, setRiskR] = createSignal(0);
  const [riskAmount, setRiskAmount] = createSignal(0);

  // Auto calculations logic
  createEffect(() => {
    if (!autoCalc() || recordType() === 'SETUP') return;

    // Entry Calculations
    const validEntryLegs = entryLegs().filter(leg => leg.lot > 0 && leg.price > 0);
    const totalLots = validEntryLegs.reduce((sum, leg) => sum + leg.lot, 0);
    setLots(totalLots);

    let calculatedAvgEntry = 0;
    if (totalLots > 0) {
      const totalEntryValue = validEntryLegs.reduce((sum, leg) => sum + (leg.lot * leg.price), 0);
      calculatedAvgEntry = totalEntryValue / totalLots;
      setAvgEntryPrice(calculatedAvgEntry);
      
      // Stockbit Buy Commission: 0.1933%
      const totalCost = totalEntryValue * 100;
      setCommissionBuy(totalCost * 0.001933);
    } else {
      setAvgEntryPrice(0);
      setCommissionBuy(0);
    }

    // Exit Calculations
    const validExitLegs = exitLegs().filter(leg => leg.lot > 0 && leg.price > 0);
    const totalClosed = validExitLegs.reduce((sum, leg) => sum + leg.lot, 0);
    setLotsClosed(totalClosed);
    setLotsRemaining(Math.max(0, totalLots - totalClosed));

    let calculatedAvgExit = 0;
    if (totalClosed > 0) {
      const totalExitValue = validExitLegs.reduce((sum, leg) => sum + (leg.lot * leg.price), 0);
      calculatedAvgExit = totalExitValue / totalClosed;
      setAvgExitPrice(calculatedAvgExit);

      // Stockbit Sell Commission: 0.2933%
      const totalRevenue = totalExitValue * 100;
      setCommissionSell(totalRevenue * 0.002933);
    } else {
      setAvgExitPrice(0);
      setCommissionSell(0);
    }

    const calculatedTotalFee = commissionBuy() + commissionSell();
    setTotalFee(calculatedTotalFee);

    // PnL & ROI Calculations
    const hasRealizedExit = calculatedAvgEntry > 0 && totalClosed > 0 && calculatedAvgExit > 0;
    const priceChange = direction() === "SHORT"
      ? calculatedAvgEntry - calculatedAvgExit
      : calculatedAvgExit - calculatedAvgEntry;
    const calculatedGrossPnL = hasRealizedExit
      ? priceChange * totalClosed * 100
      : 0;
    const calculatedNetPnL = calculatedGrossPnL - calculatedTotalFee;

    if (hasRealizedExit) {
      setGrossPnL(calculatedGrossPnL);
      setNetPnL(calculatedNetPnL);
      
      const totalCost = calculatedAvgEntry * totalClosed * 100 + commissionBuy();
      setRoiPct(totalCost > 0 ? (calculatedNetPnL / totalCost) * 100 : 0);
    } else {
      setGrossPnL(0);
      setNetPnL(0);
      setRoiPct(0);
    }

    // Risk Calculations
    const sl = parseFloat(stopLoss());
    let calculatedRiskAmount = 0;
    if (calculatedAvgEntry > 0 && totalLots > 0 && !isNaN(sl) && sl > 0) {
      calculatedRiskAmount = Math.abs(calculatedAvgEntry - sl) * totalLots * 100;
    }
    setRiskAmount(calculatedRiskAmount);

    const calculatedR = calculateTradeR({
      direction: direction(),
      lots: totalLots,
      lots_closed: totalClosed,
      avg_entry_price: calculatedAvgEntry || null,
      avg_exit_price: calculatedAvgExit || null,
      stop_loss: !isNaN(sl) && sl > 0 ? sl : null,
      net_pnl: hasRealizedExit ? calculatedNetPnL : null,
      gross_pnl: hasRealizedExit ? calculatedGrossPnL : null,
      risk_amount: calculatedRiskAmount || null,
      risk_r: null,
      exit_details: exitLegs(),
    });
    setRiskR(calculatedR ?? 0);
  });

  // Automatically calculate planned RR for Setup
  createEffect(() => {
    if (recordType() !== 'SETUP') return;
    const entryIdeal = parseFloat(entryZoneIdeal());
    const sl = parseFloat(stopLoss());
    const tp1 = parseFloat(tp1Price());

    if (!isNaN(entryIdeal) && !isNaN(sl) && !isNaN(tp1) && entryIdeal > sl) {
      const risk = entryIdeal - sl;
      const reward = tp1 - entryIdeal;
      setPlannedRR((reward / risk).toFixed(2));
    } else {
      setPlannedRR("");
    }
  });

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

  const addEntryLeg = () => {
    setEntryLegs([...entryLegs(), { lot: 0, price: 0, reason: "" }]);
  };

  const removeEntryLeg = (index: number) => {
    if (entryLegs().length > 1) {
      setEntryLegs(entryLegs().filter((_, i) => i !== index));
    }
  };

  const updateEntryLeg = (index: number, field: keyof EntryLeg, value: any) => {
    const updated = [...entryLegs()];
    updated[index] = { ...updated[index], [field]: value };
    setEntryLegs(updated);
  };

  const addExitLeg = () => {
    setExitLegs([...exitLegs(), { lot: 0, price: 0, type: "TP1" }]);
  };

  const removeExitLeg = (index: number) => {
    if (exitLegs().length > 1) {
      setExitLegs(exitLegs().filter((_, i) => i !== index));
    }
  };

  const updateExitLeg = (index: number, field: keyof ExitLeg, value: any) => {
    const updated = [...exitLegs()];
    updated[index] = { ...updated[index], [field]: value };
    setExitLegs(updated);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!ticker()) {
      alert("Please fill in Ticker.");
      return;
    }

    let tradePayload: Partial<Trade> = {
      ticker: ticker().toUpperCase(),
      record_type: recordType(),
      notes: notes(),
    };

    if (recordType() === 'SETUP') {
      const entryIdeal = parseFloat(entryZoneIdeal());
      const entryMax = parseFloat(entryZoneMax());
      const sl = parseFloat(stopLoss());
      
      if (isNaN(entryIdeal) || isNaN(entryMax)) {
        alert("SETUP requires Ideal Entry Zone and Max Entry Zone prices.");
        return;
      }

      tradePayload = {
        ...tradePayload,
        setup_quality: setupQuality(),
        setup_status: setupStatus(),
        setup_type: setupType(),
        entry_zone_ideal: entryIdeal,
        entry_zone_max: entryMax,
        stop_loss: sl || null,
        tp1_price: parseFloat(tp1Price()) || null,
        tp2_price: parseFloat(tp2Price()) || null,
        planned_rr: parseFloat(plannedRR()) || null,
        analysis_raw: analysisRaw(),
        checklist: selectedChecklist(),
        lots: 0,
        lots_closed: 0,
        lots_remaining: 0,
        pos_status: 'OPEN'
      };
    } else {
      if (lots() <= 0 || avgEntryPrice() <= 0) {
        alert("EXECUTED trade requires at least one Entry Leg with lot and price > 0.");
        return;
      }

      const validEntryLegs = entryLegs().filter(leg => leg.lot > 0 && leg.price > 0);
      const validExitLegs = exitLegs().filter(leg => leg.lot > 0 && leg.price > 0);

      tradePayload = {
        ...tradePayload,
        pos_status: posStatus(),
        direction: direction(),
        lots: lots(),
        lots_closed: lotsClosed(),
        lots_remaining: lotsRemaining(),
        avg_entry_price: avgEntryPrice(),
        avg_exit_price: lotsClosed() > 0 ? avgExitPrice() : null,
        stop_loss: parseFloat(stopLoss()) || null,
        tp1_price: parseFloat(tp1Price()) || null,
        tp2_price: parseFloat(tp2Price()) || null,
        trail_sl: parseFloat(trailSl()) || null,
        entry_details: validEntryLegs,
        exit_details: validExitLegs.length > 0 ? validExitLegs : null,
        commission_buy: commissionBuy(),
        commission_sell: commissionSell(),
        total_fee: totalFee(),
        gross_pnl: grossPnL(),
        net_pnl: netPnL(),
        roi_pct: roiPct(),
        risk_r: riskR(),
        risk_amount: riskAmount(),
        result_label: posStatus() === 'CLOSED' ? resultLabel() : 'OPEN',
        entry_session: entrySession(),
        hold_days: parseInt(holdDays()) || null,
        psychology_tags: selectedPsychology(),
      };
    }

    try {
      await props.onSave(date(), tradePayload);
      
      // Reset Form
      setTicker("");
      setNotes("");
      setEntryZoneIdeal("");
      setEntryZoneMax("");
      setPlannedRR("");
      setAnalysisRaw("");
      setSelectedChecklist([]);
      setSelectedPsychology([]);
      setStopLoss("");
      setTp1Price("");
      setTp2Price("");
      setTrailSl("");
      setHoldDays("");
      setEntryLegs([{ lot: 0, price: 0, reason: "Initial entry" }]);
      setExitLegs([{ lot: 0, price: 0, type: "TP1" }]);
      alert("Trade logged successfully!");
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div class="premium-card bg-white p-5 flex flex-col gap-5 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
      <div>
        <h3 class="text-xl font-cormorant font-bold text-forest">Log Trading Record</h3>
        <p class="text-[9px] font-bold text-earth uppercase tracking-widest">Setup Plan or Real Execution</p>
      </div>

      {/* Record Type Toggle Selector */}
      <div class="flex bg-page-bg p-1 rounded-xl border border-forest/5 shrink-0">
        <button
          type="button"
          onClick={() => setRecordType('EXECUTED')}
          class="flex-1 py-1.5 text-xs font-outfit font-bold rounded-lg transition-all cursor-pointer"
          classList={{
            "bg-forest text-white shadow-sm": recordType() === 'EXECUTED',
            "text-earth hover:text-forest": recordType() !== 'EXECUTED'
          }}
        >
          🟩 Executed Trade
        </button>
        <button
          type="button"
          onClick={() => setRecordType('SETUP')}
          class="flex-1 py-1.5 text-xs font-outfit font-bold rounded-lg transition-all cursor-pointer"
          classList={{
            "bg-forest text-white shadow-sm": recordType() === 'SETUP',
            "text-earth hover:text-forest": recordType() !== 'SETUP'
          }}
        >
          🟦 Setup Plan
        </button>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4 text-left">
        {/* Common: Date & Ticker */}
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Trade Date</label>
            <input
              type="date"
              value={date()}
              onInput={(e) => setDate(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Ticker</label>
            <input
              type="text"
              placeholder="e.g. BREN"
              value={ticker()}
              onInput={(e) => setTicker(e.currentTarget.value)}
              class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none uppercase placeholder:text-forest/20"
              required
            />
          </div>
        </div>

        {/* 🟦 SETUP FORM LAYOUT */}
        <Show when={recordType() === 'SETUP'}>
          <div class="space-y-4 animate-fade-in-up">
            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Quality</label>
                <select
                  value={setupQuality()}
                  onInput={(e) => setSetupQuality(e.currentTarget.value as SetupQualityType)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <option value="A">Tier A</option>
                  <option value="B">Tier B</option>
                  <option value="C">Tier C</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Status</label>
                <select
                  value={setupStatus()}
                  onInput={(e) => setSetupStatus(e.currentTarget.value as SetupStatusType)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="EXECUTED">EXECUTED</option>
                  <option value="SKIPPED">SKIPPED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Setup Type</label>
                <select
                  value={setupType()}
                  onInput={(e) => setSetupType(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <For each={setups}>
                    {(s) => <option value={s}>{s}</option>}
                  </For>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Entry Ideal Zone</label>
                <input
                  type="number"
                  placeholder="Ideal price"
                  value={entryZoneIdeal()}
                  onInput={(e) => setEntryZoneIdeal(e.currentTarget.value)}
                  class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                  required
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Entry Max Zone</label>
                <input
                  type="number"
                  placeholder="Max tolerance price"
                  value={entryZoneMax()}
                  onInput={(e) => setEntryZoneMax(e.currentTarget.value)}
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
                  value={stopLoss()}
                  onInput={(e) => setStopLoss(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth/80 block">TP 1 Price</label>
                <input
                  type="number"
                  placeholder="TP 1"
                  value={tp1Price()}
                  onInput={(e) => setTp1Price(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth/80 block">TP 2 Price</label>
                <input
                  type="number"
                  placeholder="TP 2"
                  value={tp2Price()}
                  onInput={(e) => setTp2Price(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Planned R:R</label>
              <input
                type="text"
                placeholder="Auto-calculated from Ideal Entry & SL"
                value={plannedRR()}
                disabled
                class="w-full p-2.5 bg-sage/20 rounded-xl border border-forest/5 font-outfit text-xs text-forest font-bold"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Analysis Notes</label>
              <textarea
                placeholder="Market context, bandarmology accumulation, foreign flows..."
                value={analysisRaw()}
                onInput={(e) => setAnalysisRaw(e.currentTarget.value)}
                class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none resize-none h-16"
              />
            </div>

            {/* Checklist Confluences */}
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
          </div>
        </Show>

        {/* 🟩 EXECUTED FORM LAYOUT */}
        <Show when={recordType() === 'EXECUTED'}>
          <div class="space-y-4 animate-fade-in-up">
            <div class="grid grid-cols-3 gap-2">
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Direction</label>
                <select
                  value={direction()}
                  onInput={(e) => setDirection(e.currentTarget.value as TradeDirection)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <option value="LONG">LONG (Buy)</option>
                  <option value="SHORT">SHORT (Sell)</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Position Status</label>
                <select
                  value={posStatus()}
                  onInput={(e) => setPosStatus(e.currentTarget.value as PosStatusType)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <option value="CLOSED">CLOSED (Finished)</option>
                  <option value="PARTIAL">PARTIAL (Some running)</option>
                  <option value="OPEN">OPEN (All running)</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Session</label>
                <select
                  value={entrySession()}
                  onInput={(e) => setEntrySession(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none cursor-pointer"
                >
                  <option value="Sesi 1">Sesi 1</option>
                  <option value="Sesi 2">Sesi 2</option>
                  <option value="Sesi 1 + Sesi 2">Sesi 1 + 2</option>
                </select>
              </div>
            </div>

            {/* Entry Legs Section */}
            <div class="space-y-2 border border-dashed border-forest/10 p-3 rounded-xl bg-sage/5">
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-forest uppercase tracking-wider">Entry Legs</span>
                <button
                  type="button"
                  onClick={addEntryLeg}
                  class="px-2 py-0.5 text-[8px] bg-forest text-white rounded font-bold hover:bg-mid-green transition-all cursor-pointer"
                >
                  + Add Entry Leg
                </button>
              </div>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <For each={entryLegs()}>
                  {(leg, index) => (
                    <div class="grid grid-cols-3 gap-1.5 items-end">
                      <div class="space-y-0.5">
                        <label class="text-[7.5px] font-bold text-earth block">Lot</label>
                        <input
                          type="number"
                          placeholder="Lots"
                          value={leg.lot || ""}
                          onInput={(e) => updateEntryLeg(index(), 'lot', parseInt(e.currentTarget.value) || 0)}
                          class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                          required
                        />
                      </div>
                      <div class="space-y-0.5">
                        <label class="text-[7.5px] font-bold text-earth block">Price</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={leg.price || ""}
                          onInput={(e) => updateEntryLeg(index(), 'price', parseFloat(e.currentTarget.value) || 0)}
                          class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                          required
                        />
                      </div>
                      <div class="flex gap-1 items-center">
                        <input
                          type="text"
                          placeholder="Reason (e.g. E1)"
                          value={leg.reason || ""}
                          onInput={(e) => updateEntryLeg(index(), 'reason', e.currentTarget.value)}
                          class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-[9px]"
                        />
                        <button
                          type="button"
                          onClick={() => removeEntryLeg(index())}
                          class="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                          disabled={entryLegs().length <= 1}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Exit Legs Section (Only relevant if CLOSED or PARTIAL) */}
            <Show when={posStatus() !== 'OPEN'}>
              <div class="space-y-2 border border-dashed border-forest/10 p-3 rounded-xl bg-sage/5 animate-fade-in-up">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] font-bold text-forest uppercase tracking-wider">Exit Legs</span>
                  <button
                    type="button"
                    onClick={addExitLeg}
                    class="px-2 py-0.5 text-[8px] bg-forest text-white rounded font-bold hover:bg-mid-green transition-all cursor-pointer"
                  >
                    + Add Exit Leg
                  </button>
                </div>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                  <For each={exitLegs()}>
                    {(leg, index) => (
                      <div class="grid grid-cols-3 gap-1.5 items-end">
                        <div class="space-y-0.5">
                          <label class="text-[7.5px] font-bold text-earth block">Lot</label>
                          <input
                            type="number"
                            placeholder="Lots"
                            value={leg.lot || ""}
                            onInput={(e) => updateExitLeg(index(), 'lot', parseInt(e.currentTarget.value) || 0)}
                            class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                            required
                          />
                        </div>
                        <div class="space-y-0.5">
                          <label class="text-[7.5px] font-bold text-earth block">Price</label>
                          <input
                            type="number"
                            placeholder="Price"
                            value={leg.price || ""}
                            onInput={(e) => updateExitLeg(index(), 'price', parseFloat(e.currentTarget.value) || 0)}
                            class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-xs text-center"
                            required
                          />
                        </div>
                        <div class="flex gap-1 items-center">
                          <select
                            value={leg.type}
                            onInput={(e) => updateExitLeg(index(), 'type', e.currentTarget.value)}
                            class="w-full p-1.5 bg-white rounded-lg border border-forest/5 text-[9px] cursor-pointer"
                          >
                            <option value="TP1">TP1</option>
                            <option value="TP2">TP2</option>
                            <option value="TP full">TP full</option>
                            <option value="SL">SL</option>
                            <option value="Trailing SL">Trail SL</option>
                            <option value="Breakeven">Breakeven</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeExitLeg(index())}
                            class="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
                            disabled={exitLegs().length <= 1}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Calculations Heatmap Preview */}
            <div class="bg-sage/15 border border-forest/10 p-3 rounded-xl space-y-2 text-xs font-outfit">
              <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-earth/70">
                <span>Calculations Summary</span>
                <span class="text-[8px] bg-forest/10 px-1 py-0.5 rounded text-forest">Stockbit Fee Engine</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-earth">Total Lots:</span>
                  <span class="font-bold text-forest">{lots()} lot</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-earth">Avg Entry:</span>
                  <span class="font-bold text-forest">Rp{Math.round(avgEntryPrice())}</span>
                </div>
                <Show when={posStatus() !== 'OPEN'}>
                  <>
                    <div class="flex justify-between">
                      <span class="text-earth">Closed Lots:</span>
                      <span class="font-bold text-forest">{lotsClosed()} lot</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-earth">Avg Exit:</span>
                      <span class="font-bold text-forest">Rp{Math.round(avgExitPrice())}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-earth">Total Fees:</span>
                      <span class="font-bold text-rose-500">Rp{Math.round(totalFee())}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-earth">Net P&L:</span>
                      <span class="font-bold" classList={{ "text-emerald-600": netPnL() >= 0, "text-rose-500": netPnL() < 0 }}>
                        {netPnL() >= 0 ? "+" : ""}Rp{Math.round(netPnL()).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div class="flex justify-between col-span-2 border-t border-forest/5 pt-1 mt-1 font-bold">
                      <span class="text-earth">Realized ROI %:</span>
                      <span classList={{ "text-emerald-600": roiPct() >= 0, "text-rose-500": roiPct() < 0 }}>
                        {roiPct() >= 0 ? "+" : ""}{roiPct().toFixed(2)}%
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
                  value={stopLoss()}
                  onInput={(e) => setStopLoss(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth block">TP 1 Price</label>
                <input
                  type="number"
                  placeholder="TP 1"
                  value={tp1Price()}
                  onInput={(e) => setTp1Price(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-[9px] font-bold text-earth block">TP 2 Price</label>
                <input
                  type="number"
                  placeholder="TP 2"
                  value={tp2Price()}
                  onInput={(e) => setTp2Price(e.currentTarget.value)}
                  class="w-full p-2 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <Show when={posStatus() === 'PARTIAL'}>
                <div class="space-y-1.5 animate-fade-in-up">
                  <label class="text-[9px] font-bold text-earth block">Trailing SL</label>
                  <input
                    type="number"
                    placeholder="Trailing SL"
                    value={trailSl()}
                    onInput={(e) => setTrailSl(e.currentTarget.value)}
                    class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                  />
                </div>
              </Show>
              <Show when={posStatus() === 'CLOSED'}>
                <div class="space-y-1.5 animate-fade-in-up">
                  <label class="text-[9px] font-bold text-earth block">Result Label</label>
                  <select
                    value={resultLabel()}
                    onInput={(e) => setResultLabel(e.currentTarget.value as ResultLabelType)}
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
                  value={holdDays()}
                  onInput={(e) => setHoldDays(e.currentTarget.value)}
                  class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Psychology Tags */}
            <div class="space-y-1.5">
              <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">Mindset Tags</label>
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
          </div>
        </Show>

        {/* Notes (Common) */}
        <div class="space-y-1.5">
          <label class="text-[9px] font-bold text-earth uppercase tracking-wider block">General Notes</label>
          <textarea
            placeholder="Additional notes about execution, feelings, plan triggers..."
            value={notes()}
            onInput={(e) => setNotes(e.currentTarget.value)}
            class="w-full p-2.5 bg-page-bg rounded-xl border border-forest/5 font-outfit text-xs focus:outline-none resize-none h-16"
          />
        </div>

        {/* Action Button */}
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
