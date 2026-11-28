import { createSignal } from "solid-js";
import type { Portfolio } from "../../../types";
import { getUsdRate } from "../../../utils/format";
import { submitModalHoldingPosition } from "./quickPortfolioActions";

export const useAddHoldingForm = (
  getPortfolio: () => Portfolio | null,
  setIsSubmitting: (val: boolean) => void,
) => {
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [newTicker, setNewTicker] = createSignal("");
  const [newQty, setNewQty] = createSignal<number | null>(null);
  const [newPrice, setNewPrice] = createSignal<number | null>(null);
  const [newCurrency, setNewCurrency] = createSignal<string>("USD");
  const [newConversionRate, setNewConversionRate] = createSignal<number | null>(null);

  const startAddHoldingModal = () => {
    setNewCurrency("USD");
    setNewConversionRate(getUsdRate());
    setShowAddModal(true);
  };

  const handleAddHoldingSubmit = async (e: Event) => {
    e.preventDefault();
    const symbol = newTicker().trim().toUpperCase();
    const qty = Number(newQty());
    const price = Number(newPrice());
    const isIdx = symbol.endsWith(".JK");
    const currency = isIdx ? "IDR" : newCurrency();
    const conversionRate = isIdx ? 1 : Number(newConversionRate());

    if (!symbol || qty <= 0 || price <= 0) {
      alert("Please fill in valid symbol, quantity, and buy price.");
      return;
    }
    if (Number.isNaN(conversionRate) || conversionRate <= 0) {
      alert("Please enter a valid conversion rate.");
      return;
    }

    const p = getPortfolio();
    if (!p) return;

    setIsSubmitting(true);
    try {
      await submitModalHoldingPosition(p, symbol, qty, price, currency, conversionRate);
      setNewTicker("");
      setNewQty(null);
      setNewPrice(null);
      setNewCurrency("USD");
      setNewConversionRate(null);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add holding:", err);
      alert("Failed to insert asset. Check ticker spelling.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    showAddModal,
    setShowAddModal,
    newTicker,
    setNewTicker,
    newQty,
    setNewQty,
    newPrice,
    setNewPrice,
    newCurrency,
    setNewCurrency,
    newConversionRate,
    setNewConversionRate,
    startAddHoldingModal,
    handleAddHoldingSubmit,
  };
};
