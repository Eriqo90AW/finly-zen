-- READ-ONLY command generator. May run before or after the other repairs.
-- Run this entire SELECT in Supabase SQL Editor as postgres.
-- Copy each create_index_sql result and run EACH command in a separate query.
-- Do NOT wrap concurrent commands in BEGIN/COMMIT or a DO/function block.
-- Rerun this generator afterward: zero rows means every public FK has coverage.
-- Existing valid, ready, full B-tree indexes count regardless of their names.
-- Matching FK columns may appear in either order within the leading key prefix.
with missing as (
  select fk.oid,fk.conrelid,fk.conname,fk.conkey,
    ns.nspname,t.relname,t.relkind,
    'finly_fk_' || substr(md5(ns.nspname || '.' || t.relname || ':' || array_to_string(fk.conkey,',')),1,20) as index_name,
    (select string_agg(format('%I',a.attname),', ' order by k.ord)
     from unnest(fk.conkey) with ordinality k(attnum,ord)
     join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.attnum) as columns_sql
  from pg_constraint fk
  join pg_class t on t.oid=fk.conrelid
  join pg_namespace ns on ns.oid=t.relnamespace
  where fk.contype='f' and ns.nspname='public'
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
)
select format('%I.%I',m.nspname,m.relname) as table_name,
  m.conname as foreign_key,m.columns_sql as foreign_key_columns,
  case
    when m.relkind='p' then 'REVIEW_PARTITIONED_TABLE'
    when existing.oid is not null then 'REVIEW_EXISTING_NAME'
    else 'READY'
  end as status,
  case when m.relkind<>'p' and existing.oid is null then
    format('CREATE INDEX CONCURRENTLY %I ON %I.%I USING btree (%s);',m.index_name,m.nspname,m.relname,m.columns_sql)
  end as create_index_sql,
  case when existing.oid is not null then
    format('SELECT c.oid::regclass AS object_name, i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid=c.oid WHERE c.oid=%s;',existing.oid)
  end as inspect_existing_sql
from missing m
left join pg_namespace ens on ens.nspname=m.nspname
left join pg_class existing on existing.relnamespace=ens.oid and existing.relname=m.index_name
order by m.nspname,m.relname,m.conname;
