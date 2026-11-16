-- Apply through the project's Supabase migration workflow.
create table public.money_frameworks (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.money_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.money_frameworks(user_id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_emergency boolean not null default false,
  target numeric not null default 0 check (target >= 0),
  contribution numeric not null default 0 check (contribution >= 0),
  unique (id, user_id)
);
create table public.money_bucket_accounts (
  user_id uuid not null references public.money_frameworks(user_id) on delete cascade,
  bucket_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  primary key (user_id, account_id),
  foreign key (bucket_id, user_id) references public.money_buckets(id, user_id) on delete cascade
);
alter table public.money_frameworks enable row level security;
alter table public.money_buckets enable row level security;
alter table public.money_bucket_accounts enable row level security;
create policy own_framework on public.money_frameworks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_bucket on public.money_buckets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_bucket_accounts on public.money_bucket_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
create function public.initialize_money_framework() returns void language plpgsql security invoker as $$
begin
  insert into public.money_frameworks(user_id) values (auth.uid()) on conflict do nothing;
  if found then
    insert into public.money_buckets(user_id,name,is_emergency) values
      (auth.uid(),'Emergency fund',true), (auth.uid(),'Savings',false), (auth.uid(),'Investments',false);
  end if;
end $$;
create function public.save_money_bucket(p_id uuid, p_name text, p_emergency boolean, p_target numeric, p_contribution numeric, p_accounts uuid[]) returns void language plpgsql security invoker as $$
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
end $$;
