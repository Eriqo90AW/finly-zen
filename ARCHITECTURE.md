# Architecture

This application is a client-side SolidJS + TypeScript + Vite SPA styled with Tailwind CSS v4 and backed by Supabase.

## Layer Model

Code is organized into four downward-only layers:

```
app      (src/index.tsx, src/App.tsx, src/context/, src/components/layout/)
  -> pages    (src/pages/, thin lazy-loaded route entrypoints)
    -> features (src/features/<domain>/, vertical domain slices with an index.ts barrel)
      -> foundation (src/components/common/, src/data/, src/store/, src/lib/, src/services/, src/utils/, src/types/, src/config/)
```

### Dependency Rules

Enforced mechanically by `.dependency-cruiser.cjs`:

- **Downward isolation:** Low-level shared modules (`src/utils/`, `src/types/`, `src/config/`, and reserved `src/shared/`) cannot import from UI, stores, or features.
- **Feature encapsulation:** External consumers and sibling features must import a domain only through `src/features/<domain>/index.ts`, never through internal file paths.
- **Database boundary:** UI modules (`src/components/`, `src/pages/`, and feature UI/hooks) cannot import `src/lib/supabase.ts` directly. Database queries live in `src/data/`, `src/store/`, or `src/features/<domain>/data/`.
- **Acyclic graph:** Circular dependencies are forbidden across `src/`. Keep pure session/auth primitives (`src/lib/userSession.ts`) separate from higher-level context assemblers so data and store modules stay acyclic.

## Where to Find Things (Sources of Truth)

Rather than duplicating lists that drift over time, inspect these files directly:

- **Routes & code-splitting:** `src/index.tsx` (routes are lazy-loaded via Solid `lazy()` with `<Suspense>` boundaries in `src/App.tsx`).
- **Feature domains:** Folders under `src/features/` (each exposes its public surface through `index.ts`).
- **Design tokens & theme:** `@theme` block in `src/index.css`.
- **Build & vendor chunking:** `vite.config.ts`.
- **Scripts & verification pipeline:** `package.json`.
- **Static analysis & boundaries:** `tsconfig.json`, `biome.json`, `.dependency-cruiser.cjs`, `knip.json`.

## Data Flow & External Boundaries

- **Server data:** Domain reads and writes go through repository modules in `src/data/` (or `src/features/<domain>/data/`) and reactive Solid stores in `src/store/`.
- **Client persistence:** Browser `localStorage` state is hydrated defensively; untrusted payloads at storage, API, and AI tool boundaries should be validated with Zod `.safeParse()` schemas (see `src/lib/validation.ts`).
- **Heavy optional capabilities:** Large browser-only dependencies (such as charts and OCR) should stay code-split or dynamically imported so they do not bloat the initial bundle.
- **AI / tool workflows:** Tool payloads under `src/services/intelligence/` are schema-validated before execution, and state-mutating actions go through explicit user confirmation rather than silent writes.

## Automated Guardrails

Run `pnpm check` and `pnpm build` to verify all gates together:

- **TypeScript (`pnpm typecheck`):** Strict type checking (`tsconfig.json`).
- **Biome (`pnpm lint`, `pnpm format`):** SolidJS correctness rules, no explicit `any`, and Tailwind v4 CSS support (`biome.json`).
- **Dependency Cruiser (`pnpm check:arch`):** Layer boundaries, feature public APIs, database isolation, and zero circular imports (`.dependency-cruiser.cjs`).
- **Knip (`pnpm check:dead`):** Detects orphan files, unused dependencies, and unresolved imports (`knip.json`).
- **Vitest (`pnpm test:run`):** Unit and component test suite (`vitest.config.ts`).
