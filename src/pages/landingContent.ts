export interface LandingNavLink {
  href: string;
  label: string;
}

export interface LandingPillar {
  id?: string;
  icon: string;
  title: string;
  description: string;
  highlight: string;
}

export interface LandingPhilosophyHighlight {
  title: string;
  subtitle: string;
}

export const LANDING_NAV_LINKS: LandingNavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#dividends", label: "IDX Dividends" },
  { href: "#journal", label: "Trading Journal" },
  { href: "#philosophy", label: "Philosophy" },
];

export const LANDING_PILLARS: LandingPillar[] = [
  {
    icon: "account_balance_wallet",
    title: "Cash Flow & Expense Tracking",
    description:
      "Categorize daily expenses, track budgets with pacing forecasts, and manage seamless inter-account transfers between bank and cash accounts.",
    highlight: "Visual monthly budget pacing",
  },
  {
    id: "dividends",
    icon: "calendar_month",
    title: "IDX Dividend Intelligence",
    description:
      "Stay ahead of Indonesian Stock Exchange corporate actions. Interactive dividend calendar, yield forecasts, and automatic payout tracking.",
    highlight: "Authentic 2025-2026 IDX data",
  },
  {
    id: "journal",
    icon: "insights",
    title: "Portfolios & Trading Journal",
    description:
      "Log day trades with planned R:R, bandarmology notes, psychology checklists, and track multi-asset portfolios in both IDR and USD.",
    highlight: "Disciplined win-rate analytics",
  },
];

export const LANDING_PHILOSOPHY_HIGHLIGHTS: LandingPhilosophyHighlight[] = [
  { title: "Light Mode", subtitle: "Calm & clear" },
  { title: "IDR & USD", subtitle: "Dual currencies" },
  { title: "100% Private", subtitle: "Supabase security" },
  { title: "Zero Ads", subtitle: "Focused experience" },
];
