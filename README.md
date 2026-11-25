# Finly Zen

Finly Zen is a Solid and Vite app for tracking personal finances, investments, and savings.

## Local development

Use Node.js 22.12 or later and pnpm. The project pins pnpm in `package.json` and requires it for dependency installation.

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
cp .env.example .env
```

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` for your Supabase project. The example file lists the optional settings.

```bash
pnpm dev
```

Open [http://localhost:3077](http://localhost:3077). If the Corepack shim cannot be enabled on your machine, you can run the same commands through `corepack pnpm`.

## Checks and build

```bash
pnpm test:run
pnpm build
pnpm serve
```

The test suite runs with placeholder Supabase settings and does not require a live database.

## Deployment

Apply the SQL migrations in `supabase/migrations` to your Supabase project before deploying the corresponding frontend. The ledger and setup changes require `20261125000000_ledger_and_setup.sql`.

Build with `pnpm build` and publish `dist/` to a static host. Configure the host to serve `index.html` for app routes such as `/reports` and `/payday-planner`.
