create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email varchar,phone text,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role' $$;
grant usage on schema auth,public to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create type "asset_type" as enum ('US_STOCK','IDX','CRYPTO','CASH');
create type "transaction_type" as enum ('BUY','SELL','DEPOSIT','WITHDRAWAL');
create type "TransactionType" as enum ('income','expense');
create type "trade_direction" as enum ('LONG','SHORT');
create type "pos_status_type" as enum ('OPEN','PARTIAL','CLOSED');
create type "record_type" as enum ('SETUP','EXECUTED');
create type "setup_quality_type" as enum ('A','B','C');
create type "setup_status_type" as enum ('PLANNED','EXECUTED','SKIPPED','EXPIRED');
create type "result_label_type" as enum ('CUAN','SL HIT','TP1','TP2','BREAKEVEN','OPEN');
create table public."accounts" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"name" "text" not null,"type" "text" not null,"currency" "text" default 'IDR'::text not null,"created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"icon" "text","color" "text",primary key (id));
create table public."assets" ("ticker" "text" not null,"name" "text" not null,"type" "asset_type" not null,"industry" "text","sector" "text","logo_url" "text","created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"current_price" "numeric" default 0 not null,primary key (ticker));
create table public."audit_ai_actions" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"tool_name" "varchar" not null,"action_type" "varchar" not null,"tool_arguments" "jsonb" default '{}'::jsonb not null,"status" "varchar" default 'SUCCESS'::character varying not null,"error_message" "text","created_at" "timestamptz" default now() not null,primary key (id));
create table public."categories" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid","name" "text" not null,"icon" "text","color" "text","created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,primary key (id));
create table public."category_budget_settings" ("user_id" "uuid" not null,primary key (user_id));
create table public."category_budgets" ("user_id" "uuid" not null,"category" "text" not null,"category_key" "text" generated always as (lower(trim(category))) stored not null,"amount" "numeric" not null,primary key (user_id,category_key));
create table public."money_bucket_accounts" ("user_id" "uuid" not null,"bucket_id" "uuid" not null,"account_id" "uuid" not null,primary key (user_id,account_id));
create table public."money_buckets" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"name" "text" not null,"is_emergency" "bool" default false not null,"target" "numeric" default 0 not null,"contribution" "numeric" default 0 not null,primary key (id),unique(id,user_id));
create table public."money_frameworks" ("user_id" "uuid" not null,primary key (user_id));
create table public."portfolio_transactions" ("id" "uuid" default gen_random_uuid() not null,"portfolio_id" "uuid" not null,"asset_ticker" "text" not null,"type" "transaction_type" not null,"qty" "numeric" not null,"price_per_unit" "numeric" not null,"settlement_currency" "text" not null,"notes" "text","created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"transaction_date" "timestamptz" default now() not null,"fx_rate_to_base" "numeric" default 1 not null,"linked_transaction_id" "uuid",primary key (id));
create table public."portfolios" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"name" "text" not null,"created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"base_currency" "text" default 'IDR'::text not null,primary key (id));
create table public."savings_garden_starter_updates" ("user_id" "uuid" not null,primary key (user_id));
create table public."savings_goal_contributions" ("transaction_id" "uuid" not null,"goal_id" "uuid" not null,"user_id" "uuid" not null,primary key (transaction_id));
create table public."savings_goal_imports" ("user_id" "uuid" not null,primary key (user_id));
create table public."savings_goals" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"name" "text" not null,"emoji" "text" default '🌱'::text not null,"target" "numeric" not null,"opening_amount" "numeric" default 0 not null,"target_date" "date" not null,"created_at" "timestamptz" default now() not null,primary key (id));
create table public."trading_journal" ("id" "uuid" default gen_random_uuid() not null,"trade_date" "date" not null,"ticker" "varchar" not null,"direction" "trade_direction" default 'LONG'::trade_direction,"pos_status" "pos_status_type" default 'OPEN'::pos_status_type,"record_type" "record_type" default 'EXECUTED'::record_type not null,"setup_quality" "setup_quality_type","setup_status" "setup_status_type","setup_type" "varchar","lots" "int4" default 0 not null,"lots_remaining" "int4" default 0,"lots_closed" "int4" default 0,"entry_zone_ideal" "numeric","entry_zone_max" "numeric","avg_entry_price" "numeric","avg_exit_price" "numeric","stop_loss" "numeric","tp1_price" "numeric","tp2_price" "numeric","trail_sl" "numeric","entry_details" "jsonb","exit_details" "jsonb","commission_buy" "numeric","commission_sell" "numeric","total_fee" "numeric","gross_pnl" "numeric","net_pnl" "numeric","roi_pct" "numeric","planned_rr" "numeric","risk_r" "numeric","risk_amount" "numeric","analysis_raw" "text","checklist" text[],"result_label" "result_label_type","entry_session" "varchar","hold_days" "int4","psychology_tags" text[],"notes" "text","created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"user_id" "uuid",primary key (id));
create table public."transactions" ("id" "uuid" default gen_random_uuid() not null,"user_id" "uuid" not null,"account_id" "uuid" not null,"category_id" "uuid" not null,"amount" "numeric" not null,"note" "text","attachment_url" "text","created_at" "timestamptz" default now() not null,"updated_at" "timestamptz" default now() not null,"name" "text" not null,"type" "TransactionType" default 'expense'::"TransactionType" not null,"is_recurring" "bool" default false not null,primary key (id));
alter table public.accounts add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.transactions add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.transactions add FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.categories add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.transactions add FOREIGN KEY (category_id) REFERENCES categories(id);
alter table public.portfolios add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.portfolio_transactions add FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;
alter table public.portfolio_transactions add FOREIGN KEY (asset_ticker) REFERENCES assets(ticker);
alter table public.portfolio_transactions add FOREIGN KEY (linked_transaction_id) REFERENCES portfolio_transactions(id) ON DELETE CASCADE;
alter table public.trading_journal add FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public.money_buckets add FOREIGN KEY (user_id) REFERENCES money_frameworks(user_id) ON DELETE CASCADE;
alter table public.money_bucket_accounts add FOREIGN KEY (user_id) REFERENCES money_frameworks(user_id) ON DELETE CASCADE;
alter table public.money_bucket_accounts add FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.money_bucket_accounts add FOREIGN KEY (bucket_id, user_id) REFERENCES money_buckets(id, user_id) ON DELETE CASCADE;
alter table public.category_budget_settings add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.savings_goals add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.savings_goal_imports add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.savings_goal_contributions add FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.savings_goal_contributions add FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE;
alter table public.savings_goal_contributions add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.money_frameworks add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.category_budgets add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.savings_garden_starter_updates add FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.get_ai_spending_summary(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_account_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE

    v_user_id UUID;

    v_result JSONB;

BEGIN

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN

        RAISE EXCEPTION 'Unauthorized: User session required';

    END IF;



    SELECT jsonb_build_object(

        'total_spent', COALESCE(SUM(t.amount), 0),

        'transaction_count', COUNT(t.id),

        'by_category', COALESCE(

            jsonb_agg(

                jsonb_build_object(

                    'category', c.name,

                    'total', cat_sum.total,

                    'count', cat_sum.cnt

                )

            ) FILTER (WHERE cat_sum.total IS NOT NULL),

            '[]'::jsonb

        )

    )

    INTO v_result

    FROM public.transactions t

    LEFT JOIN public.categories c ON t.category_id = c.id

    LEFT JOIN LATERAL (

        SELECT SUM(t2.amount) AS total, COUNT(t2.id) AS cnt

        FROM public.transactions t2

        WHERE t2.user_id = v_user_id

          AND t2.type = 'expense'

          AND t2.category_id = t.category_id

          AND (p_start_date IS NULL OR t2.created_at >= p_start_date)

          AND (p_end_date IS NULL OR t2.created_at <= p_end_date)

          AND (p_account_id IS NULL OR t2.account_id = p_account_id)

        GROUP BY t2.category_id

    ) cat_sum ON TRUE

    WHERE t.user_id = v_user_id

      AND t.type = 'expense'

      AND (p_start_date IS NULL OR t.created_at >= p_start_date)

      AND (p_end_date IS NULL OR t.created_at <= p_end_date)

      AND (p_account_id IS NULL OR t.account_id = p_account_id);



    RETURN COALESCE(v_result, '{}'::jsonb);

END;

$function$
;
CREATE OR REPLACE FUNCTION public.get_savings_goals()
 RETURNS TABLE(id uuid, name text, emoji text, target numeric, current_amount numeric, target_date date, created_at timestamp with time zone, last_watered_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$

  select g.id,g.name,g.emoji,g.target,g.opening_amount + coalesce(sum(t.amount),0),g.target_date,g.created_at,max(t.created_at)

  from public.savings_goals g

  left join public.savings_goal_contributions c on c.goal_id=g.id and c.user_id=g.user_id

  left join public.transactions t on t.id=c.transaction_id and t.user_id=g.user_id

  where g.user_id=auth.uid()

  group by g.id order by g.created_at;

$function$
;
CREATE OR REPLACE FUNCTION public.guard_savings_goal_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

begin

  if exists (select 1 from public.savings_goal_contributions where transaction_id = old.id) then

    if new.type <> 'expense' or new.amount <= 0 or new.user_id <> old.user_id or not exists (select 1 from public.accounts where id = new.account_id and user_id = old.user_id) then

      raise exception 'A savings contribution must remain a positive expense in one of your accounts';

    end if;

  end if;

  return new;

end $function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

begin

  insert into public.accounts (user_id, name, type)

  values (

    new.id,

    'Main Account',

    'default'

  );

  return new;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.import_savings_goals(p_goals jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

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

end $function$
;
CREATE OR REPLACE FUNCTION public.initialize_category_budgets(p_budgets jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

begin

  insert into public.category_budget_settings(user_id) values (auth.uid()) on conflict do nothing;

  if found then

    insert into public.category_budgets(user_id, category, amount)

    select auth.uid(), trim(item->>'category'), (item->>'limit')::numeric

    from jsonb_array_elements(p_budgets) item

    where length(trim(item->>'category')) > 0 and (item->>'limit')::numeric >= 0

    on conflict do nothing;

  end if;

end $function$
;
CREATE OR REPLACE FUNCTION public.initialize_money_framework()
 RETURNS void
 LANGUAGE plpgsql
AS $function$

begin

  insert into public.money_frameworks(user_id) values (auth.uid()) on conflict do nothing;

  if found then

    insert into public.money_buckets(user_id,name,is_emergency) values

      (auth.uid(),'Emergency fund',true), (auth.uid(),'Savings',false), (auth.uid(),'Investments',false);

  end if;

end $function$
;
CREATE OR REPLACE FUNCTION public.initialize_savings_garden_starter()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$

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

end $function$
;
CREATE OR REPLACE FUNCTION public.save_money_bucket(p_id uuid, p_name text, p_emergency boolean, p_target numeric, p_contribution numeric, p_accounts uuid[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$

declare bucket uuid;

begin

  if p_id is null then

    insert into public.money_buckets(user_id,name,is_emergency,target,contribution) values (auth.uid(),p_name,p_emergency,p_target,p_contribution) returning id into bucket;

  else

    update public.money_buckets set name=p_name, is_emergency=p_emergency, target=p_target, contribution=p_contribution where id=p_id and user_id=auth.uid() returning id into bucket;

    if bucket is null then raise exception 'Bucket not found'; end if;

  end if;

  delete from public.money_bucket_accounts where bucket_id=bucket and user_id=auth.uid();

  insert into public.money_bucket_accounts(user_id,bucket_id,account_id) select auth.uid(),bucket,unnest(p_accounts);

end $function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

begin

  new.updated_at = now();

  return new;

end;

$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN

  NEW.updated_at = NOW();

  RETURN NEW;

END;

$function$
;
CREATE OR REPLACE FUNCTION public.water_savings_goal(p_goal_id uuid, p_account_id uuid, p_amount numeric, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

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

end $function$
;
create policy "Users can modify own accounts" on public.accounts as PERMISSIVE for ALL to "authenticated" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "Users can view own accounts" on public.accounts as PERMISSIVE for SELECT to "authenticated" using (((user_id = auth.uid()) OR (user_id IS NULL)));
create policy "Users can delete own transactions" on public.transactions as PERMISSIVE for DELETE to "authenticated" using ((user_id = auth.uid()));
create policy "Users can insert own transactions" on public.transactions as PERMISSIVE for INSERT to "authenticated" with check (((user_id = auth.uid()) AND (amount > (0)::numeric) AND (amount <= ('100000000000'::bigint)::numeric)));
create policy "Users can update own transactions" on public.transactions as PERMISSIVE for UPDATE to "authenticated" using ((user_id = auth.uid())) with check (((user_id = auth.uid()) AND (amount > (0)::numeric)));
create policy "Users can view own transactions" on public.transactions as PERMISSIVE for SELECT to "authenticated" using ((user_id = auth.uid()));
create policy "own_budget_settings" on public.category_budget_settings as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own_category_budgets" on public.category_budgets as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own_savings_garden_starter_updates" on public.savings_garden_starter_updates as PERMISSIVE for ALL to "public" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "Authenticated users can insert audit entries" on public.audit_ai_actions as PERMISSIVE for INSERT to "authenticated" with check ((user_id = auth.uid()));
create policy "Users can only view their own AI audit logs" on public.audit_ai_actions as PERMISSIVE for SELECT to "authenticated" using ((user_id = auth.uid()));
create policy "Users can manage own portfolios" on public.portfolios as PERMISSIVE for ALL to "authenticated" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "Users can view own portfolios" on public.portfolios as PERMISSIVE for SELECT to "authenticated" using ((user_id = auth.uid()));
create policy "Users can insert own portfolio transactions" on public.portfolio_transactions as PERMISSIVE for INSERT to "authenticated" with check ((portfolio_id IN ( SELECT portfolios.id
   FROM portfolios
  WHERE (portfolios.user_id = auth.uid()))));
create policy "Users can view own portfolio transactions" on public.portfolio_transactions as PERMISSIVE for SELECT to "authenticated" using ((portfolio_id IN ( SELECT portfolios.id
   FROM portfolios
  WHERE (portfolios.user_id = auth.uid()))));
create policy "own_savings_goals" on public.savings_goals as PERMISSIVE for ALL to "public" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "own_savings_goal_imports" on public.savings_goal_imports as PERMISSIVE for ALL to "public" using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "own_savings_goal_contributions" on public.savings_goal_contributions as PERMISSIVE for SELECT to "public" using ((user_id = auth.uid()));
create policy "own_bucket" on public.money_buckets as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "own_bucket_accounts" on public.money_bucket_accounts as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM accounts a
  WHERE ((a.id = money_bucket_accounts.account_id) AND (a.user_id = auth.uid()))))));
create policy "own_framework" on public.money_frameworks as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create view public.view_transactions_detailed as select t.id as "transaction_id",NULL::"numeric" as "amount",NULL::"text" as "transaction_name",NULL::"TransactionType" as "transaction_type",NULL::"text" as "note",NULL::"text" as "attachment_url",NULL::"bool" as "is_recurring",NULL::"timestamptz" as "created_at",NULL::"timestamptz" as "updated_at",NULL::"uuid" as "account_id",NULL::"text" as "account_name",NULL::"text" as "account_type",NULL::"text" as "account_currency",NULL::"text" as "account_icon",NULL::"text" as "account_color",NULL::"timestamptz" as "account_created_at",NULL::"timestamptz" as "account_updated_at",NULL::"uuid" as "category_id",NULL::"text" as "category_name",NULL::"text" as "category_icon",NULL::"text" as "category_color",NULL::"timestamptz" as "category_created_at",NULL::"timestamptz" as "category_updated_at",u.id as "user_id",NULL::"varchar" as "user_email",NULL::"text" as "user_phone",NULL::"timestamptz" as "user_created_at",NULL::"timestamptz" as "last_sign_in_at",NULL::"text" as "user_display_name" from public.transactions t join auth.users u on u.id=t.user_id;
create view public.portfolio_holdings as
with asset_summary as (
select portfolio_id,asset_ticker,
sum(case when type in ('BUY','DEPOSIT') then qty when type in ('SELL','WITHDRAWAL') then -qty else 0 end) as quantity,
sum(case when type in ('BUY','DEPOSIT') then qty*price_per_unit*fx_rate_to_base else 0 end) as total_cost_base
from public.portfolio_transactions group by portfolio_id,asset_ticker)
select s.portfolio_id,p.user_id,p.name as portfolio_name,p.base_currency,a.logo_url as icon,s.asset_ticker as asset,a.type::text as category,s.quantity,
a.current_price as live_market_price,s.quantity*a.current_price as current_value_base,s.quantity*a.current_price-s.total_cost_base as pnl,
s.quantity*a.current_price/nullif(sum(s.quantity*a.current_price) over(partition by s.portfolio_id),0)*100 as allocation
from asset_summary s join public.portfolios p on p.id=s.portfolio_id join public.assets a on a.ticker=s.asset_ticker where s.quantity>0;
grant all on all tables in schema public to anon,authenticated,service_role;
create trigger guard_savings_goal_transaction before update on public.transactions for each row execute function public.guard_savings_goal_transaction();
create trigger handle_new_user after insert on auth.users for each row execute function public.handle_new_user();
