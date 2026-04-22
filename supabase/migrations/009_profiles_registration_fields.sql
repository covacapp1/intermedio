alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists dni text,
add column if not exists email text;

create unique index if not exists profiles_dni_unique_idx on public.profiles (dni) where dni is not null and dni <> '';
create unique index if not exists profiles_email_unique_idx on public.profiles (email) where email is not null and email <> '';
