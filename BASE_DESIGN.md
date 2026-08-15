# Finly Zen — Design System Reference

A single source of truth for Finly Zen's visual language. Consult this before building new screens or components to stay consistent with the existing aesthetic.

> **Stack:** SolidJS + Vite + Tailwind CSS v4 (CSS-first config) + TypeScript
> **Design philosophy:** Light-mode-only, desktop-first, "premium zen garden" — deep forest greens over a pale mint background, editorial serif numerals, soft green-tinted elevation.
> **Master file:** Almost the entire design system is declared in `src/index.css` (the `@theme` block, base layer, and component classes). There is **no `tailwind.config.js`** — Tailwind v4 uses CSS-first config.

---

## 1. Color System

All brand tokens are defined as Tailwind v4 theme variables in `src/index.css` (lines 3–30) and become utilities like `bg-forest`, `text-earth`, `border-forest/10`.

### Brand / Core Palette

| Token | Hex | Utility | Role |
|---|---|---|---|
| `--color-page-bg` | `#f0f7f2` | `bg-page-bg` | App background (pale mint) |
| `--color-card-bg` | `#ffffff` | `bg-card-bg` | Card background |
| `--color-forest` | `#1a4d2e` | `forest` | **Primary brand** — buttons, nav, accents |
| `--color-mid-green` | `#2d7d46` | `mid-green` | Secondary green / hover state |
| `--color-spring` | `#52c278` | `spring` | Accent green — FAB, positive highlights |
| `--color-sage` | `#e8f5ec` | `sage` | Light green tint — surfaces, pills, hover bgs |
| `--color-cream` | `#fdfaf5` | `cream` | Warm neutral |
| `--color-sand` | `#fdf5e6` | `sand` | Warm neutral (default hero card bg) |
| `--color-earth` | `#5c6b5e` | `earth` | Muted / secondary text |
| `--color-near-black` | `#1c2b20` | `near-black` | Body text (near-black green) |
| `--color-terracotta` | `#d47b5a` | `terracotta` | Warm accent |
| `--color-terracotta-dark` | `#823c22` | `terracotta-dark` | Dark warm accent |

> The HTML `<meta name="theme-color">` is `#1A4D2E` (`index.html` line 6).

### Financial Semantic Colors (`src/index.css` lines 25–29)

| Token | Hex | Usage |
|---|---|---|
| `--color-fin-green` | `#10b981` | Positive finance (emerald) |
| `--color-fin-red` | `#f43f5e` | Negative finance (rose) |
| `--color-fin-blue` | `#6366f1` | Valuation metrics (indigo) |
| `--color-fin-purple` | `#a78bfa` | Advanced ratios (violet) |
| `--color-fin-amber` | `#f59e0b` | Health / risk metrics (amber) |

### Tailwind Defaults Still in Use

For semantic / signal states the project leans on Tailwind's built-ins alongside the custom tokens:
- **Positive/gains:** `text-spring`, `text-emerald-600/700`, `bg-emerald-500/8`, `bg-spring/10`, `bg-emerald-100`
- **Negative/losses:** `text-red-500/600`, `text-rose-500/700`, `bg-red-500/10`, `bg-rose-50`, `bg-red-100`
- **Warning/neutral:** `text-amber-500/600/700`, `bg-amber-500/8`
- **Tooltip bg:** `bg-neutral-900/95`

### Dynamic / Data-Driven Palettes

- **`getAssetColor(ticker)`** (`src/utils/colors.ts` lines 3–44) — 40-color palette for per-stock charting (blue `#3B82F6`, emerald `#10B981`, amber `#F59E0B`, red `#EF4444`, violet `#8B5CF6`, …). Deterministic by ticker string.
- **`getPortfolioColor(name)`** (`src/utils/colors.ts` lines 53–71) — 10-color subset for portfolio identity dots.
- **Category/account colors** come from Supabase as `0xFFRRGGBB` strings, normalized via `formatHexColor()` (`src/utils/format.ts` lines 121–127) and applied as inline `style="background-color: …"` with `var(--color-forest)` fallback.

### Color Conventions

- **Opacity modulation is the dominant technique.** Brand colors are almost always applied with opacity: `forest/10`, `forest/5`, `sage/30`, `sage/50`, `spring/10`, `emerald-500/8`. This produces the soft, layered "premium" look.
- **Borders are always green-tinted, never pure gray/black:** `border border-forest/10`, `border border-forest/5`, `border-b border-forest/10`.
- **No dark mode.** Zero `dark:` utilities exist — the app is light-mode only.

---

## 2. Typography

### Fonts (loaded in `index.html` line 26)
- **Cormorant Garamond** — `ital,wght@0,400;0,500;0,600;0,700;1,400` — editorial serif for headings & big numerals
- **Outfit** — `wght@300;400;500;600;700` — clean sans for all UI / body text
- **Material Icons** font (line 27) — used via `<span class="material-icons">…</span>`

### Font Tokens (`src/index.css` lines 17–19)

| Token | Utility | Stack | Role |
|---|---|---|---|
| `--font-cormorant` | `font-cormorant` | `"Cormorant Garamond", serif` | Headings, hero numerals |
| `--font-cormorant-bold` | `font-cormorant-bold` | `"Cormorant Garamond", serif` + weight 900 | Extra-bold emphasis (custom `@utility`, line 233) |
| `--font-outfit` | `font-outfit` | `"Outfit", sans-serif` | Body / UI (default) |

### Base Rules (`src/index.css` lines 32–43)
- `body` defaults to `font-outfit`, `antialiased`, `text-near-black` on `bg-page-bg`.
- `h1`, `h2`, `h3`, and `.hero-numeral` automatically apply `font-cormorant font-bold`.

### Size Scale
No custom `fontSize` — uses Tailwind defaults + heavy arbitrary pixel values for micro-typography:
- **Display / hero numerals:** `text-7xl`, `text-5xl`, `text-[38px]`
- **Headings:** `text-3xl/4xl/2xl/xl/lg`
- **Body:** `text-sm`, `text-xs`
- **Micro-labels:** `text-[10px]`, `text-[9px]`, `text-[8px]` — a signature pattern

### Typographic Conventions
- **Uppercase micro-labels** are the signature UI text treatment:
  `text-[10px] font-bold text-earth uppercase tracking-widest`
- Tracking values in use: `tracking-widest`, `tracking-wider`, `tracking-tight`, `tracking-[0.15em]`, `tracking-[0.1em]`, `tracking-tighter`.
- **Big financial figures use Cormorant serif** (net worth, hero numbers) for an editorial/premium feel; **UI numbers use Outfit** with `font-bold` (700) or `font-black` (900).

---

## 3. Spacing, Radius & Shadows

### Spacing
No custom spacing scale — uses Tailwind v4 defaults (`p-4`, `p-6`, `p-8`, `gap-3/6`, `space-y-8`, …).

### Custom Tokens (`src/index.css` lines 21–22)
```css
--shadow-premium: 0 2px 20px rgba(26, 77, 46, 0.08);  /* green-tinted soft elevation */
--radius-premium: 18px;                                /* canonical card radius */
```

### Border Radius Conventions (very consistent)
- **Premium cards:** `rounded-premium` (18px) — `.premium-card`
- **Standard cards / inputs / buttons:** `rounded-xl` (12px) — overwhelmingly the most common
- **Large surfaces / slide-overs / modals:** `rounded-2xl` (16px) and `rounded-3xl` (24px)
- **Pills / badges / status dots:** `rounded-full`, `rounded-lg`, `rounded-md`

### Shadows
- **Signature:** `shadow-premium` (green-tinted soft shadow) on `.premium-card`.
- **Metric cards:** `shadow-[0_1px_12px_rgba(26,77,46,0.05)]` → hover `shadow-[0_4px_20px_rgba(26,77,46,0.1)]`.
- **Buttons / FAB / dropdowns:** Tailwind `shadow-2xl/xl/lg/md/sm`.

---

## 4. Component Classes & Patterns

### Reusable CSS Classes (`src/index.css`)
- **`.premium-card`** (lines 65–71) — the flagship card: `bg-card-bg rounded-premium border border-forest/10 shadow-premium`, hover → `shadow-sm`. Use this for almost every surface.
- **`.fin-metric-card`** (lines 99–106) — `bg-white/70 backdrop-blur-sm rounded-2xl border border-forest/8` with light green shadow; hover `scale-[1.02]`.
- **`.bento-grid`** (lines 58–63) — 12-col grid, `minmax(100px, auto)` rows, `1.5rem` gap — the Dashboard layout grid.
- **`.nav-link`** (lines 73–79) — sidebar nav item: `flex items-center gap-3 px-4 py-3 rounded-xl text-earth hover:bg-sage/50 hover:text-forest transition-all`; `.nav-link.active` → `bg-sage text-forest font-semibold`.
- **`.hero-swiper` / `.hero-slide`** (lines 82–97) — horizontal scroll-snap carousel.
- **`.ios-switch` / `.ios-switch-thumb`** (lines 209–231) — iOS-style toggle.
- **`.sticky-header`** (lines 336–340) — `position: sticky` + `backdrop-filter: blur(12px)`.

### UI Library
- **No component library.** All components are hand-built with Tailwind utilities.
- `@suid/material` is installed but used **only for icons** (`@suid/icons-material/*`: `Add`, `Close`, `DashboardOutlined`, `ReceiptLongOutlined`, …).
- Material Icons **font** is also used directly: `<span class="material-icons">eco</span>`, `chevron_left`, `expand_more`, `schedule`, `sync`.
- **ApexCharts** (`solid-apexcharts`) for all data viz; global tooltip overrides in `index.css` lines 110–116.

### Component Patterns

**Cards** — `.premium-card` is the universal container. Many add subtle green gradients: `bg-gradient-to-br from-white via-sage/5 to-sage/10` (StockHero), `bg-gradient-to-b from-white to-sage/5` (MetricsCard).

**Buttons**
- Primary: `bg-forest text-white hover:bg-mid-green rounded-xl font-outfit font-bold` with `hover:-translate-y-1` lift.
- Secondary/ghost: `text-earth hover:bg-sage/50 text-forest transition-colors`.
- Pill/chip: `px-3 py-1.5 bg-sage/40 border-forest/10 rounded-full text-[10px] font-bold uppercase`.
- Icon button: `w-9 h-9 rounded-xl hover:bg-sage/50 flex items-center justify-center text-forest border border-forest/5`.

**Global FAB** (`App.tsx`) — `w-16 h-16 bg-spring text-white rounded-full shadow-2xl` bottom-right; icon rotates 90° on hover. Hidden on stock/portfolio/dividend pages.

**Segmented toggles** — `flex p-1 bg-page-bg rounded-2xl`, selected = `bg-white shadow-md` (e.g. currency toggle, expense type toggle).

**Inputs** — `bg-page-bg rounded-xl border border-forest/5 font-outfit focus:outline-none focus:ring-2 focus:ring-forest/10`. Large amount input uses underline style: `border-b-2 border-sage/30 focus:border-forest text-5xl`.

**Modals** — centered `fixed inset-0 z-50 flex items-center justify-center bg-forest/40` backdrop with `bg-white rounded-3xl p-8 shadow-2xl` panel; `<Show when={isOpen}>` wrapper; `stopPropagation` on inner panel; some have a colored top accent line (`h-1 bg-forest`).

**Slide-overs** (`AddExpenseSlideOver`) — right-anchored `w-full max-w-[420px] h-screen bg-white`, `translate3d(100%,0,0)` ↔ `translate3d(0,0,0)` with `transition-transform duration-300 ease-out`, `bg-forest/40` backdrop.

**Tooltips** (`components/modules/Tooltip.tsx`) — custom, 2s hover delay, `bg-neutral-900/95 backdrop-blur-md text-white text-xs rounded-xl`, four positions with CSS-border arrows.

**Metric rows** (`MetricsCard`) — colored dot + label + value + good/bad/neutral signal badge, whole row wrapped in a `Tooltip`; verdict logic in `src/utils/metricEvaluator.ts`.

**Status indicators** — market session dots: `w-2 h-2 rounded-full animate-pulse-soft` with semantic color.

**Empty / loading states** — `bg-page-bg rounded-2xl animate-pulse` placeholders; spinner: `border-2 border-forest/20 border-t-forest rounded-full animate-spin`.

### Layout (`MainLayout.tsx`)
Fixed three-region desktop layout:
- **Left:** `Sidebar` — `w-[220px]`, white bg, `border-r border-forest/10`
- **Center:** `TopBar` (h-20) + scrollable `<main class="p-6">` with `max-w-[1400px] mx-auto`
- **Right:** `InsightsSidebar` — collapsible, animates `w-[280px]` ↔ `w-0` via `transition-all duration-300`

---

## 5. Animations & Motion

Custom keyframes in `src/index.css`:

| Keyframe | Class | Use |
|---|---|---|
| `fadeInUp` (119) | `.animate-fade-in-up` | Page entry (0.5s, opacity + translateY 12px → 0) |
| `spin-slow` (134) | `.animate-spin-slow` | 8s linear rotation |
| `slideDown` (147) | `.animate-slide-down` | Dropdown reveal (max-height) |
| `pulse-soft` (165) | `.animate-pulse-soft` | Market-status dots (2s, scale 1↔1.2) |
| `ellipsis` (181) | `.animate-ellipsis::after` | "Loading" dots |
| `slideInRight` (238) | `.animate-slide-in-right` | Slide-over entry (cubic-bezier 0.16,1,0.3,1) |
| `bellRing` (253) | `.animate-bell-ring` | Notification bell wiggle |

- **Staggered entry:** `.stagger-1` … `.stagger-5` (lines 330–334) — 0.05s incremental delays for list sequences.
- **Transitions:** `transition-all/colors/transform`, durations `duration-100/200/300/500/700/1000`, default `ease-out`.
- **Hover lift pattern:** `hover:-translate-y-1`, `hover:scale-110`, `group-hover:scale-110`, `scale-[1.02]`.

---

## 6. Styling Conventions

- **Glassmorphism:** `backdrop-blur-sm/md` + `backdrop-filter: blur(12px)` for sticky headers and overlays.
- **Subtle green gradients:** `from-white via-sage/5 to-sage/10`, decorative blurred circles `bg-forest/5 rounded-full blur-3xl`.
- **Responsive:** desktop-first; only `lg:` is used (3 occurrences in `StockHero`). `sm/md/xl/2xl` unused.
- **Naming:** components grouped by screen under `components/screen-*` / `components/scren-markets` (note: existing folder typo "scren"); shared layout in `components/layout/`, widgets in `components/modules/`; modals in `modals/` subfolders.
- **State:** UI state in a Solid `createStore` (`src/store/index.ts`), persisted to `localStorage` under `finly_zen_state_v2`.
- **Currency:** dual IDR (default) / USD with live-ish rate (default 17400); formatters in `src/utils/format.ts` (`formatRupiah`, `formatRupiahShort` → "Rp1,5jt", `formatUSD`, `formatUSDCompact` → "$1.23M", `formatPercent` with `+`, `formatMultiple` → "2.34x"). Indonesian locale `id-ID`.

---

## 7. Key File Reference

| File | Why it matters |
|---|---|
| `src/index.css` | **THE design system** — `@theme` tokens, base styles, component classes, all keyframes |
| `index.html` | Font imports (line 26), Material Icons (27), theme-color meta (6) |
| `package.json` | Dependency list (lines 14–32) |
| `vite.config.ts` | Tailwind v4 Vite plugin setup |
| `src/utils/colors.ts` | `getAssetColor` (40-color) + `getPortfolioColor` (10-color) palettes |
| `src/utils/format.ts` | `formatHexColor` + all currency/number formatters |
| `src/utils/metricEvaluator.ts` | Good/neutral/bad metric signal logic |
| `src/components/layout/MainLayout.tsx` | Three-region layout reference |
| `src/components/layout/Sidebar.tsx` | `.nav-link` usage, brand logo |
| `src/components/layout/TopBar.tsx` | Pills, segmented toggles, status dots, dropdowns |
| `src/components/screen-dashboard/HeroCard.tsx` | `.premium-card`, `.hero-swiper`, Cormorant numerals, gradient overlays |
| `src/components/screen-dashboard/modules/AddExpenseSlideOver.tsx` | Slide-over + form input + segmented toggle patterns |
| `src/components/screen-portfolio/modals/CreatePortfolioModal.tsx` | Modal pattern with accent top-line |
| `src/components/scren-markets/MetricsCard.tsx` | Financial semantic colors + good/bad/neutral signals + tooltips |
| `src/components/scren-markets/StockHero.tsx` | Gradient hero card, status badges, chips (only `lg:` usage) |
| `src/components/modules/Tooltip.tsx` | Shared tooltip widget |
| `src/pages/Dashboard.tsx` | `.bento-grid` composition |
| `src/store/index.ts` | UI state shape (lines 24–32), localStorage persistence |

---

## 8. Quick Start for New Screens

1. Wrap content in `.premium-card` (or `.fin-metric-card` for metric tiles).
2. Use `font-cormorant` for hero numerals / section headings; `font-outfit` everywhere else.
3. Label sections with the uppercase micro-label pattern: `text-[10px] font-bold text-earth uppercase tracking-widest`.
4. Borders: `border border-forest/10` (never pure gray). Shadows: `shadow-premium` on cards.
5. Positive/negative values: `text-emerald-600` / `text-rose-500` (or `fin-green`/`fin-red` in market screens).
6. Enter the page with `.animate-fade-in-up`; stagger children with `.stagger-1` … `.stagger-5`.
7. Primary actions: `bg-forest text-white hover:bg-mid-green rounded-xl`; secondary: `text-forest hover:bg-sage/50`.
8. Modals: `bg-forest/40` backdrop + `bg-white rounded-3xl p-8 shadow-2xl` panel.
