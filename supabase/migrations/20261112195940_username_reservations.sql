begin;

lock table auth.users in share row exclusive mode;

create table poker_quest_private.username_settings (
  singleton boolean primary key default true check (singleton),
  reservation_hours integer not null default 24 check (reservation_hours > 0)
);

insert into poker_quest_private.username_settings default values;
revoke all on poker_quest_private.username_settings from public, anon, authenticated;

alter table public.player_profiles
  alter column username drop not null,
  add column username_confirmed boolean not null default false,
  add column username_reserved_until timestamptz,
  add column username_changed_at timestamptz,
  add constraint player_profiles_reservation_state check (
    (username_reserved_until is not null) = (username is not null and not username_confirmed)
  ) not valid;

update public.player_profiles p
set username_confirmed = u.email_confirmed_at is not null,
    username_reserved_until = case when u.email_confirmed_at is null
      then coalesce(u.created_at, transaction_timestamp()) + interval '24 hours' end
from auth.users u
where u.id = p.id;

alter table public.player_profiles validate constraint player_profiles_reservation_state;

revoke select on public.player_profiles from authenticated;
grant select (id, username, plan, username_changed_at) on public.player_profiles to authenticated;

alter policy player_profiles_update_own on public.player_profiles
  using ((select auth.uid()) = id and username_confirmed)
  with check ((select auth.uid()) = id and username_confirmed and username is not null);

-- One transaction lock orders confirmation, reclamation and writes to names.
create function poker_quest_private.lock_username_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(192561247, 1);
  return null;
end;
$$;

create trigger player_profiles_lock_username_writes
  before update on public.player_profiles
  for each statement execute function poker_quest_private.lock_username_writes();

create function poker_quest_private.reclaim_username(candidate text, checked_at timestamptz)
returns void
language sql
set search_path = ''
as $$
  update public.player_profiles
  set username = null, username_reserved_until = null
  where username = candidate and not username_confirmed
    and username_reserved_until <= checked_at;
$$;

create or replace function poker_quest_private.create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text := new.raw_user_meta_data ->> 'username';
  checked_at timestamptz;
  reservation_hours integer;
begin
  perform pg_advisory_xact_lock(192561247, 1);
  checked_at := clock_timestamp();
  if candidate is null or candidate collate "C" !~ '^[a-z0-9_]{3,24}$' then
    raise check_violation using message = 'invalid_username';
  end if;
  perform poker_quest_private.reclaim_username(candidate, checked_at);
  select s.reservation_hours into strict reservation_hours
  from poker_quest_private.username_settings s;
  insert into public.player_profiles (id, username, username_confirmed, username_reserved_until)
  values (new.id, candidate, new.email_confirmed_at is not null,
    case when new.email_confirmed_at is null
      then checked_at + make_interval(hours => reservation_hours) end);
  return new;
end;
$$;

create function poker_quest_private.confirm_player_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_at timestamptz;
begin
  perform pg_advisory_xact_lock(192561247, 1);
  checked_at := clock_timestamp();
  update public.player_profiles
  set username = case when username_reserved_until > checked_at then username end,
      username_confirmed = true,
      username_reserved_until = null
  where id = new.id and not username_confirmed;
  return new;
end;
$$;

create trigger poker_quest_confirm_player_username
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function poker_quest_private.confirm_player_username();

create function poker_quest_private.enforce_username_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_at timestamptz := clock_timestamp();
begin
  if new.username is null or new.username is not distinct from old.username then
    return new;
  end if;
  if not old.username_confirmed then
    raise insufficient_privilege using message = 'username_requires_confirmation';
  end if;
  if old.username_changed_at + interval '720 hours' > checked_at then
    raise sqlstate 'PQ030' using message = 'username_change_cooldown';
  end if;

  perform poker_quest_private.reclaim_username(new.username, checked_at);
  if old.username is not null then
    new.username_changed_at := checked_at;
  end if;
  return new;
end;
$$;

create trigger player_profiles_enforce_username_change
  before update of username on public.player_profiles
  for each row execute function poker_quest_private.enforce_username_change();

revoke all on function poker_quest_private.lock_username_writes() from public, anon, authenticated;
revoke all on function poker_quest_private.reclaim_username(text, timestamptz) from public, anon, authenticated;
revoke all on function poker_quest_private.confirm_player_username() from public, anon, authenticated;
revoke all on function poker_quest_private.enforce_username_change() from public, anon, authenticated;

create or replace function poker_quest_private.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(candidate collate "C" ~ '^[a-z0-9_]{3,24}$', false)
    and not exists (
      select 1 from public.player_profiles
      where username = candidate
        and (username_confirmed or username_reserved_until > statement_timestamp())
    );
$$;

commit;
