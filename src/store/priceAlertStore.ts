import { createStore, reconcile } from "solid-js/store";
import { createEffect, onMount } from "solid-js";
import type { PriceAlert } from "../types";

export interface PriceAlertState {
  alerts: PriceAlert[];
}

const STORE_KEY = "finly_price_alerts_v1";

export const [priceAlertState, setPriceAlertState] = createStore<PriceAlertState>({
  alerts: [],
});

export function setupPriceAlertPersistence() {
  onMount(() => {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPriceAlertState("alerts", reconcile(parsed));
        } else if (parsed && Array.isArray(parsed.alerts)) {
          setPriceAlertState("alerts", reconcile(parsed.alerts));
        }
      } catch (e) {
        console.error("Failed to load price alerts state", e);
      }
    }
  });

  createEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(priceAlertState.alerts));
  });
}

export function addPriceAlert(
  ticker: string,
  companyName: string,
  targetPrice: number,
  condition: "above" | "below"
) {
  const newAlert: PriceAlert = {
    id: Math.random().toString(36).substring(2, 9),
    ticker: ticker.toUpperCase(),
    companyName,
    targetPrice,
    condition,
    createdAt: new Date().toISOString(),
    triggered: false,
    dismissed: false,
  };
  setPriceAlertState("alerts", (prev) => [...prev, newAlert]);
}

export function removePriceAlert(id: string) {
  setPriceAlertState("alerts", (prev) => prev.filter((a) => a.id !== id));
}

export function dismissAlert(id: string) {
  setPriceAlertState(
    "alerts",
    (a) => a.id === id,
    "dismissed",
    true
  );
}

// Check alerts for a specific ticker and return newly triggered ones
export function checkAlerts(ticker: string, currentPrice: number): PriceAlert[] {
  const t = ticker.toUpperCase();
  const newlyTriggered: PriceAlert[] = [];

  priceAlertState.alerts.forEach((alert) => {
    if (alert.ticker === t && !alert.triggered) {
      let isTriggered = false;
      if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
        isTriggered = true;
      } else if (alert.condition === "below" && currentPrice <= alert.targetPrice) {
        isTriggered = true;
      }

      if (isTriggered) {
        const nowStr = new Date().toISOString();
        newlyTriggered.push({
          ...alert,
          triggered: true,
          triggeredAt: nowStr,
        });

        // Update in store
        setPriceAlertState(
          "alerts",
          (a) => a.id === alert.id,
          {
            triggered: true,
            triggeredAt: nowStr
          }
        );
      }
    }
  });

  return newlyTriggered;
}
