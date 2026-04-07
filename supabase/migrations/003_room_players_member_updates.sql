drop policy if exists "room_players_update_self" on public.room_players;
create policy "room_players_update_room_members"
on public.room_players
for update
to authenticated
using (
  exists (
    select 1
    from public.room_players rp
    where rp.room_id = room_players.room_id
      and rp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.room_players rp
    where rp.room_id = room_players.room_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists "room_players_delete_self" on public.room_players;
create policy "room_players_delete_self"
on public.room_players
for delete
to authenticated
using (auth.uid() = user_id);
