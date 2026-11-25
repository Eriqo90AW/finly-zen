begin;

alter table public.transactions
  add column entry_kind text not null default 'regular',
  add column transfer_id uuid,
  add constraint transactions_entry_kind_check check (
    (entry_kind = 'regular' and transfer_id is null)
    or (entry_kind = 'opening_balance' and type = 'income' and transfer_id is null)
    or (entry_kind = 'transfer' and transfer_id is not null)
  );

update public.transactions
set entry_kind = 'opening_balance'
where type = 'income' and not is_recurring and name = 'Initial Balance'
  and note = 'Starting balance on Main account';

-- Backfill only reciprocal, exact-time legacy pairs with a single match on both sides.
with candidates as (
  select outgoing.id as expense_id, incoming.id as income_id,
    count(*) over (partition by outgoing.id) as expense_matches,
    count(*) over (partition by incoming.id) as income_matches
  from public.transactions outgoing
  join public.transactions incoming on incoming.user_id = outgoing.user_id
    and incoming.created_at = outgoing.created_at and incoming.amount = outgoing.amount
    and incoming.account_id <> outgoing.account_id and incoming.type = 'income'
    and incoming.is_recurring
  join public.accounts source on source.id = outgoing.account_id
  join public.accounts destination on destination.id = incoming.account_id
  join public.categories expense_category on expense_category.id = outgoing.category_id
  join public.categories income_category on income_category.id = incoming.category_id
  where outgoing.type = 'expense' and outgoing.is_recurring
    and lower(expense_category.name) = 'debt' and lower(income_category.name) = 'debt'
    and outgoing.name = 'Transfer to ' || destination.name
    and incoming.name = 'Transfer from ' || source.name
), pairs as materialized (
  select expense_id, income_id, gen_random_uuid() as transfer_id
  from candidates where expense_matches = 1 and income_matches = 1
)
update public.transactions t set entry_kind = 'transfer', transfer_id = pairs.transfer_id,
  is_recurring = false
from pairs where t.id in (pairs.expense_id, pairs.income_id);

create unique index transactions_transfer_leg_idx
  on public.transactions (user_id, transfer_id, type) where transfer_id is not null;

-- Preserve the public view's profile column types without reading auth.users.
do $views$
declare profile_columns text;
begin
  select string_agg(format('NULL::%s AS %I', pg_catalog.format_type(a.atttypid,a.atttypmod), a.attname),
    ', ' order by a.attnum)
  into profile_columns
  from pg_attribute a
  where a.attrelid = 'public.view_transactions_detailed'::regclass
    and a.attnum > 0 and not a.attisdropped
    and a.attname in ('user_email','user_phone','user_created_at','last_sign_in_at','user_display_name');

  execute format($view$
    create or replace view public.view_transactions_detailed with (security_invoker = true) as
    select t.id as transaction_id, t.amount, t.name as transaction_name, t.type as transaction_type,
      t.note, t.attachment_url, t.is_recurring, t.created_at, t.updated_at,
      a.id as account_id, a.name as account_name, a.type as account_type, a.currency as account_currency,
      a.icon as account_icon, a.color as account_color, a.created_at as account_created_at, a.updated_at as account_updated_at,
      c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
      c.created_at as category_created_at, c.updated_at as category_updated_at, t.user_id,
      %s, t.entry_kind, t.transfer_id
    from public.transactions t
    left join public.accounts a on a.id = t.account_id
    left join public.categories c on c.id = t.category_id
  $view$, profile_columns);
end
$views$;

alter table public.accounts add column setup_pending boolean not null default false;

-- Flag the placeholder account created by the existing signup trigger.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (user_id, name, type, setup_pending)
  values (new.id, 'Main Account', 'default', true);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create function public.complete_finance_setup(
  p_user_id uuid, p_opening_balance numeric, p_categories text[] default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  account_id uuid;
  salary_id uuid;
begin
  if auth.uid() is distinct from p_user_id or p_user_id is null then
    raise exception 'Sign in to complete setup';
  end if;
  if p_opening_balance is null or p_opening_balance < 0
    or p_opening_balance in ('NaN'::numeric, 'Infinity'::numeric) then
    raise exception 'Opening balance must be a finite nonnegative amount';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('finance-setup:' || p_user_id::text, 0));

  select a.id into account_id from public.accounts a
    where a.user_id = p_user_id and not a.setup_pending order by a.created_at, a.id limit 1;
  if account_id is not null then return account_id; end if;

  select a.id into account_id from public.accounts a
    where a.user_id = p_user_id and a.setup_pending order by a.created_at, a.id limit 1;
  if account_id is null then
    insert into public.accounts (user_id, name, type, color)
      values (p_user_id, 'Main', 'default', '#1a4d2e') returning id into account_id;
  else
    update public.accounts set setup_pending = false, name = 'Main', color = '#1a4d2e'
      where id = account_id;
  end if;

  insert into public.categories (user_id, name, icon, color)
  select p_user_id, starter.name, starter.icon, starter.color
  from (values
    ('Food & Dining', 'restaurant', '#d47b5a'),
    ('Transport', 'directions_car', '#52c278'),
    ('Bills & Utilities', 'receipt_long', '#6366f1'),
    ('Shopping', 'shopping_bag', '#f43f5e'),
    ('Investments', 'trending_up', '#1a4d2e'),
    ('Health & Wellness', 'favorite', '#a78bfa'),
    ('Salary', 'payments', '#10b981'),
    ('Debt', 'swap_horiz', '#80631d')
  ) as starter(name, icon, color)
  where (p_categories is null or starter.name = any(p_categories) or starter.name in ('Salary', 'Debt'))
    and not exists (select 1 from public.categories c where c.user_id = p_user_id and c.name = starter.name);

  if p_opening_balance > 0 then
    select id into strict salary_id from public.categories
      where user_id = p_user_id and name = 'Salary' order by created_at, id limit 1;
    insert into public.transactions (user_id, account_id, category_id, name, amount, type, entry_kind, note)
    values (p_user_id, account_id, salary_id, 'Opening Balance', p_opening_balance, 'income',
      'opening_balance', 'Starting balance on Main account');
  end if;
  return account_id;
end;
$$;
revoke execute on function public.complete_finance_setup(uuid, numeric, text[]) from public, anon;
grant execute on function public.complete_finance_setup(uuid, numeric, text[]) to authenticated;

commit;
