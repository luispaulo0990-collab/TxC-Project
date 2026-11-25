-- ==============================================================================
-- MIGRAÇÃO: LOGIN COM MICROSOFT 365 (ENTRA ID) · TXC
-- Execute este script no SQL Editor do Supabase (projeto TxC).
--
-- - entra_oid     : id da conta Microsoft (gravado no 1º login; buscas seguintes usam ele)
-- - active        : libera/bloqueia o acesso ao app (padrão true: ninguém perde acesso)
-- - last_login_at : último login pela Microsoft
--
-- Quem pode entrar: quem tem linha em public.profiles (com o mesmo e-mail da conta
-- Microsoft) e active = true. Para liberar alguém novo, crie o usuário em
-- Authentication → Users (mesmo e-mail corporativo); o perfil é criado pelo trigger.
-- Para bloquear:   update public.profiles set active = false where email = 'pessoa@...';
-- ==============================================================================

alter table public.profiles add column if not exists entra_oid text;
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists last_login_at timestamptz;

create unique index if not exists idx_profiles_entra_oid on public.profiles(entra_oid) where entra_oid is not null;

-- Os usuários só podem alterar o próprio nome; entra_oid/active/role/last_login_at
-- são gravados pelo servidor (service_role) ou por um Dev.
create or replace function public.profiles_proteger_campos_acesso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.get_user_role(auth.uid()) = 'dev' then
    return new;
  end if;
  new.entra_oid := old.entra_oid;
  new.active := old.active;
  new.last_login_at := old.last_login_at;
  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists trg_profiles_proteger_campos_acesso on public.profiles;
create trigger trg_profiles_proteger_campos_acesso
before update on public.profiles
for each row execute function public.profiles_proteger_campos_acesso();
