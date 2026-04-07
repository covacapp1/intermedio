drop policy if exists "rooms_insert_owner" on public.rooms;
drop policy if exists "rooms_update_members_only" on public.rooms;

drop policy if exists "room_players_insert_self" on public.room_players;
drop policy if exists "room_players_update_room_members" on public.room_players;
drop policy if exists "room_players_delete_self" on public.room_players;

drop policy if exists "room_moves_insert_self" on public.room_moves;
