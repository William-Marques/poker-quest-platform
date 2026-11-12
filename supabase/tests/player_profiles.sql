-- Execute somente em uma instância de teste com a migration aplicada.
begin;

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values
  ('29f501d9-8023-4d45-8b60-298a9462b261', 'pq-sql-a@example.test', '{"username":"pq_sql_a"}', now()),
  ('29f501d9-8023-4d45-8b60-298a9462b262', 'pq-sql-b@example.test', '{"username":"pq_sql_b"}', now());

do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values ('29f501d9-8023-4d45-8b60-298a9462b263', 'pq-sql-c@example.test', '{"username":"pq_sql_a"}');
    raise exception 'O banco aceitou um nome duplicado';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('29f501d9-8023-4d45-8b60-298a9462b264', 'pq-sql-d@example.test', '{"username":"pq_sql_expira"}'),
  ('29f501d9-8023-4d45-8b60-298a9462b265', 'pq-sql-e@example.test', '{"username":"pq_sql_confirma"}');

do $$
begin
  if public.is_username_available('pq_sql_expira') or not exists (
    select 1 from public.player_profiles
    where username = 'pq_sql_expira'
      and username_reserved_until between clock_timestamp() + interval '23 hours'
        and clock_timestamp() + interval '24 hours'
  ) then raise exception 'Reserva temporária incorreta'; end if;
end;
$$;

update public.player_profiles set username_reserved_until = clock_timestamp() - interval '1 second'
where username = 'pq_sql_expira';
update public.player_profiles set username_reserved_until = clock_timestamp() + interval '5 seconds'
where username = 'pq_sql_confirma';
update auth.users set email_confirmed_at = clock_timestamp()
where id = '29f501d9-8023-4d45-8b60-298a9462b265';

do $$
begin
  if not public.is_username_available('pq_sql_expira') then
    raise exception 'Reserva expirada ainda aparece como ocupada';
  end if;
  perform poker_quest_private.reclaim_username('pq_sql_confirma', clock_timestamp() + interval '24 hours');
  if public.is_username_available('pq_sql_confirma') or not exists (
    select 1 from public.player_profiles
    where username = 'pq_sql_confirma' and username_confirmed and username_reserved_until is null
  ) then raise exception 'Nome confirmado perto da expiração foi liberado'; end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values ('29f501d9-8023-4d45-8b60-298a9462b266', 'pq-sql-f@example.test', '{"username":"pq_sql_expira"}');
update auth.users set email_confirmed_at = clock_timestamp()
where id = '29f501d9-8023-4d45-8b60-298a9462b264';

set local role authenticated;
select set_config('request.jwt.claim.sub', '29f501d9-8023-4d45-8b60-298a9462b264', true);
do $$
begin
  if not exists (select id from public.player_profiles where id = auth.uid() and username is null) then
    raise exception 'Confirmação tardia deve preservar conta sem recuperar a reserva';
  end if;
  update public.player_profiles set username = 'pq_sql_primeiro' where id = auth.uid();
  if not found or exists (
    select id from public.player_profiles where id = auth.uid() and username_changed_at is not null
  ) then raise exception 'Primeira definição foi bloqueada ou contou como troca'; end if;
end;
$$;
reset role;

set local role anon;
do $$
begin
  if public.is_username_available('pq_sql_a') or not public.is_username_available('pq_sql_livre') then
    raise exception 'Disponibilidade incorreta';
  end if;
  begin
    perform id from public.player_profiles;
    raise exception 'Visitante conseguiu ler perfis';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '29f501d9-8023-4d45-8b60-298a9462b261', true);

do $$
begin
  if (select array_agg(username) from public.player_profiles) is distinct from array['pq_sql_a'] then
    raise exception 'A conta deveria ver somente seu perfil';
  end if;
  update public.player_profiles set username = 'pq_sql_outro' where id = '29f501d9-8023-4d45-8b60-298a9462b262';
  if found then
    raise exception 'A conta alterou o perfil de outra pessoa';
  end if;
  update public.player_profiles set username = 'pq_sql_novo' where id = auth.uid();
  if not found then
    raise exception 'A conta não conseguiu alterar seu nome';
  end if;
  begin
    update public.player_profiles set username = 'pq_sql_cedo' where id = auth.uid();
    raise exception 'A conta alterou o nome antes de 30 dias';
  exception when sqlstate 'PQ030' then
    null;
  end;
  begin
    update public.player_profiles set username_changed_at = null where id = auth.uid();
    raise exception 'A conta alterou a data da última troca';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.player_profiles set plan = 'premium' where id = auth.uid();
    raise exception 'A conta alterou o próprio plano';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
update public.player_profiles set username_changed_at = now() - interval '720 hours'
where id = '29f501d9-8023-4d45-8b60-298a9462b261';
set local role authenticated;
do $$
begin
  update public.player_profiles set username = 'pq_sql_apos_30' where id = auth.uid();
  if not found then raise exception 'Troca após 30 dias foi bloqueada'; end if;
end;
$$;

rollback;
