-- Read-only. Run after each repair. One result row contains all checks.
select jsonb_build_object(
  'unindexed_foreign_keys',coalesce((
    select jsonb_agg(jsonb_build_object('table',fk.conrelid::regclass::text,'constraint',fk.conname))
    from pg_constraint fk
    where fk.contype='f' and fk.connamespace='public'::regnamespace
      and not exists (
      select 1
      from pg_index i
      join pg_class ix on ix.oid=i.indexrelid
      join pg_am am on am.oid=ix.relam
      where i.indrelid=fk.conrelid
        and i.indisvalid and i.indisready and i.indislive
        and i.indpred is null and am.amname='btree'
        and i.indnkeyatts>=cardinality(fk.conkey)
        and fk.conkey <@ (i.indkey::smallint[])[0:cardinality(fk.conkey)-1]
    )
  ),'[]'::jsonb),
  'invalid_public_indexes',coalesce((
    select jsonb_agg(i.indexrelid::regclass::text)
    from pg_index i join pg_class t on t.oid=i.indrelid
    where t.relnamespace='public'::regnamespace and not i.indisvalid
  ),'[]'::jsonb),
  'tables_without_rls',coalesce((
    select jsonb_agg(c.relname order by c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity
  ),'[]'::jsonb),
  'view_security',(
    select jsonb_agg(jsonb_build_object('name',c.relname,'options',c.reloptions,
      'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
      'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT')))
    from pg_class c where c.oid in ('public.view_transactions_detailed'::regclass,'public.portfolio_holdings'::regclass)
  ),
  'views_referencing_auth_users',coalesce((
    select jsonb_agg(v.viewname) from pg_views v where v.schemaname='public' and v.definition like '%auth.users%'
  ),'[]'::jsonb),
  'client_truncate_grants',coalesce((
    select jsonb_agg(jsonb_build_object('table',c.relname,'role',r.role_name))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join (values('anon'),('authenticated')) r(role_name)
    where n.nspname='public' and c.relkind in ('r','p')
      and has_table_privilege(r.role_name,c.oid,'TRUNCATE')
  ),'[]'::jsonb),
  'asset_price_writable_by_client',has_column_privilege('authenticated','public.assets','current_price','UPDATE'),
  'journal_unassigned',(select count(*) from public.trading_journal where user_id is null),
  'functions',(
    select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
      'security_definer',p.prosecdef,'configuration',p.proconfig,
      'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) order by p.proname)
    from pg_proc p where p.pronamespace='public'::regnamespace
      and p.prokind='f' and not exists(
        select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e'
      )
  )
) as security_verification;
