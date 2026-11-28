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
  { href: "#reports", label: "Reports" },
  { href: "#portfolios", label: "Portfolios" },
  { href: "#philosophy", label: "Philosophy" },
];

export const LANDING_PILLARS: LandingPillar[] = [
  {
    icon: "account_balance_wallet",
    title: "Budgets & Money Framework",
    description:
      "Categorize daily expenses, allocate monthly buckets, track emergency targets, and manage seamless inter-account transfers across bank and cash accounts.",
    highlight: "Visual monthly budget pacing",
  },
  {
    id: "reports",
    icon: "assessment",
    title: "Reports & Savings Goals",
    description:
      "Review real cashflow trends, month-over-month category comparisons, and account flows while nurturing savings goals with period-accurate balances.",
    highlight: "Live financial analytics",
  },
  {
    id: "portfolios",
    icon: "insights",
    title: "Markets & Multi-Asset Portfolios",
    description:
      "Analyze stock fundamentals, market cap rankings, and track multi-asset investment portfolios in both IDR and USD with real-time P&L.",
    highlight: "Dual-currency portfolio tracking",
  },
];

export const LANDING_PHILOSOPHY_HIGHLIGHTS: LandingPhilosophyHighlight[] = [
  { title: "Light Mode", subtitle: "Calm & clear" },
  { title: "IDR & USD", subtitle: "Dual currencies" },
  { title: "100% Private", subtitle: "Supabase security" },
  { title: "Zero Ads", subtitle: "Focused experience" },
];
