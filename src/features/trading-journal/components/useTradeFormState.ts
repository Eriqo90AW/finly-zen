import { createMemo, createSignal } from "solid-js";
import type {
  EntryLeg,
  ExitLeg,
  PosStatusType,
  ResultLabelType,
  SetupQualityType,
  SetupStatusType,
  TradeDirection,
} from "../../../data/TradingJournal/data/database.types";
import {
  buildExecutedTradePayload,
  buildSetupTradePayload,
  calculateExecutedTradeMetrics,
  calculatePlannedRR,
} from "./tradeFormCalculations";

export function createTradeFormState() {
  const [date, setDate] = createSignal(new Date().toISOString().split("T")[0]);
  const [ticker, setTicker] = createSignal("");
  const [recordType, setRecordType] = createSignal<"SETUP" | "EXECUTED">("EXECUTED");
  const [notes, setNotes] = createSignal("");

  const [setupQuality, setSetupQuality] = createSignal<SetupQualityType>("A");
  const [setupStatus, setSetupStatus] = createSignal<SetupStatusType>("PLANNED");
  const [setupType, setSetupType] = createSignal("Breakout");
  const [entryZoneIdeal, setEntryZoneIdeal] = createSignal("");
  const [entryZoneMax, setEntryZoneMax] = createSignal("");
  const [analysisRaw, setAnalysisRaw] = createSignal("");
  const [selectedChecklist, setSelectedChecklist] = createSignal<string[]>([]);

  const [direction, setDirection] = createSignal<TradeDirection>("LONG");
  const [posStatus, setPosStatus] = createSignal<PosStatusType>("CLOSED");
  const [stopLoss, setStopLoss] = createSignal("");
  const [tp1Price, setTp1Price] = createSignal("");
  const [tp2Price, setTp2Price] = createSignal("");
  const [trailSl, setTrailSl] = createSignal("");
  const [entrySession, setEntrySession] = createSignal("Sesi 1");
  const [holdDays, setHoldDays] = createSignal("");
  const [resultLabel, setResultLabel] = createSignal<ResultLabelType>("CUAN");
  const [selectedPsychology, setSelectedPsychology] = createSignal<string[]>([]);

  const [entryLegs, setEntryLegs] = createSignal<EntryLeg[]>([
    { lot: 0, price: 0, reason: "Initial entry" },
  ]);
  const [exitLegs, setExitLegs] = createSignal<ExitLeg[]>([
    { lot: 0, price: 0, type: "TP1" },
  ]);

  const metrics = createMemo(() =>
    calculateExecutedTradeMetrics(entryLegs(), exitLegs(), direction(), stopLoss()),
  );

  const plannedRR = createMemo(() =>
    recordType() === "SETUP"
      ? calculatePlannedRR(entryZoneIdeal(), stopLoss(), tp1Price())
      : "",
  );

  const toggleChecklist = (option: string) => {
    setSelectedChecklist((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const togglePsychology = (option: string) => {
    setSelectedPsychology((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const addEntryLeg = () => {
    setEntryLegs((prev) => [...prev, { lot: 0, price: 0, reason: "" }]);
  };

  const removeEntryLeg = (index: number) => {
    setEntryLegs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateEntryLeg = <K extends keyof EntryLeg>(
    index: number,
    field: K,
    value: EntryLeg[K],
  ) => {
    setEntryLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addExitLeg = () => {
    setExitLegs((prev) => [...prev, { lot: 0, price: 0, type: "TP1" }]);
  };

  const removeExitLeg = (index: number) => {
    setExitLegs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateExitLeg = <K extends keyof ExitLeg>(
    index: number,
    field: K,
    value: ExitLeg[K],
  ) => {
    setExitLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const resetForm = () => {
    setTicker("");
    setNotes("");
    setEntryZoneIdeal("");
    setEntryZoneMax("");
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
  };

  const buildPayload = () => {
    if (!ticker()) {
      return { error: "Please fill in Ticker." } as const;
    }
    return recordType() === "SETUP"
      ? buildSetupTradePayload({
          ticker: ticker(),
          notes: notes(),
          setupQuality: setupQuality(),
          setupStatus: setupStatus(),
          setupType: setupType(),
          entryZoneIdeal: entryZoneIdeal(),
          entryZoneMax: entryZoneMax(),
          stopLoss: stopLoss(),
          tp1Price: tp1Price(),
          tp2Price: tp2Price(),
          plannedRR: plannedRR(),
          analysisRaw: analysisRaw(),
          selectedChecklist: selectedChecklist(),
        })
      : buildExecutedTradePayload({
          ticker: ticker(),
          notes: notes(),
          posStatus: posStatus(),
          direction: direction(),
          metrics: metrics(),
          entryLegs: entryLegs(),
          exitLegs: exitLegs(),
          stopLoss: stopLoss(),
          tp1Price: tp1Price(),
          tp2Price: tp2Price(),
          trailSl: trailSl(),
          resultLabel: resultLabel(),
          entrySession: entrySession(),
          holdDays: holdDays(),
          selectedPsychology: selectedPsychology(),
        });
  };

  return {
    date, setDate, ticker, setTicker, recordType, setRecordType, notes, setNotes,
    setupQuality, setSetupQuality, setupStatus, setSetupStatus, setupType, setSetupType,
    entryZoneIdeal, setEntryZoneIdeal, entryZoneMax, setEntryZoneMax,
    analysisRaw, setAnalysisRaw, selectedChecklist, toggleChecklist,
    direction, setDirection, posStatus, setPosStatus,
    stopLoss, setStopLoss, tp1Price, setTp1Price, tp2Price, setTp2Price,
    trailSl, setTrailSl, entrySession, setEntrySession, holdDays, setHoldDays,
    resultLabel, setResultLabel, selectedPsychology, togglePsychology,
    entryLegs, exitLegs, addEntryLeg, removeEntryLeg, updateEntryLeg,
    addExitLeg, removeExitLeg, updateExitLeg,
    metrics, plannedRR, resetForm, buildPayload,
  };
}
