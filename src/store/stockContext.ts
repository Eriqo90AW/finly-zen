import { createSignal } from "solid-js";
import { StockData } from "../data/stockData";

const [currentStockData, setCurrentStockData] = createSignal<StockData | null>(null);

export { currentStockData, setCurrentStockData };
