-- ==============================================================================
-- CORREÇÃO: TROCA DE CARGO (role) PELO PAINEL DO SUPABASE · TXC
-- Execute este script no SQL Editor do Supabase (projeto TxC).
-- Pode ser executado mais de uma vez com segurança.
--
-- Problema: a proteção criada em migration_entra_login.sql desfazia, sem aviso,
-- qualquer troca de role/active/entra_oid/last_login_at feita pelo Table Editor
-- ou pelo SQL Editor do Supabase (ali não há usuário logado do app, então a
-- alteração era tratada como se viesse de um usuário comum).
--
-- Correção: a proteção vale SOMENTE para alterações feitas por usuários do app
-- (requisições com papel 'authenticated' ou 'anon' via API). O painel do
-- Supabase, o servidor do app (service_role) e os Devs continuam podendo alterar.
-- ==============================================================================

create or replace function public.profiles_proteger_campos_acesso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Painel do Supabase / SQL Editor / servidor (service_role): sem restrição
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Dev logado no app: sem restrição
  if public.get_user_role(auth.uid()) = 'dev' then
    return new;
  end if;

  -- Demais usuários do app: não podem mudar os próprios campos de acesso
  new.entra_oid := old.entra_oid;
  new.active := old.active;
  new.last_login_at := old.last_login_at;
  new.role := old.role;
  return new;
end;
$$;
