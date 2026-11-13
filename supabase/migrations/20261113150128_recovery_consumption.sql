begin;

create table poker_quest_private.recovery_consumptions (
  session_id uuid primary key,
  consumed_at timestamptz not null default clock_timestamp()
);

alter table poker_quest_private.recovery_consumptions enable row level security;
revoke all on poker_quest_private.recovery_consumptions from public, anon, authenticated, service_role;

create function public.consume_recovery_authorization(recovery_session_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with inserted as (
    insert into poker_quest_private.recovery_consumptions (session_id)
    values (recovery_session_id)
    on conflict (session_id) do nothing
    returning 1
  )
  select exists (select 1 from inserted);
$$;

revoke all on function public.consume_recovery_authorization(uuid) from public, anon, authenticated;
grant execute on function public.consume_recovery_authorization(uuid) to service_role;

commit;
