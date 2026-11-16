create table public.category_budget_settings (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.category_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  category_key text generated always as (lower(trim(category))) stored,
  amount numeric not null check (amount >= 0),
  primary key (user_id, category_key)
);
alter table public.category_budget_settings enable row level security;
alter table public.category_budgets enable row level security;
create policy own_budget_settings on public.category_budget_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_category_budgets on public.category_budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create function public.initialize_category_budgets(p_budgets jsonb) returns void language plpgsql security invoker as $$
begin
  insert into public.category_budget_settings(user_id) values (auth.uid()) on conflict do nothing;
  if found then
    insert into public.category_budgets(user_id, category, amount)
    select auth.uid(), trim(item->>'category'), (item->>'limit')::numeric
    from jsonb_array_elements(p_budgets) item
    where length(trim(item->>'category')) > 0 and (item->>'limit')::numeric >= 0
    on conflict do nothing;
  end if;
end $$;
