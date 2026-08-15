# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indonesian retail investors and personal finance managers who track daily expenses, manage multi-asset portfolios, analyze Indonesian Stock Exchange (IDX) dividends, and keep a systematic trading journal. They need clarity, calm, and unified financial oversight without switching between fragmented apps.

## Product Purpose

Finly Zen provides a unified, calm, and editorial financial dashboard. It brings daily cash-flow management (expenses, budgets, transactions) together with wealth management (stock portfolios, IDX dividend calendars, market valuation, and trading journals) to give users total control over their financial journey.

## Positioning

A "Zen Garden" for personal wealth & cash flow — distinctively combining daily expense tracking with deep Indonesian Stock Exchange (IDX) investment metrics, dividend forecasts, and trading analytics in an ultra-clean, light-mode desktop experience.

## Operating Context

- **Desktop-first web application** designed for focused financial review and daily expense logging.
- Integrated financial workflow covering 11 core screens: Dashboard, Transactions, Budgets, Goals, Reports, Portfolio, Quick Portfolio, Stock Dashboard, Market Cap List, Dividend Calendar, and Trading Journal.
- Supports dual currency views (IDR default with USD conversion rate) tailored for Indonesian investors (`id-ID` locale conventions, Rupiah shortcuts like Rp1,5jt).

## Capabilities and Constraints

- **Stack:** SolidJS + Vite + TypeScript + Tailwind CSS v4 (CSS-first `@theme` in `src/index.css`, no `tailwind.config.js`).
- **Data & Backend:** Supabase JS client integration (`@supabase/supabase-js`), Python script (`idx_data.py`) for scraping/syncing IDX stock data, SQL DDL schema (`trading_journal_ddl.sql`), and static JSON dataset (`sahamidx_dividends.json`, `distinct_companies.json`).
- **State Management:** Solid `createStore` persisted to `localStorage` under `finly_zen_state_v2`.
- **Data Visualization:** ApexCharts via `solid-apexcharts` for performance charts, allocation pie charts, and portfolio history.

## Brand Commitments

- **Aesthetic Direction:** "Premium Zen Garden" — deep forest greens (`#1a4d2e`), pale mint background (`#f0f7f2`), clean white cards with green-tinted soft elevation (`shadow-premium`), and editorial Garamond numerals.
- **Color Rules:** Light-mode only (no dark mode). Borders are soft green-tinted (`border-forest/10`). Color opacity layering is the primary technique (`forest/10`, `sage/50`, `spring/10`).
- **Typography:** **Cormorant Garamond** for editorial headings and hero numerals; **Outfit** for clean UI/body text; uppercase micro-labels (`text-[10px] font-bold text-earth uppercase tracking-widest`).

## Evidence on Hand

- `BASE_DESIGN.md`: Complete design system reference documenting tokens, component classes, animation keyframes, and layout architecture.
- `trading_journal_ddl.sql`: Database schema definition for trading journal entries, trades, and strategy metrics.
- `sahamidx_dividends.json` & `distinct_companies.json`: Authentic IDX stock and dividend dataset for Indonesian equities.
- `idx_data.py`: Data collection script for fetching IDX stock information.

## Product Principles

1. **Calm Clarity over Noise:** Present complex financial data, ratios, and transactions in a clean, uncluttered layout with gentle green aesthetics that reduce financial anxiety.
2. **Unified Cash & Equity View:** Seamlessly bridge everyday spending with long-term equity investing and dividend cash flow.
3. **Editorial Craft:** Use typography (Cormorant Garamond + Outfit), structured cards (`.premium-card`), and precise micro-interactions to create a luxury, high-craft editorial feel.
4. **Data Integrity & Determinism:** Provide deterministic metric evaluation, clear signal badges (good/neutral/bad), and instant dual-currency calculations.

## Accessibility & Inclusion

- Desktop-first layout with high-contrast text against pale mint background (`#f0f7f2`).
- Touch & keyboard accessible interactive components, readable micro-typography, and clear semantic status indicators.
