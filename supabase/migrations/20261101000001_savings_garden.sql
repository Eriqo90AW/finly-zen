create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  emoji text not null default '🌱',
  target numeric not null check (target > 0),
  opening_amount numeric not null default 0 check (opening_amount >= 0),
  target_date date not null,
  created_at timestamptz not null default now()
);
create table public.savings_goal_imports (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.savings_goal_contributions (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table public.savings_goals enable row level security;
alter table public.savings_goal_imports enable row level security;
alter table public.savings_goal_contributions enable row level security;
create policy own_savings_goals on public.savings_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_savings_goal_imports on public.savings_goal_imports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_savings_goal_contributions on public.savings_goal_contributions for select using (user_id = auth.uid());

-- Import is marked on the server, making it safe across devices and retries.
create function public.import_savings_goals(p_goals jsonb) returns void language plpgsql security invoker set search_path = public as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.savings_goal_imports(user_id) values (auth.uid()) on conflict do nothing;
  if not found then return; end if;
  for item in select value from jsonb_array_elements(coalesce(p_goals, '[]'::jsonb)) loop
    insert into public.savings_goals(user_id,name,emoji,target,opening_amount,target_date)
    values (auth.uid(), item->>'name', coalesce(nullif(item->>'emoji',''), '🌱'), (item->>'target')::numeric,
      greatest(coalesce((item->>'current')::numeric,0),0), (item->>'date')::date);
  end loop;
end $$;

-- One transaction inserts both the expense and its contribution link.
create function public.water_savings_goal(p_goal_id uuid, p_account_id uuid, p_amount numeric, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare goal_name text; result_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select name into goal_name from public.savings_goals where id = p_goal_id and user_id = auth.uid();
  if goal_name is null then raise exception 'Goal not found'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = auth.uid()) then raise exception 'Account not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select transaction_id into result_id from public.savings_goal_contributions where transaction_id = p_request_id and user_id = auth.uid();
  if result_id is not null then return result_id; end if;
  insert into public.transactions(id,user_id,account_id,name,type,amount,category_id,note,is_recurring,created_at)
  values (p_request_id,auth.uid(),p_account_id,'Savings: ' || goal_name,'expense',p_amount,null,'Savings goal contribution',false,now()) returning id into result_id;
  insert into public.savings_goal_contributions(transaction_id,goal_id,user_id) values (result_id,p_goal_id,auth.uid());
  return result_id;
end $$;
revoke all on function public.water_savings_goal(uuid,uuid,numeric,uuid) from public;
grant execute on function public.water_savings_goal(uuid,uuid,numeric,uuid) to authenticated;

create function public.guard_savings_goal_transaction() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.savings_goal_contributions where transaction_id = old.id) then
    if new.type <> 'expense' or new.amount <= 0 or new.user_id <> old.user_id or not exists (select 1 from public.accounts where id = new.account_id and user_id = old.user_id) then
      raise exception 'A savings contribution must remain a positive expense in one of your accounts';
    end if;
  end if;
  return new;
end $$;
create trigger guard_savings_goal_transaction before update on public.transactions for each row execute function public.guard_savings_goal_transaction();

create function public.get_savings_goals() returns table(id uuid, name text, emoji text, target numeric, current_amount numeric, target_date date, created_at timestamptz, last_watered_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select g.id,g.name,g.emoji,g.target,g.opening_amount + coalesce(sum(t.amount),0),g.target_date,g.created_at,max(t.created_at)
  from public.savings_goals g
  left join public.savings_goal_contributions c on c.goal_id=g.id and c.user_id=g.user_id
  left join public.transactions t on t.id=c.transaction_id and t.user_id=g.user_id
  where g.user_id=auth.uid()
  group by g.id order by g.created_at;
$$;
