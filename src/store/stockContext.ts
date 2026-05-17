import { createSignal } from "solid-js";
import type { StockData } from "../types";

const [currentStockData, setCurrentStockData] = createSignal<StockData | null>(null);
const [isStockLoading, setIsStockLoading] = createSignal(false);

export { currentStockData, setCurrentStockData, isStockLoading, setIsStockLoading };
