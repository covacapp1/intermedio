alter table public.rooms
  add column if not exists game_mode text not null default 'pvp',
  add column if not exists ai_state jsonb;

alter table public.rooms
  drop constraint if exists rooms_game_mode_check;

alter table public.rooms
  add constraint rooms_game_mode_check check (game_mode in ('pvp', 'vs_ai'));
