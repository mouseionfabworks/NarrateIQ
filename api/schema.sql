-- NarrateIQ Supabase schema
-- Run in the Supabase SQL editor.

-- Access codes for beta registration gating
create table if not exists access_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  is_active  boolean not null default true,
  used_by    uuid references auth.users(id),
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- User profiles (extend as needed)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  last_active timestamptz,
  created_at  timestamptz not null default now()
);

-- Narrative sessions / feedback log
create table if not exists narrative_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  feedback_type text,         -- 'ready' | 'needed_edits' | 'not_usable'
  created_at    timestamptz not null default now()
);

-- Token usage log (populated by Ticket 015)
create table if not exists token_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tokens_in   integer not null default 0,
  tokens_out  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- RLS: lock down all tables — service role bypasses RLS automatically
alter table access_codes      enable row level security;
alter table profiles          enable row level security;
alter table narrative_sessions enable row level security;
alter table token_logs        enable row level security;
