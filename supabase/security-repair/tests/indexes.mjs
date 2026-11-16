import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const dir=fileURLToPath(new URL('../',import.meta.url));
const db=new PGlite();
const query=readFileSync(dir+'/04-foreign-key-indexes.sql','utf8');
let checks=0;
function ok(value,label){assert.ok(value,label);checks++;console.log('PASS '+label);}
async function rows(){return (await db.query(query)).rows;}
try {
await db.exec(readFileSync(new URL('./fixture.sql',import.meta.url),'utf8'));
const initial=await rows();
ok(initial.length>0,'detects missing foreign-key indexes on the exported schema');
for(const table of ['money_bucket_accounts','money_buckets','portfolio_transactions','portfolios','savings_goal_contributions','savings_goals','transactions']){
  ok(initial.some(r=>r.table_name==='public.'+table),'covers screenshot table '+table);
}
ok(initial.every(r=>r.status==='READY' && r.create_index_sql.startsWith('CREATE INDEX CONCURRENTLY ')),'emits standalone concurrent commands');
ok(!initial.some(r=>r.table_name==='public.money_bucket_accounts' && r.foreign_key_columns==='user_id'),'existing primary-key leading column covers its foreign key');
await db.exec(`create index alternative_long_name on public.transactions(user_id,created_at);
create index reversed_fk_order on public.money_bucket_accounts(user_id,bucket_id);
create index include_only on public.savings_goals(id) include(user_id);
create index trailing_only on public.transactions(created_at,account_id);
create index partial_only on public.transactions(category_id) where amount>0;
create index expression_after_prefix on public.categories(user_id,lower(name));`);
let current=await rows();
ok(!current.some(r=>r.table_name==='public.transactions' && r.foreign_key_columns==='user_id'),'recognizes longer index with alternate name');
ok(!current.some(r=>r.table_name==='public.money_bucket_accounts' && r.foreign_key_columns==='bucket_id, user_id'),'recognizes reversed leading composite-key order');
ok(!current.some(r=>r.table_name==='public.categories' && r.foreign_key_columns==='user_id'),'recognizes FK prefix with trailing index expression');
ok(current.some(r=>r.table_name==='public.savings_goals' && r.foreign_key_columns==='user_id'),'does not mistake INCLUDE columns for searchable keys');
ok(current.some(r=>r.table_name==='public.transactions' && r.foreign_key_columns==='account_id'),'does not mistake trailing columns for leading keys');
ok(current.some(r=>r.table_name==='public.transactions' && r.foreign_key_columns==='category_id'),'does not mistake partial index for full coverage');
const target=current.find(r=>r.table_name==='public.transactions' && r.foreign_key_columns==='account_id');
const name=target.create_index_sql.match(/CONCURRENTLY (\S+) ON/)[1];
await db.exec(`create table public.${name}(id integer)`);
let conflict=(await rows()).find(r=>r.foreign_key===target.foreign_key && r.table_name===target.table_name);
ok(conflict.status==='REVIEW_EXISTING_NAME' && conflict.create_index_sql===null && conflict.inspect_existing_sql,'name collision is flagged instead of skipped');
await db.exec(`drop table public.${name}`);
await db.exec('create table public.fk_test_parent(id integer primary key); create table public.fk_test_partitioned(parent_id integer references public.fk_test_parent(id)) partition by range(parent_id)');
ok((await rows()).some(r=>r.table_name==='public.fk_test_partitioned' && r.status==='REVIEW_PARTITIONED_TABLE' && r.create_index_sql===null),'partitioned parent gets manual review instead of unsupported concurrent command');
await db.exec('drop table public.fk_test_partitioned; drop table public.fk_test_parent');
// A failed concurrent build can leave an invalid index under the intended name.
await db.exec('create table public.fk_invalid_parent(id integer primary key); create table public.fk_invalid_child(parent_id integer references public.fk_invalid_parent(id)); insert into public.fk_invalid_parent values(1); insert into public.fk_invalid_child values(1),(1)');
const invalidTarget=(await rows()).find(r=>r.table_name==='public.fk_invalid_child');
const invalidName=invalidTarget.create_index_sql.match(/CONCURRENTLY (\S+) ON/)[1];
let buildFailed=false;
try{await db.query(invalidTarget.create_index_sql.replace('CREATE INDEX CONCURRENTLY','CREATE UNIQUE INDEX CONCURRENTLY'))}catch{buildFailed=true}
ok(buildFailed,'failed concurrent build is exercised with duplicate values');
const invalidResult=(await rows()).find(r=>r.table_name==='public.fk_invalid_child');
ok(invalidResult.status==='REVIEW_EXISTING_NAME' && invalidResult.create_index_sql===null,'invalid leftover index is not treated as usable coverage');
await db.query(`drop index concurrently public.${invalidName}`);
await db.exec('drop table public.fk_invalid_child; drop table public.fk_invalid_parent');

// Execute each command independently, exactly as instructed for the SQL Editor.
for(const row of await rows()){
  assert.equal(row.status,'READY');
  await db.query(row.create_index_sql);
}
ok((await rows()).length===0,'concurrent index commands resolve all missing FK coverage');
ok((await rows()).length===0,'rerunning generator emits no redundant index commands');
const state=(await db.query(readFileSync(dir+'/03-verify.sql','utf8'))).rows[0].security_verification;
ok(state.unindexed_foreign_keys.length===0 && state.invalid_public_indexes.length===0,'verification query reports complete valid FK coverage');
console.log(`COMPLETE: ${checks} index checks passed`);
} finally {await db.close()}
