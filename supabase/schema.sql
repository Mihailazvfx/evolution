-- Run this once in Supabase: SQL editor → New query → paste → Run.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own row: read"   on public.user_state for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_state for update using (auth.uid() = user_id);
-- live sync between devices
alter publication supabase_realtime add table public.user_state;
