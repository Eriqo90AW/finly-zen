-- Run once per user. Only the original, unwatered sample goals are changed.
create table public.savings_garden_starter_updates (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.savings_garden_starter_updates enable row level security;
create policy own_savings_garden_starter_updates on public.savings_garden_starter_updates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.initialize_savings_garden_starter() returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.savings_garden_starter_updates(user_id) values (auth.uid()) on conflict do nothing;
  if not found then return; end if;

  delete from public.savings_goals g
  where g.user_id = auth.uid() and g.name = 'New Laptop' and g.emoji = '💻'
    and g.target = 25000000 and g.target_date = date '2026-12-15'
    and g.opening_amount = 18000000
    and not exists (select 1 from public.savings_goal_contributions c where c.goal_id = g.id);

  update public.savings_goals g set opening_amount = 0,
    target_date = case when g.target_date < current_date then (current_date + interval '1 year')::date else g.target_date end,
    created_at = now()
  where g.user_id = auth.uid() and g.name = 'Summer Trip' and g.emoji = '✈️'
    and g.target = 15000000 and g.target_date = date '2026-08-01'
    and g.opening_amount in (6000000, 6500000)
    and not exists (select 1 from public.savings_goal_contributions c where c.goal_id = g.id);

  if not exists (select 1 from public.savings_goals where user_id = auth.uid()) then
    insert into public.savings_goals(user_id, name, emoji, target, opening_amount, target_date)
    values (auth.uid(), 'Summer Trip', '✈️', 15000000, 0, (current_date + interval '1 year')::date);
  end if;
end $$;
