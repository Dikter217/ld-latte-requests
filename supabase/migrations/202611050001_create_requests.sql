-- LD LATTE / Requests. Run in Supabase Dashboard -> SQL Editor.
-- Idempotent on a fresh project. If you already created a different table
-- called public.requests, inspect it before running this migration.

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  category text not null check (category in ('bot', 'integration', 'report', 'other')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_user_created_idx
  on public.requests (user_id, created_at desc);
create index if not exists requests_user_status_idx
  on public.requests (user_id, status);

-- Every inserted request starts as 'new', even if a client sends another status.
create or replace function public.requests_force_new_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'new';
  return new;
end;
$$;

drop trigger if exists requests_force_new_status_trigger on public.requests;
create trigger requests_force_new_status_trigger
  before insert on public.requests
  for each row execute function public.requests_force_new_status();

create or replace function public.requests_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists requests_touch_updated_at_trigger on public.requests;
create trigger requests_touch_updated_at_trigger
  before update on public.requests
  for each row execute function public.requests_touch_updated_at();

-- Grants AND RLS are both required for security.
alter table public.requests enable row level security;
revoke all on table public.requests from public, anon, authenticated;
grant select, insert, update, delete on table public.requests to authenticated;

drop policy if exists "Users can view own requests" on public.requests;
create policy "Users can view own requests"
  on public.requests for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own requests" on public.requests;
create policy "Users can create own requests"
  on public.requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can edit own requests" on public.requests;
create policy "Users can edit own requests"
  on public.requests for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own requests" on public.requests;
create policy "Users can delete own requests"
  on public.requests for delete to authenticated
  using ((select auth.uid()) = user_id);

-- After migration, test with two distinct authenticated users.
-- Neither should see/change/delete requests belonging to the other.
