-- BZH Bourse — Schéma de base (V0/V1)
-- Compat. Postgres/Supabase. Adapter les noms de schéma si besoin.

create table if not exists tickers (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  name text not null,
  sector text not null,
  lore jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists prices_ticks (
  id bigserial primary key,
  ticker_id uuid not null references tickers(id) on delete cascade,
  ts timestamptz not null,
  price numeric not null,
  spread_bp int not null default 10,
  event_effect jsonb not null default '{}'::jsonb
);
create index if not exists prices_ticks_ticker_ts on prices_ticks(ticker_id, ts desc);

create table if not exists prices_candles_5m (
  ticker_id uuid not null references tickers(id) on delete cascade,
  bucket_ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  vol_est numeric not null default 0,
  primary key (ticker_id, bucket_ts)
);

create table if not exists market_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  scope text not null check (scope in ('global','sector','ticker')),
  target text null, -- sector or symbol per scope
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  issued_by uuid null, -- admin profile id
  created_at timestamptz not null default now()
);

-- Trading & or
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  ticker_id uuid not null references tickers(id),
  side text not null check (side in ('buy','sell')),
  qty numeric not null check (qty > 0),
  limit_price numeric null,
  fee_bp int not null default 50,
  status text not null default 'filled' check (status in ('filled','cancelled')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (player_id, ref)
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  ticker_id uuid not null references tickers(id),
  price numeric not null,
  qty numeric not null,
  fee numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists portfolios (
  player_id uuid not null,
  ticker_id uuid not null references tickers(id),
  qty numeric not null default 0,
  avg_cost numeric not null default 0,
  primary key (player_id, ticker_id)
);

-- Journal de l'or (lier à ton players.gold)
create table if not exists gold_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  delta int not null,
  source text not null,
  ref text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (player_id, ref)
);
create index if not exists gold_ledger_player_ts on gold_ledger(player_id, created_at desc);

create table if not exists players_gold_snapshots (
  player_id uuid not null,
  ts timestamptz not null default now(),
  gold_balance int not null default 0,
  primary key (player_id, ts)
);
