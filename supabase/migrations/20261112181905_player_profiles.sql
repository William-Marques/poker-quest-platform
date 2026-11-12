begin;

create schema if not exists poker_quest_private;
revoke all on schema poker_quest_private from public;

create table public.player_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  plan text not null default 'free',
  constraint player_profiles_username_format check (username collate "C" ~ '^[a-z0-9_]{3,24}$'),
  constraint player_profiles_username_unique unique (username),
  constraint player_profiles_plan_free check (plan = 'free')
);

alter table public.player_profiles enable row level security;
revoke all on public.player_profiles from public, anon, authenticated;
grant select on public.player_profiles to authenticated;
grant update (username) on public.player_profiles to authenticated;

create policy player_profiles_select_own on public.player_profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy player_profiles_update_own on public.player_profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function poker_quest_private.create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

revoke all on function poker_quest_private.create_player_profile() from public, anon, authenticated;

create trigger poker_quest_create_player_profile
  after insert on auth.users
  for each row execute function poker_quest_private.create_player_profile();

-- Contas anteriores à migration recebem um nome provisório que podem alterar.
insert into public.player_profiles (id, username)
select id, 'jogador_' || row_number() over (order by id)
from auth.users;

-- O RPC divulga somente a disponibilidade de um nome, sem ler perfis pela API.
create function poker_quest_private.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(candidate collate "C" ~ '^[a-z0-9_]{3,24}$', false)
    and not exists (
      select 1 from public.player_profiles where username = candidate
    );
$$;

revoke all on function poker_quest_private.username_available(text) from public, anon, authenticated;
grant usage on schema poker_quest_private to anon, authenticated;
grant execute on function poker_quest_private.username_available(text) to anon, authenticated;

create function public.is_username_available(candidate text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select poker_quest_private.username_available(candidate);
$$;

revoke all on function public.is_username_available(text) from public, anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;

commit;
