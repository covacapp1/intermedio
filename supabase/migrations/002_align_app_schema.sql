alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dni text,
  add column if not exists email text;

alter table public.rooms
  add column if not exists name text;

create unique index if not exists profiles_dni_key
  on public.profiles (dni)
  where dni is not null;

create unique index if not exists profiles_email_key
  on public.profiles (email)
  where email is not null;

create table if not exists public.kv_store_b530d664 (
  key text primary key,
  value jsonb not null
);
