create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  buy_in numeric(12,2) not null default 0,
  max_players integer not null default 3 check (max_players in (2, 3, 4, 5, 6)),
  pot numeric(12,2) not null default 0,
  round integer not null default 0,
  current_turn_seat integer not null default 0,
  turn_started_at timestamptz,
  deck jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat integer not null,
  is_ready boolean not null default false,
  is_connected boolean not null default true,
  balance numeric(12,2) not null default 0,
  bet numeric(12,2) not null default -1,
  cards jsonb not null default '[]'::jsonb,
  third_card jsonb,
  result text not null default '',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat)
);

create table if not exists public.room_moves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  move_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_moves enable row level security;

drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_public"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "rooms_select_authenticated" on public.rooms;
create policy "rooms_select_authenticated"
on public.rooms
for select
to authenticated
using (true);

drop policy if exists "rooms_insert_owner" on public.rooms;
create policy "rooms_insert_owner"
on public.rooms
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "rooms_update_members_only" on public.rooms;
create policy "rooms_update_members_only"
on public.rooms
for update
to authenticated
using (
  exists (
    select 1
    from public.room_players rp
    where rp.room_id = rooms.id
      and rp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.room_players rp
    where rp.room_id = rooms.id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists "room_players_select_authenticated" on public.room_players;
create policy "room_players_select_authenticated"
on public.room_players
for select
to authenticated
using (true);

drop policy if exists "room_players_insert_self" on public.room_players;
create policy "room_players_insert_self"
on public.room_players
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "room_players_update_self" on public.room_players;
create policy "room_players_update_self"
on public.room_players
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "room_moves_select_authenticated" on public.room_moves;
create policy "room_moves_select_authenticated"
on public.room_moves
for select
to authenticated
using (true);

drop policy if exists "room_moves_insert_self" on public.room_moves;
create policy "room_moves_insert_self"
on public.room_moves
for insert
to authenticated
with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.room_moves;
