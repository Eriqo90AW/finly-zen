# Agent Guidelines

Follow these rules whenever you read, edit, or add code in this repository.

## Tooling & Verification

- Use `pnpm` only (`package.json` enforces `only-allow pnpm`).
- Before finishing any change, run `pnpm check` and `pnpm build`. Check `package.json` for individual diagnostic scripts (`typecheck`, `lint`, `check:arch`, `check:dead`, `test:run`, `format`).
- Do not bypass lint, typecheck, or architecture rules with `any` casts or ignore comments.

## SolidJS Rules

This app uses SolidJS (`solid-js`), not React. React patterns silently break fine-grained reactivity.

- Never destructure component props. Access `props.foo` inside JSX, memos, or effects, or use `splitProps` / `mergeProps`.
- Never use React-specific JSX attributes (`className`, `htmlFor`, React synthetic events). Use `class`, `classList`, `for`, and native DOM events.
- Use `<For>` and `<Show>` for JSX control flow instead of `.map()` inside templates. Use Solid primitives (`createSignal`, `createMemo`, `createEffect`, `createResource`, `onMount`, `onCleanup`).
- Update Solid stores only through their setters (`setState` / `produce` / `reconcile`).

## Styling

- Styling uses Tailwind CSS v4 with CSS-first `@theme` tokens defined in `src/index.css`.
- Reuse the palette, typography, and surface tokens in `src/index.css` instead of hardcoding colors or font families.

## Architecture & Boundaries

- Organize product domains as vertical slices under `src/features/<domain>/`, exposing a single public barrel at `src/features/<domain>/index.ts`. Never deep-import internal files across features.
- Keep `src/pages/` as thin route entrypoints lazy-loaded from `src/index.tsx`.
- Keep UI layers (`src/components/`, `src/pages/`, and feature UI/hooks) decoupled from direct database clients. Route Supabase access through `src/data/`, `src/store/`, or `src/features/<domain>/data/`.
- Keep low-level modules (`src/utils/`, `src/types/`, `src/config/`, and reserved `src/shared/`) isolated from UI, stores, and features.
- Keep files concise (aim for a ~300-line soft ceiling). Split helpers, state hooks, and subcomponents into sibling modules before files grow monolithic.
- Validate untrusted external inputs (persisted `localStorage` JSON, API payloads, AI tool arguments) with Zod `.safeParse()` schemas. In Zod v4, `z.record(keySchema, valueSchema)` requires two arguments.

## Testing

- Place unit and component tests beside the module they cover (`*.test.ts` / `*.test.tsx`) or under `src/test/`.
- When changing business logic, data mappers, validation schemas, or AI tool pipelines, add or update targeted unit tests alongside the change.
