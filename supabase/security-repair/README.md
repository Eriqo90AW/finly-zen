# Supabase security repair

Prepared for Expense Tracker, project ltjpsxlnxpjivoxgmmxn, from the supplied schema export and this app's source.
These are manually run repair scripts, outside migrations. No production connection was used and no production changes were applied.

## Run order

1. Take a database backup or confirm an available restore point. Test in a staging copy with the real schema, triggers and integrations first.
2. Open 01-core-security.sql, copy the complete file into the project's Supabase SQL Editor, and run as postgres.
3. Test the production app flows listed below, then run 03-verify.sql and refresh Security Advisor.
4. Use 00-check-journal-ownership.sql to identify your account UUID and review the 74 unassigned trades privately.
5. Only if all 74 are confirmed to belong to that account, replace `confirmed_owner uuid := NULL;` in 02-trading-journal.sql with `confirmed_owner uuid := 'CONFIRMED-UUID'::uuid;`. Run the full file. If the records have multiple owners, do not use that bulk assignment: prepare an explicit per-record mapping.
6. Run 03-verify.sql again and refresh Security Advisor.

The 01 and 02 repairs each commit atomically. A lock timeout, preflight error, or other failure prevents its changes from committing. If the editor leaves a failed transaction open, run ROLLBACK before retrying the complete file. Do not remove guards or run fragments to bypass errors. Journal changes are a separate transaction; until step 5 succeeds, that table retains its original exposure.

## What 01 changes

- Enables RLS on all 16 non-journal public tables from the export and replaces their policies with explicit authenticated ownership rules. Budget/savings policies use `(select auth.uid())` to avoid per-row auth helper calls.
- Keeps shared categories readable by signed-in users while denying clients writes to shared categories.
- Keeps transaction INSERT amount validation at >0 and <=100,000,000,000, and UPDATE validation at >0. Adds checks that account/category references are owned or explicitly shared.
- Provides portfolio transaction SELECT/INSERT/UPDATE/DELETE through an owned portfolio. The old export lacked UPDATE/DELETE policies, which would have broken thesis editing and asset removal if merely enabled.
- Prevents cross-portfolio linked transactions whose cascading foreign key could otherwise delete another portfolio's ledger records.
- Restricts audit logs to own-row SELECT/INSERT and contributions to own-row SELECT. Service-role grants and BYPASSRLS remain unchanged.
- Replaces the detailed transaction view without auth.users; retains its column names, types and order. The five unused profile columns return NULL. Both views use security_invoker=true, and client access to them requires authentication.
- Preserves authenticated asset upserts for ticker,name,type,industry,sector,logo_url,updated_at. Anonymous catalog reads remain public. Denies client price writes, created_at overrides, asset deletion, and ticker renaming.
- Pins search_path to empty for the 12 reviewed exported functions, removes anonymous execution, removes direct authenticated execution of trigger functions, and explicitly preserves authenticated execution of app RPCs. Trigger execution still works.
- Makes get_ai_spending_summary SECURITY INVOKER. Keeps its existing output calculation; its existing repeated category aggregation is outside this repair.
- Corrects water_savings_goal to select/create an owned Savings category instead of inserting NULL into the required category_id field. Preserves ownership checks, the request ID lock and retry behavior.
- Revokes client CREATE privileges on the public schema.

## Intentional remaining access

`assets` is a shared market catalog with no owner column. To keep the current frontend running, signed-in users can still edit shared metadata. It is not safe to treat that metadata as verified market data. Fully trusted metadata updates require moving the current browser upsert behind a trusted server that obtains and validates the market response. This SQL does not make that architectural change or claim to eliminate metadata tampering.

`water_savings_goal` intentionally remains SECURITY DEFINER and executable by authenticated users. It validates the caller's ownership of both the account and goal. Its elevated privilege is required to create a contribution while direct client contribution writes stay forbidden. A signed-in SECURITY DEFINER Advisor warning may remain and needs documented review rather than removal of the required grant. The privileged signup and savings-protection trigger functions retain SECURITY DEFINER, but client EXECUTE grants are removed.

Leaked-password protection is an Auth setting, not SQL. Enable it in Authentication password settings if available on the project's plan. Other Advisor findings hidden behind 'show more' were not supplied and are not claimed fixed.

## Journal ownership

The export contains 74 journal rows with user_id=NULL. Their owner cannot be inferred from the frontend fallback UUID or from being the person currently viewing the dashboard. 00 lists account IDs/emails and those records' dates, tickers and notes so the original importer can recognize them. Do not share the exported private records unnecessarily.

02 refuses to run with unassigned rows unless an existing confirmed owner is supplied and exactly 74 unassigned rows remain. After assignment it sets user_id NOT NULL, defaults new rows to auth.uid(), enables RLS and allows only own-row CRUD. The frontend's legacy NULL-row claim then becomes a harmless zero-row operation. If ownership is unknown, keep 02 pending. The table remains exposed until 02 or a separately authorized quarantine policy is applied.

## Verification and limits

49 security checks and 23 foreign-key index checks passed using PGlite, an isolated PostgreSQL WASM runtime, on a reconstructed schema from the supplied export. Tests cover anonymous denial; two-user isolation; expense CRUD and ownership/amount checks; portfolio thesis editing, deletion/cascades and forbidden links; frontend-shaped asset upserts and forbidden price/delete/rename actions; budget and savings RPCs; idempotence; revoked trigger execution permissions; service-role access; journal ownership guards and assignment; and repeat application.

The fixture includes exported columns, defaults, foreign keys, policies and function bodies. Enum labels and primary/unique keys were reconstructed from app usage and repository migrations because the export did not include their complete definitions. The original detailed view is modeled with its exported layout/types and auth.users dependency; the resulting replacement view is executed in full. These tests do not verify hosted PostgREST privilege handling, production-specific constraints/triggers/indexes, external Edge Functions, Realtime, OAuth, or load/lock behavior. No frontend files were changed.

The 01 and 02 scripts use 3-second lock and 30-second statement timeouts. Their transactions can still briefly block concurrent requests while acquiring/changing relation metadata. A zero-disruption production guarantee requires staging/API validation and an appropriate rollout window.

With two test logins, verify login/signup, account and category loading, expense creation/edit/deletion, transfers, portfolio creation/deposit/trade/thesis edit/asset deletion, bucket/budget saves, savings creation/contribution/retry, and journal reads/writes after 02. Try direct API requests with another user's IDs as well as normal UI requests. SQL Editor results under postgres bypass RLS and do not substitute for these checks.

03 should show no unprotected tables after both scripts, both views with security_invoker=true, no view referencing auth.users, no client TRUNCATE grants, client price UPDATE=false, journal_unassigned=0, anonymous function EXECUTE=false, and authenticated trigger EXECUTE=false. Authenticated app RPC execution should remain true.

## Reproduce the isolated checks

The test package is independent of the app. From the repository directory:

```powershell
npm.cmd --prefix supabase/security-repair/tests install --no-audit --no-fund
npm.cmd --prefix supabase/security-repair/tests test
```

This starts no server and makes no Supabase connections. It needs Node.js and access to npm to install the pinned test dependency.


## Foreign-key index warnings

These are performance findings. 04-foreign-key-indexes.sql is a read-only command generator for all public foreign keys, including the screenshot's money bucket, portfolio, savings contribution, savings goal and transaction tables. It can run independently of the security and journal ownership repairs.

1. Run the complete 04 SELECT in Supabase SQL Editor.
2. For every READY row, copy its create_index_sql value and run that single CREATE INDEX CONCURRENTLY statement in its own editor execution. Do not submit multiple commands as one batch and do not put them inside BEGIN/COMMIT, a DO block, a function, or an automatic transactional migration. Concurrent index creation cannot run in a transaction block.
3. Rerun 04 after completing the commands. Zero rows means all public foreign keys have a valid, ready, full B-tree index whose leading key columns cover that foreign key. Then run 03; unindexed_foreign_keys should be [] and invalid_public_indexes should be []. Refresh Performance Advisor.

The generator recognizes suitable indexes regardless of name, including primary/unique indexes and longer indexes with the correct leading columns. It does not count included-only columns, trailing-only matches, partial indexes, unusable indexes or unrelated indexes with the generated name. It emits REVIEW_EXISTING_NAME and an inspection query for a name collision or leftover invalid index, rather than pretending IF NOT EXISTS fixed it. Review that object before changing it; do not drop an existing index blindly. Partitioned tables receive REVIEW_PARTITIONED_TABLE and require a per-partition rollout instead of an unsupported concurrent parent build.

Run commands sequentially. Concurrent builds allow normal INSERT/UPDATE/DELETE operations to continue, but still consume CPU/I/O and can wait for active transactions. Run during a quieter period and use a client with a sufficient statement timeout for larger tables. If a build fails or times out, rerun the generator and inspect any REVIEW_EXISTING_NAME result. There is no automatic deletion of a failed index.

This adds non-unique supporting indexes only. It does not change row contents, policies, constraints, app queries, or ownership. Indexes add storage and ongoing write-maintenance cost. No production index builds have been performed by this task.

Reference: https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY

