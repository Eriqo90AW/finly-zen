import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { searchTickers } from "../../../../../data/marketData";
import { fetchMultiStockPrices } from "../../../../../data/portfolioData";
import {
  addTransactionToPortfolio,
  portfolioState,
} from "../../../../../store/portfolioStore";
import type { PortfolioAsset, TickerSearchResult } from "../../../../../types";
import { debounce } from "../../../../../utils/debounce";
import { getUsdRate } from "../../../../../utils/format";

export interface UseAddAssetFormProps {
  isOpen: () => boolean;
  onClose: () => void;
  portfolioId: () => string;
  assets: () => PortfolioAsset[] | undefined;
  initialType: () => "BUY" | "SELL" | undefined;
  initialTicker: () => string | undefined;
}

export const useAddAssetForm = (options: UseAddAssetFormProps) => {
  const [ticker, setTicker] = createSignal("");
  const [selectedTicker, setSelectedTicker] = createSignal<string | null>(null);
  const [shares, setShares] = createSignal<number | null>(null);
  const [price, setPrice] = createSignal<number | null>(null);
  const [currency, setCurrency] = createSignal<string>("USD");
  const [priceCurrency, setPriceCurrency] = createSignal<number>(getUsdRate());
  const [transactionDate, setTransactionDate] = createSignal(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = createSignal("");
  const [type, setType] = createSignal<"BUY" | "SELL">("BUY");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isLoadingPrice, setIsLoadingPrice] = createSignal(false);

  const [searchResults, setSearchResults] = createSignal<TickerSearchResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = createSignal(false);
  const [showSuggestions, setShowSuggestions] = createSignal(false);

  const selectedHeldAsset = () => {
    const assets = options.assets();
    if (type() !== "SELL" || !assets) return null;
    return assets.find((a) => a.ticker === selectedTicker()) ?? null;
  };

  const activePortfolio = () =>
    portfolioState.portfolios.find((p) => p.id === options.portfolioId());
  const nativeCurrency = () => activePortfolio()?.nativeCurrency || "USD";

  const applySymbolCurrency = (symbol: string) => {
    if (symbol.toUpperCase().endsWith(".JK")) {
      setCurrency("IDR");
      setPriceCurrency(1);
    } else {
      setCurrency("USD");
      setPriceCurrency(getUsdRate());
    }
  };

  const fetchAndSetPrice = async (symbol: string) => {
    setIsLoadingPrice(true);
    try {
      const response = await fetchMultiStockPrices([symbol]);
      if (response?.data && response.data.length > 0) {
        const item = response.data[0];
        if (
          item.success &&
          (item.active_price !== undefined || item.current_price !== undefined)
        ) {
          setPrice(item.active_price ?? item.current_price ?? 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch current price:", err);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleSelectHeldAsset = (symbol: string) => {
    if (!symbol) {
      setTicker("");
      setSelectedTicker(null);
      setShares(null);
      setPrice(null);
      return;
    }
    setTicker(symbol);
    setSelectedTicker(symbol);
    applySymbolCurrency(symbol);
    fetchAndSetPrice(symbol);
  };

  const handleSelectSuggestion = (symbol: string) => {
    setTicker(symbol);
    setSelectedTicker(symbol);
    setShowSuggestions(false);
    applySymbolCurrency(symbol);
    fetchAndSetPrice(symbol);
  };

  const handleTypeChange = (newType: "BUY" | "SELL") => {
    if (newType === type()) return;
    setType(newType);
    setTicker("");
    setSelectedTicker(null);
    setShares(null);
    setPrice(null);
  };

  const performTickerSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    try {
      const data = await searchTickers(query);
      if (
        ticker().trim().toUpperCase() === selectedTicker()?.trim().toUpperCase()
      ) {
        setShowSuggestions(false);
        return;
      }
      setSearchResults(data);
      setShowSuggestions(data.length > 0);
    } catch (e) {
      console.error("Failed to search tickers:", e);
    } finally {
      setIsLoadingResults(false);
    }
  }, 300);

  createEffect(() => {
    const query = ticker();
    if (query && query !== selectedTicker()) {
      performTickerSearch(query);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".ticker-container")) {
      setShowSuggestions(false);
    }
  };

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("click", handleClickOutside);
  });

  createEffect(() => {
    if (options.isOpen()) {
      setPriceCurrency(getUsdRate());
      setShares(null);
      setPrice(null);
      setNotes("");
      setType(options.initialType() ?? "BUY");

      const initTicker = options.initialTicker();
      if (initTicker) {
        setTicker(initTicker);
        setSelectedTicker(initTicker);
        applySymbolCurrency(initTicker);
        fetchAndSetPrice(initTicker);
      } else {
        setTicker("");
        setSelectedTicker(null);
      }
    }
  });

  const isValidTicker = () => {
    const currentTicker = ticker().trim().toUpperCase();
    return currentTicker !== "" && selectedTicker() === currentTicker;
  };

  const amount = () => {
    const qty = shares();
    const p = price();
    if (qty === null || p === null) return null;
    return qty * p;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!isValidTicker()) {
      alert(
        "Please select a ticker symbol from the autocomplete dropdown list.",
      );
      return;
    }

    const t = ticker().trim().toUpperCase();
    const qty = Number(shares());
    const p = Number(price());
    const rate = Number(priceCurrency());

    if (t && qty > 0 && p > 0 && rate > 0) {
      setIsSubmitting(true);
      try {
        await addTransactionToPortfolio(options.portfolioId(), {
          ticker: t,
          qty,
          pricePerUnit: p,
          priceCurrency: rate,
          currency: currency(),
          type: type(),
          notes: notes(),
          transactionDate: new Date(transactionDate()).toISOString(),
        });

        setTicker("");
        setSelectedTicker(null);
        setShares(null);
        setPrice(null);
        setNotes("");
        options.onClose();
      } catch (error) {
        console.error("Failed to add transaction:", error);
        alert("Failed to save transaction. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return {
    ticker,
    setTicker,
    selectedTicker,
    setSelectedTicker,
    shares,
    setShares,
    price,
    setPrice,
    currency,
    setCurrency,
    priceCurrency,
    setPriceCurrency,
    transactionDate,
    setTransactionDate,
    notes,
    setNotes,
    type,
    isSubmitting,
    isLoadingPrice,
    searchResults,
    isLoadingResults,
    showSuggestions,
    setShowSuggestions,
    selectedHeldAsset,
    nativeCurrency,
    isValidTicker,
    amount,
    handleSelectHeldAsset,
    handleSelectSuggestion,
    handleTypeChange,
    handleSubmit,
  };
};
