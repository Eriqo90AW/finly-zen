-- ONLY after confirming ownership. Run as postgres, separately from 01.
-- If all unassigned rows belong to one account, replace NULL below with
-- 'the-confirmed-user-uuid'::uuid. Never use the frontend fallback UUID as evidence.
-- If records have multiple owners, use a per-record mapping instead.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $journal$
declare
  confirmed_owner uuid := NULL;
  unassigned bigint;
  p record;
begin
  lock table public.trading_journal in share row exclusive mode;
  select count(*) into unassigned from public.trading_journal where user_id is null;
  if unassigned>0 then
    if confirmed_owner is null then
      raise exception '% journal records need confirmed owners. No changes applied.',unassigned;
    end if;
    if not exists(select 1 from auth.users where id=confirmed_owner) then
      raise exception 'Confirmed owner does not exist';
    end if;
    if unassigned<>74 then
      raise exception 'Expected 74 unassigned records; found %. Review before assigning ownership.',unassigned;
    end if;
    update public.trading_journal set user_id=confirmed_owner where user_id is null;
  end if;
  alter table public.trading_journal enable row level security;
  alter table public.trading_journal alter column user_id set default auth.uid();
  alter table public.trading_journal alter column user_id set not null;
  for p in select policyname from pg_policies where schemaname='public' and tablename='trading_journal' loop
    execute format('drop policy %I on public.trading_journal',p.policyname);
  end loop;
  revoke all on public.trading_journal from public,anon,authenticated;
  grant select,insert,update,delete on public.trading_journal to authenticated;
  create policy own_journal_rows on public.trading_journal for all to authenticated
    using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
end
$journal$;
notify pgrst,'reload schema';
commit;
