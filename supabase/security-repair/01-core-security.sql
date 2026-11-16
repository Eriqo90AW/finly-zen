-- Run as postgres in the Supabase SQL Editor. This is NOT an automatic migration.
-- Review README.md first. Trading journal is handled separately in 02.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $preflight$
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'PostgreSQL 15+ required';
  end if;
  if exists (
    select 1 from public.transactions t
    join public.accounts a on a.id=t.account_id
    where a.user_id is distinct from t.user_id
  ) or exists (
    select 1 from public.transactions t
    join public.categories c on c.id=t.category_id
    where c.user_id is not null and c.user_id is distinct from t.user_id
  ) then
    raise exception 'Existing transactions reference another user account/category. Repair ownership before enabling policies. Nothing committed.';
  end if;
  if exists (
    select 1 from public.portfolio_transactions child
    join public.portfolio_transactions parent on parent.id=child.linked_transaction_id
    where parent.portfolio_id <> child.portfolio_id
  ) then
    raise exception 'Existing linked portfolio transactions cross portfolios. Review before proceeding. Nothing committed.';
  end if;
end
$preflight$;

-- Replace the exported policies atomically, including redundant ALL + SELECT policies.
do $tables$
declare t text; p record;
  managed text[] := array[
    'accounts','portfolios','transactions','portfolio_transactions','categories',
    'assets','audit_ai_actions','money_frameworks','money_buckets',
    'money_bucket_accounts','category_budget_settings','category_budgets',
    'savings_goals','savings_goal_imports','savings_goal_contributions',
    'savings_garden_starter_updates'
  ];
begin
  foreach t in array managed loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies
      where schemaname='public' and tablename=t
    loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('revoke all on table public.%I from public, anon, authenticated',t);
  end loop;
  foreach t in array array[
    'accounts','portfolios','money_frameworks','money_buckets',
    'category_budget_settings','category_budgets','savings_goals',
    'savings_goal_imports','savings_garden_starter_updates'
  ] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy own_rows on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
  end loop;
end
$tables$;

grant select,insert,update,delete on public.categories to authenticated;
create policy category_read on public.categories for select to authenticated
  using (user_id=(select auth.uid()) or user_id is null);
create policy category_insert on public.categories for insert to authenticated
  with check (user_id=(select auth.uid()));
create policy category_update on public.categories for update to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy category_delete on public.categories for delete to authenticated
  using (user_id=(select auth.uid()));

grant select,insert,update,delete on public.transactions to authenticated;
create policy transaction_read on public.transactions for select to authenticated
  using (user_id=(select auth.uid()));
create policy transaction_delete on public.transactions for delete to authenticated
  using (user_id=(select auth.uid()));
-- Retain the existing insert amount cap and positive-amount validation.
create policy transaction_insert on public.transactions for insert to authenticated
  with check (
    user_id=(select auth.uid()) and amount>0 and amount<=100000000000
    and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
    and exists (select 1 from public.categories c where c.id=category_id and (c.user_id is null or c.user_id=(select auth.uid())))
  );
create policy transaction_update on public.transactions for update to authenticated
  using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid()) and amount>0
    and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
    and exists (select 1 from public.categories c where c.id=category_id and (c.user_id is null or c.user_id=(select auth.uid())))
  );

grant select,insert,update,delete on public.portfolio_transactions to authenticated;
create policy own_portfolio_transactions on public.portfolio_transactions
  for all to authenticated
  using (portfolio_id in (select p.id from public.portfolios p where p.user_id=(select auth.uid())))
  with check (portfolio_id in (select p.id from public.portfolios p where p.user_id=(select auth.uid())));

-- The linked_transaction_id FK cascades deletes. Reject links across portfolios.
-- A trigger avoids a recursive RLS policy on portfolio_transactions itself.
create or replace function public.check_portfolio_transaction_link()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  if new.linked_transaction_id is not null and not exists (
    select 1 from public.portfolio_transactions parent
    where parent.id=new.linked_transaction_id and parent.portfolio_id=new.portfolio_id
  ) then
    raise exception 'Linked transaction must belong to the same portfolio';
  end if;
  return new;
end
$fn$;
drop trigger if exists check_portfolio_transaction_link on public.portfolio_transactions;
create trigger check_portfolio_transaction_link before insert or update
  on public.portfolio_transactions for each row
  execute function public.check_portfolio_transaction_link();
revoke execute on function public.check_portfolio_transaction_link() from public,anon,authenticated;

grant select,insert on public.audit_ai_actions to authenticated;
create policy audit_read on public.audit_ai_actions for select to authenticated
  using (user_id=(select auth.uid()));
create policy audit_insert on public.audit_ai_actions for insert to authenticated
  with check (user_id=(select auth.uid()));

grant select,insert,update,delete on public.money_bucket_accounts to authenticated;
create policy own_bucket_accounts on public.money_bucket_accounts for all to authenticated
  using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid())
    and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
    and exists (select 1 from public.money_buckets b where b.id=bucket_id and b.user_id=(select auth.uid()))
  );
grant select on public.savings_goal_contributions to authenticated;
create policy own_contributions on public.savings_goal_contributions for select to authenticated
  using (user_id=(select auth.uid()));

-- Shared market catalog. Preserve the frontend's exact upsert column set.
-- Metadata remains shared/editable by signed-in users. Prices are server-managed.
grant select on public.assets to anon,authenticated;
grant insert(ticker,name,type,industry,sector,logo_url,updated_at),
      update(ticker,name,type,industry,sector,logo_url,updated_at)
  on public.assets to authenticated;
create policy asset_read on public.assets for select to anon,authenticated using (true);
create policy asset_insert on public.assets for insert to authenticated with check ((select auth.uid()) is not null);
create policy asset_update on public.assets for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create or replace function public.prevent_client_asset_rename()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  if current_user in ('anon','authenticated') and new.ticker is distinct from old.ticker then
    raise exception 'Asset ticker cannot be renamed by a client';
  end if;
  return new;
end
$fn$;
drop trigger if exists prevent_client_asset_rename on public.assets;
create trigger prevent_client_asset_rename before update on public.assets
  for each row execute function public.prevent_client_asset_rename();
revoke execute on function public.prevent_client_asset_rename() from public,anon,authenticated;

-- Keep view column names/types, remove the auth.users dependency entirely.
do $views$
declare extra text; count_columns integer;
begin
  select string_agg(format('NULL::%s AS %I',pg_catalog.format_type(a.atttypid,a.atttypmod),a.attname),', ' order by a.attnum),count(*)
  into extra,count_columns
  from pg_attribute a
  where a.attrelid='public.view_transactions_detailed'::regclass
    and a.attnum>0 and not a.attisdropped
    and a.attname in ('user_email','user_phone','user_created_at','last_sign_in_at','user_display_name');
  if count_columns<>5 then raise exception 'Unexpected view columns. Nothing committed.'; end if;
  execute format($view$
    create or replace view public.view_transactions_detailed with(security_invoker=true) as
    select t.id as transaction_id,t.amount,t.name as transaction_name,t.type as transaction_type,
      t.note,t.attachment_url,t.is_recurring,t.created_at,t.updated_at,
      a.id as account_id,a.name as account_name,a.type as account_type,a.currency as account_currency,
      a.icon as account_icon,a.color as account_color,a.created_at as account_created_at,a.updated_at as account_updated_at,
      c.id as category_id,c.name as category_name,c.icon as category_icon,c.color as category_color,
      c.created_at as category_created_at,c.updated_at as category_updated_at,t.user_id,%s
    from public.transactions t
    join public.accounts a on t.account_id=a.id
    join public.categories c on t.category_id=c.id
  $view$,extra);
end
$views$;
alter view public.portfolio_holdings set(security_invoker=true);
revoke all on public.view_transactions_detailed,public.portfolio_holdings from public,anon,authenticated;
grant select on public.view_transactions_detailed,public.portfolio_holdings to authenticated;

-- Correct the exported function's NULL category_id insert, which violates the schema.
-- Keep SECURITY DEFINER: contribution rows cannot be written directly by clients.
create or replace function public.water_savings_goal(p_goal_id uuid,p_account_id uuid,p_amount numeric,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
  owner_id uuid := auth.uid();
  goal_name text;
  result_id uuid;
  savings_category uuid;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if p_request_id is null then raise exception 'Request ID required'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
  select g.name into goal_name from public.savings_goals g where g.id=p_goal_id and g.user_id=owner_id;
  if goal_name is null then raise exception 'Goal not found'; end if;
  if not exists (select 1 from public.accounts a where a.id=p_account_id and a.user_id=owner_id) then
    raise exception 'Account not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select c.transaction_id into result_id from public.savings_goal_contributions c
    where c.transaction_id=p_request_id and c.user_id=owner_id;
  if result_id is not null then return result_id; end if;
  perform pg_advisory_xact_lock(hashtextextended('finly:savings-category:' || owner_id::text,0));
  select c.id into savings_category from public.categories c
    where c.user_id=owner_id and c.name='Savings' order by c.created_at,c.id limit 1;
  if savings_category is null then
    insert into public.categories(user_id,name,icon,color)
    values(owner_id,'Savings','savings','#1a4d2e') returning id into savings_category;
  end if;
  insert into public.transactions(id,user_id,account_id,name,type,amount,category_id,note,is_recurring,created_at)
  values(p_request_id,owner_id,p_account_id,'Savings: ' || goal_name,'expense',p_amount,savings_category,'Savings goal contribution',false,now())
  returning id into result_id;
  insert into public.savings_goal_contributions(transaction_id,goal_id,user_id)
  values(result_id,p_goal_id,owner_id);
  return result_id;
end
$fn$;

-- This summary already filters auth.uid(); RLS can enforce isolation too.
alter function public.get_ai_spending_summary(timestamptz,timestamptz,uuid) security invoker;
-- All exported bodies use qualified table names, or only built-in functions.
-- Empty search_path prevents temporary/public object shadowing.
alter function public.get_ai_spending_summary(timestamp with time zone,timestamp with time zone,uuid) set search_path = '';
revoke execute on function public.get_ai_spending_summary(timestamp with time zone,timestamp with time zone,uuid) from public,anon,authenticated;
grant execute on function public.get_ai_spending_summary(timestamp with time zone,timestamp with time zone,uuid) to authenticated,service_role;
alter function public.get_savings_goals() set search_path = '';
revoke execute on function public.get_savings_goals() from public,anon,authenticated;
grant execute on function public.get_savings_goals() to authenticated,service_role;
alter function public.guard_savings_goal_transaction() set search_path = '';
revoke execute on function public.guard_savings_goal_transaction() from public,anon,authenticated;
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public,anon,authenticated;
alter function public.import_savings_goals(jsonb) set search_path = '';
revoke execute on function public.import_savings_goals(jsonb) from public,anon,authenticated;
grant execute on function public.import_savings_goals(jsonb) to authenticated,service_role;
alter function public.initialize_category_budgets(jsonb) set search_path = '';
revoke execute on function public.initialize_category_budgets(jsonb) from public,anon,authenticated;
grant execute on function public.initialize_category_budgets(jsonb) to authenticated,service_role;
alter function public.initialize_money_framework() set search_path = '';
revoke execute on function public.initialize_money_framework() from public,anon,authenticated;
grant execute on function public.initialize_money_framework() to authenticated,service_role;
alter function public.initialize_savings_garden_starter() set search_path = '';
revoke execute on function public.initialize_savings_garden_starter() from public,anon,authenticated;
grant execute on function public.initialize_savings_garden_starter() to authenticated,service_role;
alter function public.save_money_bucket(uuid,text,boolean,numeric,numeric,uuid[]) set search_path = '';
revoke execute on function public.save_money_bucket(uuid,text,boolean,numeric,numeric,uuid[]) from public,anon,authenticated;
grant execute on function public.save_money_bucket(uuid,text,boolean,numeric,numeric,uuid[]) to authenticated,service_role;
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.set_updated_at() from public,anon,authenticated;
alter function public.update_updated_at_column() set search_path = '';
revoke execute on function public.update_updated_at_column() from public,anon,authenticated;
alter function public.water_savings_goal(uuid,uuid,numeric,uuid) set search_path = '';
revoke execute on function public.water_savings_goal(uuid,uuid,numeric,uuid) from public,anon,authenticated;
grant execute on function public.water_savings_goal(uuid,uuid,numeric,uuid) to authenticated,service_role;

-- Client roles must not create objects that trusted functions could resolve.
revoke create on schema public from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
