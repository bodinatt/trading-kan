-- Trading Kan: Supabase schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. User Settings
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'dark',
  timezone text default 'Local',
  language text default 'en',
  chart_type text default 'candle',
  default_symbol text default 'BTCUSDT',
  default_timeframe text default '1h',
  td_api_key text default '',
  updated_at timestamptz default now()
);

-- 2. User Watchlist
create table if not exists user_watchlist (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_watchlist_user on user_watchlist(user_id);

-- 3. User Alerts
create table if not exists user_alerts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  price numeric default 0,
  condition text not null,
  category text default 'price',
  indicator_type text,
  indicator_value numeric,
  message text default '',
  created_at timestamptz default now()
);

create index if not exists idx_alerts_user on user_alerts(user_id);

-- 4. Row Level Security (RLS) - users can only see their own data
alter table user_settings enable row level security;
alter table user_watchlist enable row level security;
alter table user_alerts enable row level security;

-- Settings policies
create policy "Users can view own settings"
  on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);

-- Watchlist policies
create policy "Users can view own watchlist"
  on user_watchlist for select using (auth.uid() = user_id);
create policy "Users can insert own watchlist"
  on user_watchlist for insert with check (auth.uid() = user_id);
create policy "Users can delete own watchlist"
  on user_watchlist for delete using (auth.uid() = user_id);

-- Alerts policies
create policy "Users can view own alerts"
  on user_alerts for select using (auth.uid() = user_id);
create policy "Users can insert own alerts"
  on user_alerts for insert with check (auth.uid() = user_id);
create policy "Users can delete own alerts"
  on user_alerts for delete using (auth.uid() = user_id);
