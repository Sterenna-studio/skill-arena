-- BZH Bourse — RLS + RPC (squelettes)
-- Activer RLS sur les tables sensibles
alter table orders enable row level security;
alter table trades enable row level security;
alter table portfolios enable row level security;
alter table gold_ledger enable row level security;
alter table players_gold_snapshots enable row level security;

-- Politiques (Supabase: auth.uid())
create policy "orders_self" on orders
for all using (player_id = auth.uid());

create policy "trades_self" on trades
for select using (exists (select 1 from orders o where o.id = trades.order_id and o.player_id = auth.uid()));

create policy "portfolios_self" on portfolios
for all using (player_id = auth.uid());

create policy "gold_ledger_self" on gold_ledger
for all using (player_id = auth.uid());

create policy "snapshots_self" on players_gold_snapshots
for select using (player_id = auth.uid());

-- Lecture publique pour données de marché
alter table tickers enable row level security;
alter table prices_ticks enable row level security;
alter table prices_candles_5m enable row level security;
alter table market_events enable row level security;

create policy "market_public_read_tickers" on tickers
for select using (true);
create policy "market_public_read_ticks" on prices_ticks
for select using (true);
create policy "market_public_read_candles" on prices_candles_5m
for select using (true);
create policy "market_public_read_events" on market_events
for select using (true);

-- RPC award gold (liaison avec table players)
create or replace function rpc_award_gold(
  p_player_id uuid,
  p_delta int,
  p_source text,
  p_ref text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
as $$
begin
  insert into gold_ledger(player_id, delta, source, ref, metadata)
  values (p_player_id, p_delta, p_source, p_ref, coalesce(p_metadata,'{}'::jsonb));
  -- Met à jour le solde dans players (existant dans ton schéma)
  update players set gold = greatest(0, coalesce(gold,0) + p_delta)
  where id = p_player_id;
exception when unique_violation then
  -- idempotent
  return;
end;
$$;

-- RPC place order (achat/vente au spot)
create or replace function rpc_place_order(
  p_side text,
  p_ticker uuid,
  p_qty numeric,
  p_ref text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_player uuid := auth.uid();
  v_price numeric;
  v_fee_bp int := 50;
  v_cost numeric;
  v_fee numeric;
  v_order uuid;
begin
  if p_side not in ('buy','sell') then
    raise exception 'invalid side';
  end if;

  -- Spot = dernier prix connu
  select price into v_price
  from prices_ticks
  where ticker_id = p_ticker
  order by ts desc limit 1;
  if v_price is null then
    raise exception 'no price for ticker';
  end if;

  v_cost := p_qty * v_price;
  v_fee  := (v_cost * v_fee_bp) / 10000.0;

  if p_side = 'buy' then
    perform rpc_award_gold(v_player, -ceil(v_cost+v_fee), 'market:trade', p_ref, jsonb_build_object('side','buy','ticker',p_ticker,'qty',p_qty,'price',v_price));
  else
    perform rpc_award_gold(v_player, ceil(v_cost-v_fee), 'market:trade', p_ref, jsonb_build_object('side','sell','ticker',p_ticker,'qty',p_qty,'price',v_price));
  end if;

  insert into orders(player_id, ticker_id, side, qty, fee_bp, status, ref)
  values (v_player, p_ticker, p_side, p_qty, v_fee_bp, 'filled', p_ref)
  on conflict (player_id, ref) do update set updated_at = now()
  returning id into v_order;

  insert into trades(order_id, ticker_id, price, qty, fee)
  values (v_order, p_ticker, v_price, p_qty, v_fee);

  -- Upsert portfolio
  insert into portfolios(player_id, ticker_id, qty, avg_cost)
  values (v_player, p_ticker, case when p_side='buy' then p_qty else -p_qty end, v_price)
  on conflict (player_id, ticker_id) do update set
    qty = portfolios.qty + (case when excluded.avg_cost = v_price and p_side='buy' then excluded.qty else (case when p_side='buy' then p_qty else -p_qty end) end),
    avg_cost = case
      when p_side='buy' then
        case when (portfolios.qty + p_qty) <= 0 then v_price
             else ((portfolios.avg_cost * greatest(portfolios.qty,0)) + (v_price * p_qty)) / nullif(greatest(portfolios.qty + p_qty,0),0)
        end
      else portfolios.avg_cost
    end;

  return v_order;
end;
$$;
