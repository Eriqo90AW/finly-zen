-- SQL Editor only. These are private records; review locally.
select u.id as user_id,u.email,
  (select count(*) from public.trading_journal j where j.user_id=u.id) as assigned_trades
from auth.users u order by u.created_at;

-- Recognize the records from their dates, tickers and notes.
select id,trade_date,ticker,notes from public.trading_journal
where user_id is null order by trade_date,id;
