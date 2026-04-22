delete from public.rooms;

create or replace function public.cleanup_expired_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.rooms
  where created_at <= now() - interval '24 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_expired_rooms() to authenticated;
grant execute on function public.cleanup_expired_rooms() to service_role;

do $cleanup$
declare
  existing_job record;
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      raise notice 'pg_cron no disponible, la limpieza se hara por acceso a rutas: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job in
      select jobid
      from cron.job
      where jobname = 'cleanup-expired-rooms-hourly'
    loop
      perform cron.unschedule(existing_job.jobid);
    end loop;

    perform cron.schedule(
      'cleanup-expired-rooms-hourly',
      '0 * * * *',
      $$select public.cleanup_expired_rooms();$$
    );
  end if;
end
$cleanup$;
