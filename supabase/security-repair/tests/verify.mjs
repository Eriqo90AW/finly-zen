import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const db = new PGlite();
const dir=fileURLToPath(new URL('../',import.meta.url));
const main=readFileSync(dir+'/01-core-security.sql','utf8');
const journal=readFileSync(dir+'/02-trading-journal.sql','utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const AA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',AB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CA='cccccccc-cccc-4ccc-8ccc-cccccccccccc',CB='dddddddd-dddd-4ddd-8ddd-dddddddddddd',CS='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PA='aaaaaaaa-1111-4111-8111-111111111111',PB='bbbbbbbb-1111-4111-8111-111111111111';
const GA='aaaaaaaa-2222-4222-8222-222222222222',GB='bbbbbbbb-2222-4222-8222-222222222222';
const TA='aaaaaaaa-3333-4333-8333-333333333333',TB='bbbbbbbb-3333-4333-8333-333333333333';
let checks=0;
function ok(value,label){assert.ok(value,label); checks++; console.log('PASS '+label);}
async function count(sql){return Number((await db.query(sql)).rows[0].n);}
async function denied(sql,label){let rejected=false;try{await db.exec(sql)}catch{rejected=true}ok(rejected,label)}
async function as(role,uid,fn){await db.exec('set role '+role);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role,sub:uid})]);try{return await fn()}finally{await db.exec('reset role')}}
try {
await db.exec(readFileSync(new URL('./fixture.sql',import.meta.url),'utf8'));
await db.exec(`insert into auth.users(id,email) values('${A}','a@example.test'),('${B}','b@example.test');
insert into public.accounts(id,user_id,name,type) values('${AA}','${A}','A','cash'),('${AB}','${B}','B','cash');
insert into public.categories(id,user_id,name) values('${CA}','${A}','A'),('${CB}','${B}','B'),('${CS}',null,'Shared');
insert into public.portfolios(id,user_id,name,base_currency) values('${PA}','${A}','A','IDR'),('${PB}','${B}','B','IDR');
insert into public.assets(ticker,name,type,current_price) values('IDR','Rupiah','CASH',1),('TEST','Test','US_STOCK',10);
insert into public.portfolio_transactions(id,portfolio_id,asset_ticker,type,qty,price_per_unit,settlement_currency) values('${TA}','${PA}','TEST','BUY',2,5,'IDR'),('${TB}','${PB}','TEST','BUY',3,5,'IDR');
insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AA}','${CA}','A expense',10),('${B}','${AB}','${CB}','B expense',20);
insert into public.savings_goals(id,user_id,name,target,target_date) values('${GA}','${A}','A goal',1000,'2027-01-01'),('${GB}','${B}','B goal',1000,'2027-01-01');
insert into public.trading_journal(trade_date,ticker) select '2026-10-01','TEST' from generate_series(1,74);`);
// Existing cross-tenant references cause a full rollback, not hidden records.
await db.exec(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AB}','${CA}','bad ownership',1)`);
await denied(main,'preflight rejects existing cross-user account references');await db.exec('rollback');
await db.exec("delete from public.transactions where name='bad ownership'");
await db.exec(main);
ok(await count("select count(*) n from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity and relname<>'trading_journal'")===0,'RLS enabled on all 16 core tables');
ok(await count("select count(*) n from pg_class where relnamespace='public'::regnamespace and relkind='v' and reloptions @> array['security_invoker=true']")===2,'both views use invoker security');
ok(await count("select count(*) n from pg_views where schemaname='public' and definition like '%auth.users%'")===0,'views no longer reference auth.users');
await as('anon',null,async()=>{
await denied('select * from public.transactions','anonymous transaction access denied');
await denied('select * from public.view_transactions_detailed','anonymous detailed view access denied');
ok(await count('select count(*) n from public.assets')===2,'anonymous market catalog reads preserved');
await denied("insert into public.assets(ticker,name,type) values('EVIL','Bad','US_STOCK')",'anonymous asset writes denied');
await denied(`select public.water_savings_goal('${GA}','${AA}',1,gen_random_uuid())`,'anonymous savings RPC denied');
});
await as('authenticated',A,async()=>{
ok(await count('select count(*) n from public.transactions')===1,'own transactions visible; other user hidden');
ok(await count(`select count(*) n from public.accounts where user_id='${B}'`)===0,'other accounts hidden');
ok(await count('select count(*) n from public.categories')===2,'own plus shared categories preserved');
ok(await count('select count(*) n from public.portfolio_holdings')===1,'portfolio holdings isolated');
ok(await count(`select count(*) n from public.view_transactions_detailed where user_id='${A}' and user_email is null`)===1,'detailed view preserves own expense and NULL profile fields');
await db.exec(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AA}','${CS}','own shared',2)`);
await denied(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${B}','${AB}','${CB}','spoof',1)`,'spoofed transaction owner rejected');
await denied(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AB}','${CA}','foreign account',1)`,'foreign account reference rejected');
await denied(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AA}','${CB}','foreign category',1)`,'foreign category reference rejected');
await denied(`insert into public.transactions(user_id,account_id,category_id,name,amount) values('${A}','${AA}','${CA}','over limit',100000000001)`,'existing insert amount cap preserved');
await db.exec(`update public.transactions set note='edited' where user_id='${A}'; delete from public.transactions where name='own shared'`);
ok(await count('select count(*) n from public.transactions')===1,'own expense updates and deletes work');
await db.exec(`update public.transactions set name='stolen' where user_id='${B}'; delete from public.transactions where user_id='${B}'`);
await db.exec(`update public.portfolio_transactions set notes='edited thesis' where id='${TA}'`);
ok(await count(`select count(*) n from public.portfolio_transactions where notes='edited thesis'`)===1,'portfolio thesis update works');
await denied(`insert into public.portfolio_transactions(portfolio_id,asset_ticker,type,qty,price_per_unit,settlement_currency) values('${PB}','TEST','BUY',1,1,'IDR')`,'foreign portfolio insert denied');
await denied(`insert into public.portfolio_transactions(portfolio_id,asset_ticker,type,qty,price_per_unit,settlement_currency,linked_transaction_id) values('${PA}','TEST','BUY',1,1,'IDR','${TB}')`,'foreign cascade link denied');
await db.exec(`insert into public.portfolio_transactions(portfolio_id,asset_ticker,type,qty,price_per_unit,settlement_currency,linked_transaction_id) values('${PA}','IDR','WITHDRAWAL',10,1,'IDR','${TA}')`);
await db.exec(`insert into public.assets(ticker,name,type,industry,sector,logo_url,updated_at) values('NEW','New asset','US_STOCK',null,null,null,now()) on conflict(ticker) do update set ticker=excluded.ticker,name=excluded.name,type=excluded.type,industry=excluded.industry,sector=excluded.sector,logo_url=excluded.logo_url,updated_at=excluded.updated_at`);
await db.exec(`insert into public.assets(ticker,name,type,industry,sector,logo_url,updated_at) values('NEW','Updated','US_STOCK',null,null,null,now()) on conflict(ticker) do update set ticker=excluded.ticker,name=excluded.name,type=excluded.type,industry=excluded.industry,sector=excluded.sector,logo_url=excluded.logo_url,updated_at=excluded.updated_at`);
ok(await count("select count(*) n from public.assets where ticker='NEW' and name='Updated'")===1,'frontend asset insert and conflict update work');
await denied("update public.assets set current_price=999 where ticker='TEST'",'client price tampering denied');
await denied("delete from public.assets where ticker='TEST'",'client asset deletion denied');
await denied("update public.assets set ticker='RENAMED' where ticker='NEW'",'client ticker rename denied');
await db.exec(`select public.initialize_money_framework(); select public.initialize_category_budgets('[{"category":"Food","limit":100}]'::jsonb); select public.save_money_bucket(null,'Custom',false,100,1,array['${AA}'::uuid]); select public.import_savings_goals('[]'::jsonb); select public.initialize_savings_garden_starter();`);
ok(await count("select count(*) n from public.money_bucket_accounts")===1,'budget/framework RPC writes work under RLS');
const request='aaaaaaaa-4444-4444-8444-444444444444';
await db.exec(`select public.water_savings_goal('${GA}','${AA}',25,'${request}'); select public.water_savings_goal('${GA}','${AA}',25,'${request}');`);
ok(await count('select count(*) n from public.savings_goal_contributions')===1,'savings contribution RPC is idempotent');
ok(Number((await db.query(`select current_amount from public.get_savings_goals() where id='${GA}'`)).rows[0].current_amount)===25,'savings totals include the contribution');
await denied(`select public.water_savings_goal('${GB}','${AA}',1,gen_random_uuid())`,'foreign savings goal denied');
await denied(`select public.water_savings_goal('${GA}','${AB}',1,gen_random_uuid())`,'foreign savings account denied');
await denied(`insert into public.savings_goal_contributions(transaction_id,goal_id,user_id) values(gen_random_uuid(),'${GA}','${A}')`,'direct contribution forgery denied');
await denied(`update public.transactions set type='income' where id='${request}'`,'savings protection trigger still fires after EXECUTE revocation');
await db.exec('select public.get_ai_spending_summary()');ok(true,'AI summary works with invoker security');
await db.exec(`insert into public.audit_ai_actions(user_id,tool_name,action_type) values('${A}','test','test')`);
await denied("delete from public.audit_ai_actions",'audit-log deletion denied');
await db.exec(`delete from public.portfolio_transactions where id='${TA}'`);
ok(await count('select count(*) n from public.portfolio_transactions')===0,'own portfolio deletion and linked cash cascade work');
});
await as('authenticated',B,async()=>{ok(await count('select count(*) n from public.transactions')===1,'other user expense survives attempted edits/deletes');ok(await count('select count(*) n from public.portfolio_transactions')===1,'other user portfolio survives cascade attempts');ok(await count('select count(*) n from public.savings_goal_contributions')===0,'other user contributions hidden')});
await as('service_role',null,async()=>{ok(await count('select count(*) n from public.transactions')===3,'service-role access preserved');await db.exec("update public.assets set current_price=12 where ticker='TEST'");ok(true,'service-role price updates preserved')});
await db.exec(`insert into auth.users(id,email) values('33333333-3333-4333-8333-333333333333','c@example.test')`);
ok(await count("select count(*) n from public.accounts where user_id='33333333-3333-4333-8333-333333333333'")===1,'new-user account trigger works after EXECUTE revocation');
await denied(journal,'journal repair refuses to guess owners');await db.exec('rollback');
ok(await count('select count(*) n from public.trading_journal where user_id is null')===74,'refused journal repair preserves all 74 unassigned rows');
await db.exec(journal.replace('confirmed_owner uuid := NULL',`confirmed_owner uuid := '${A}'::uuid`));
await as('authenticated',A,async()=>{ok(await count('select count(*) n from public.trading_journal')===74,'confirmed owner sees all reassigned journal records');await db.exec("insert into public.trading_journal(trade_date,ticker) values('2026-11-01','TEST')");ok(await count('select count(*) n from public.trading_journal')===75,'new journal trades default to authenticated owner')});
await as('authenticated',B,async()=>{ok(await count('select count(*) n from public.trading_journal')===0,'other user cannot read reassigned journal records')});
// Both repair scripts can be rerun safely after ownership was resolved.
await db.exec(main);await db.exec(journal);ok(true,'both scripts rerun successfully');
const result=(await db.query(readFileSync(dir+'/03-verify.sql','utf8'))).rows[0].security_verification;
assert.deepEqual(result.tables_without_rls,[]); assert.deepEqual(result.client_truncate_grants,[]); assert.equal(result.asset_price_writable_by_client,false); assert.equal(result.journal_unassigned,0);
ok(true,'read-only verification query reports expected final access');
console.log(`COMPLETE: ${checks} checks passed`);
} finally { await db.close(); }
