begin;

do $$
begin
  if has_function_privilege('anon', 'public.consume_recovery_authorization(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.consume_recovery_authorization(uuid)', 'execute')
    or has_table_privilege('anon', 'poker_quest_private.recovery_consumptions', 'select,insert')
    or has_table_privilege('authenticated', 'poker_quest_private.recovery_consumptions', 'select,insert')
  then
    raise exception 'Permissões de consumo indevidas';
  end if;
end;
$$;

set local role service_role;
do $$
declare
  recovery_id uuid := gen_random_uuid();
begin
  if public.consume_recovery_authorization(recovery_id) is distinct from true then
    raise exception 'Primeiro consumo rejeitado';
  end if;
  if public.consume_recovery_authorization(recovery_id) is distinct from false then
    raise exception 'A autorização foi reutilizada';
  end if;
end;
$$;

rollback;

-- Modela falha posterior no Auth: o consumo já foi confirmado.
\set ON_ERROR_STOP on
begin;
set local role service_role;
select gen_random_uuid() as recovery_id \gset
select public.consume_recovery_authorization(:'recovery_id') as consumed \gset
\if :consumed
\else
  select 1 / 0;
\endif
commit;

begin;
set local role service_role;
select public.consume_recovery_authorization(:'recovery_id') as reused \gset
\if :reused
  select 1 / 0;
\endif
rollback;

delete from poker_quest_private.recovery_consumptions where session_id = :'recovery_id';
