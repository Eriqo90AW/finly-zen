---
name: Finly Zen
description: Premium Zen Garden personal finance & IDX investment design system
colors:
  primary: "#1a4d2e"
  secondary: "#2d7d46"
  accent: "#52c278"
  sage: "#e8f5ec"
  sand: "#fdf5e6"
  earth: "#5c6b5e"
  near-black: "#1c2b20"
  page-bg: "#f0f7f2"
  card-bg: "#ffffff"
  fin-green: "#10b981"
  fin-red: "#f43f5e"
  fin-blue: "#6366f1"
  fin-purple: "#a78bfa"
  fin-amber: "#f59e0b"
typography:
  display:
    fontFamily: "Cormorant Garamond, serif"
    fontSize: "clamp(2rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: "1.1"
  headline:
    fontFamily: "Cormorant Garamond, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: "1.2"
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.4"
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  card: "18px"
  lg: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-premium:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.card}"
    padding: "24px"
---

# Design System: Finly Zen

## Overview

**Creative North Star: "The Editorial Sanctuary"**

Finly Zen is designed as a serene, high-craft financial ledger. Inspired by editorial publishing and Japanese zen gardens, it pairs structured financial data with organic forest greens, pale mint surfaces, soft ambient elevation, and timeless serif typography. The environment eliminates visual anxiety, turning financial tracking and stock analysis into a calm, focused ritual.

The visual language relies on subtle opacity layering rather than heavy contrasts or harsh divides. Textures feel paper-like and tactile (`#f0f7f2` page backdrop with `#ffffff` cards). Green tinting is present on every line, divider, and hover state, creating a cohesive aesthetic signature across all screens.

**Key Characteristics:**
- Light-mode only design architecture (no dark mode).
- Dual typography model: Cormorant Garamond for editorial numerals and titles; Outfit for clean UI labels and body text.
- Opacity modulation (`forest/10`, `sage/50`, `spring/10`) for depth and subtle interaction states.
- Micro-typography signatures: uppercase tracking-widest labels (`text-[10px] font-bold text-earth uppercase`).
- Green-tinted soft elevation (`shadow-premium`) and thin translucent borders (`border-forest/10`).

## Colors

The palette is anchored in forest greens, pale mint tints, and soft earthy neutrals, punctuated by distinct semantic financial signal colors for gains and losses.

### Primary
- **Forest Green** (`#1a4d2e`): Primary brand color for headers, main call-to-action buttons, active navigation, and brand anchor points.

### Secondary
- **Mid Green** (`#2d7d46`): Secondary brand green for interactive hover states, primary button hover fills, and active highlight states.

### Tertiary
- **Spring Accent** (`#52c278`): Bright accent green used on Floating Action Buttons (FAB), positive metric pill indicators, and key focus callouts.

### Neutral
- **Page Mint Background** (`#f0f7f2`): Soft, pale mint canvas that reduces eye strain compared to stark white backgrounds.
- **Card Surface** (`#ffffff`): Pure white elevated card surfaces providing crisp contrast for text and charts.
- **Sage Tint** (`#e8f5ec`): Very light green surface fill for table headers, chip pills, hover backgrounds, and container accents.
- **Sand Warm Neutral** (`#fdf5e6`): Warm cream neutral used for hero card backgrounds and editorial highlight blocks.
- **Earth Muted Text** (`#5c6b5e`): Muted secondary body text and metadata label color.
- **Near Black Body Text** (`#1c2b20`): Primary high-contrast body and heading text color.

### Financial Signals
- **Positive Gain / Emerald** (`#10b981`): Portfolio profits, positive ROI, and budget surplus.
- **Negative Loss / Rose** (`#f43f5e`): Portfolio drawdown, expenses, and budget overruns.
- **Valuation Blue** (`#6366f1`): Price-to-earnings ratios, valuation multiples, and benchmark comparison overlays.
- **Ratios Purple** (`#a78bfa`): Dividend payout ratios and financial health indicators.
- **Risk Amber** (`#f59e0b`): Warning states, volatile market indicators, and pending transaction statuses.

### Named Rules
**The Rarity Rule.** Primary forest green is used deliberately on ≤15% of screen real estate. Its quiet authority depends on not saturating the user's field of view.

**The Green Border Rule.** Borders are never pure gray (`#e5e7eb`). All borders use translucent green tinting (`border border-forest/10` or `border border-forest/5`).

## Typography

**Display Font:** Cormorant Garamond (editorial serif for hero numerals and main headers)
**Body Font:** Outfit (clean, modern sans-serif for UI labels, tables, and controls)

**Character:** The pairing couples classical financial publication warmth with modern, legible application interface typography.

### Hierarchy
- **Display** (Bold 700, `clamp(2rem, 5vw, 4.5rem)`, line-height 1.1): Used for hero financial totals, net worth metrics, and main dashboard hero numbers.
- **Headline** (Bold 700, `2rem` / `text-3xl`, line-height 1.2): Section titles and page headers.
- **Title** (SemiBold 600, `1.25rem` / `text-xl`, line-height 1.4): Card headers, module titles, and modal headers.
- **Body** (Regular 400, `0.875rem` / `text-sm`, line-height 1.5): Standard UI text, table rows, and description copy.
- **Label** (Bold 700, `0.625rem` / `text-[10px]`, letter-spacing 0.1em, uppercase): Section sub-headers, pill labels, table header titles, and category tags.

### Named Rules
**The Editorial Numeral Rule.** Financial summary totals and net worth displays use Cormorant Garamond (`font-cormorant font-bold`). Operational UI numbers (inputs, table line items) use Outfit (`font-outfit`).

**The Micro-Label Rule.** Metadata tags and section labels must be formatted as uppercase micro-labels (`text-[10px] font-bold text-earth uppercase tracking-widest`).

## Layout

Finly Zen uses a fixed, three-region desktop layout designed for wide screen monitoring.

- **Sidebar (Left):** Fixed `220px` width with white background, `border-r border-forest/10`, brand logo top, and vertical navigation list.
- **Main View (Center):** Top bar (`80px` height with `backdrop-filter: blur(12px)` sticky header) + main scroll container with `max-w-[1400px]` centered content canvas.
- **Insights Sidebar (Right):** Collapsible right pane (`w-[280px]` ↔ `w-0` smooth 300ms transition) for quick stats, notifications, and AI insights.
- **Grid Layout:** 12-column bento grid (`.bento-grid`) with `1.5rem` (`24px`) grid gaps for dashboard widget composition.

## Elevation & Depth

Depth is established through soft, green-tinted ambient shadows and subtle backdrop blurs rather than stark black shadows.

### Shadow Vocabulary
- **Premium Card Elevation** (`box-shadow: 0 2px 20px rgba(26, 77, 46, 0.08)`): Canonical soft elevation on resting cards (`.premium-card`).
- **Card Hover Elevation** (`box-shadow: 0 4px 20px rgba(26, 77, 46, 0.12)`): Smooth lift response on card hover.
- **Dropdown & Modal Elevation** (`box-shadow: 0 20px 40px rgba(26, 77, 46, 0.15)`): High depth for popovers, slide-overs, and floating dialogs.

### Named Rules
**The Layered Surface Rule.** Cards rest flat on `#f0f7f2` mint background with thin `border-forest/10` borders and `shadow-premium` depth. Floating popovers use `backdrop-blur-md` for visual layering.

## Shapes

- **Card Radius:** `18px` (`rounded-premium` / `rounded-[18px]`) — canonical container radius.
- **Button & Input Radius:** `12px` (`rounded-xl`) — standard interactive element radius.
- **Modal & Slide-over Radius:** `24px` (`rounded-3xl`) — large dialog container radius.
- **Status Pills & FAB:** `9999px` (`rounded-full`) — status indicators, tag badges, and floating action button.

## Components

### Buttons
- **Shape:** Soft rounded rectangle (`12px` / `rounded-xl`).
- **Primary:** `bg-forest text-white hover:bg-mid-green font-outfit font-bold px-6 py-3 transition-all duration-200 hover:-translate-y-0.5`.
- **Ghost / Secondary:** `text-forest bg-transparent hover:bg-sage/50 font-outfit font-medium px-4 py-2 transition-colors`.
- **Pill Chip:** `bg-sage/40 text-forest border border-forest/10 rounded-full px-3 py-1 text-[10px] font-bold uppercase`.

### Cards / Containers
- **Corner Style:** `18px` (`rounded-premium`).
- **Background:** White (`#ffffff`) with optional gradient accent (`bg-gradient-to-br from-white via-sage/5 to-sage/10`).
- **Border:** Translucent green (`border border-forest/10`).
- **Shadow:** Soft ambient green shadow (`shadow-premium`).
- **Internal Padding:** `1.5rem` (`24px` / `p-6`).

### Inputs / Fields
- **Style:** Light mint background (`bg-page-bg`), `12px` radius (`rounded-xl`), `border border-forest/10`.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest`.
- **Amount Underline Field:** Ultra-large monetary inputs use a clean underline border (`border-b-2 border-sage/40 focus:border-forest text-4xl font-cormorant`).

### Navigation
- **Sidebar Links:** `flex items-center gap-3 px-4 py-3 rounded-xl text-earth hover:bg-sage/50 hover:text-forest transition-all`.
- **Active State:** `bg-sage text-forest font-semibold shadow-sm`.

## Do's and Don'ts

### Do:
- **Do** use `Cormorant Garamond` for major financial numerals, net worth headers, and editorial titles.
- **Do** apply opacity modulation (`forest/10`, `sage/50`) for subtle borders, hover fills, and surface tints.
- **Do** format section labels as uppercase micro-typography (`text-[10px] font-bold text-earth uppercase tracking-widest`).
- **Do** wrap primary screen modules in `.premium-card` (`bg-card-bg rounded-premium border border-forest/10 shadow-premium`).

### Don't:
- **Don't** introduce dark mode styles, dark background utilities, or pure black backgrounds.
- **Don't** use pure gray borders (`border-gray-200` or `#e5e7eb`); always use translucent green tinting (`border-forest/10`).
- **Don't** clutter screens with dense action buttons; keep primary actions limited and prioritized.
- **Don't** break the dual font hierarchy by using sans-serif for hero numbers or serif for micro UI labels.
