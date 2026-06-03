export interface PriceAlert {
  id: string;
  ticker: string;
  companyName: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  dismissed: boolean;
}
