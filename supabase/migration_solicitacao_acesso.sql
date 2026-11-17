-- ==============================================================================
-- SOLICITAÇÃO DE ACESSO (mesmo sistema do Cadastro de Insumos)
-- Execute este script no SQL Editor do Supabase (projeto TxC), DEPOIS de
-- migration_permissoes_roles.sql. Pode ser executado mais de uma vez.
--
-- COMO FUNCIONA:
-- 1. Ninguém cria a própria conta. Na tela de login, "Solicitar acesso" grava um
--    pedido em public.access_requests (status = 'pendente').
-- 2. O dev analisa em Table Editor → access_requests (filtro status = pendente):
--      - aprovar: status = 'aprovado' (e approved_role, se quiser outro cargo)
--      - recusar: status = 'recusado' (notes = observação interna)
--    Atalho: SELECT public.aprovar_acesso('nome@unitaengenharia.com.br');          -- cargo pedido
--            SELECT public.aprovar_acesso('nome@unitaengenharia.com.br', 'admin'); -- outro cargo
-- 3. Convide o e-mail em Authentication → Users → Add user → Send invitation.
--    Ao criar o usuário, o gatilho handle_new_user libera o perfil (active = true)
--    com o cargo aprovado e marca o pedido como 'atendido'.
--    Se o usuário já existia (perfil inativo), aprovar o pedido libera na hora.
-- 4. O link do convite abre o app em "Defina sua senha".
--
-- Usuário sem pedido aprovado fica com perfil INATIVO: o login funciona, mas o app
-- mostra "Acesso aguardando liberação" e ele continua só como visualizador.
-- Bloquear alguém sem apagar histórico: update public.profiles set active = false where email = '...';
--
-- CONFIGURAÇÃO NO PAINEL DO SUPABASE (uma vez):
-- - Authentication → Sign In / Providers → desligue "Allow new users to sign up".
-- - Authentication → URL Configuration:
--     Site URL: https://<seu-app>.vercel.app
--     Redirect URLs: https://<seu-app>.vercel.app/redefinir-senha
--                    http://localhost:5173/redefinir-senha
-- ==============================================================================

-- ==============================================================================
-- 1. PERFIL ATIVO / INATIVO
-- Usuários que já existem continuam liberados (default true só na criação da
-- coluna); daqui para frente o padrão é inativo.
-- ==============================================================================
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles alter column active set default false;

comment on column public.profiles.active is 'false = login válido, mas acesso ainda não liberado (fica como visualizador).';

-- ==============================================================================
-- 2. TABELA DE PEDIDOS DE ACESSO
-- ==============================================================================
create table if not exists public.access_requests (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (email = lower(email) and email like '%_@_%'),
  full_name       text not null,
  requested_role  text not null check (requested_role in ('admin', 'member')),
  message         text,
  status          text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'atendido')),
  approved_role   text check (approved_role in ('dev', 'admin', 'member')),
  notes           text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  fulfilled_at    timestamptz,
  user_id         uuid references auth.users (id) on delete set null
);

comment on table public.access_requests is 'Pedidos de acesso feitos na tela de login. Marque status = aprovado (e approved_role, se quiser outro cargo) e convide o e-mail pelo Supabase Auth.';
comment on column public.access_requests.status is 'pendente | aprovado | recusado | atendido (preenchido sozinho quando o usuário é criado/liberado)';
comment on column public.access_requests.approved_role is 'Cargo liberado: dev | admin | member. Vazio = o cargo pedido.';

-- Só um pedido em aberto por e-mail
create unique index if not exists access_requests_one_open_idx
  on public.access_requests (email) where status in ('pendente', 'aprovado');
create index if not exists access_requests_status_idx
  on public.access_requests (status, created_at);

-- Ninguém do navegador lê ou grava a tabela direto; o pedido entra só pela função solicitar_acesso
alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
grant select, insert, update, delete on public.access_requests to service_role;

-- ==============================================================================
-- 3. APROVAÇÃO: data da análise e liberação de quem já tem usuário
-- ==============================================================================
create or replace function public.access_requests_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if new.status is distinct from old.status and new.status in ('aprovado', 'recusado') then
    new.reviewed_at := now();
  end if;

  -- Aprovado e o usuário já existe (ex.: entrou antes e ficou inativo): libera agora
  if new.status = 'aprovado' and new.status is distinct from old.status then
    select id into v_profile_id from public.profiles where lower(email) = new.email limit 1;
    if v_profile_id is not null then
      update public.profiles
      set role = coalesce(new.approved_role, new.requested_role),
          nome = coalesce(nullif(nome, ''), new.full_name),
          active = true,
          updated_at = now()
      where id = v_profile_id;

      new.status := 'atendido';
      new.fulfilled_at := now();
      new.user_id := v_profile_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists access_requests_review on public.access_requests;
create trigger access_requests_review
  before update on public.access_requests
  for each row execute function public.access_requests_review();

revoke all on function public.access_requests_review() from public, anon, authenticated;

-- ==============================================================================
-- 4. NOVO USUÁRIO: perfil liberado só se houver pedido aprovado
-- (substitui a versão de migration_permissoes_roles.sql, que confiava no cargo
-- enviado nos metadados do cadastro)
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.access_requests%rowtype;
begin
  select * into req
  from public.access_requests
  where email = lower(new.email) and status = 'aprovado'
  order by created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, email, nome, role, active, created_at, updated_at)
    values (new.id, lower(new.email), req.full_name, coalesce(req.approved_role, req.requested_role), true, now(), now())
    on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
        role = excluded.role,
        active = true,
        updated_at = now();

    update public.access_requests
    set status = 'atendido', fulfilled_at = now(), user_id = new.id
    where id = req.id;
  else
    insert into public.profiles (id, email, nome, role, active, created_at, updated_at)
    values (
      new.id,
      lower(new.email),
      coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
      'member',
      false,
      now(),
      now()
    )
    on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ==============================================================================
-- 5. CARGO EFETIVO: perfil inativo vale como visualizador nas políticas RLS
-- ==============================================================================
create or replace function public.get_user_role(uid uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
  v_active boolean;
begin
  if uid is null then
    return 'member';
  end if;

  select role, active into v_role, v_active
  from public.profiles
  where id = uid;

  if v_active is distinct from true then
    return 'member';
  end if;

  return coalesce(v_role, 'member');
end;
$$;

-- ==============================================================================
-- 6. PROTEÇÃO: só o dev (ou o SQL Editor / service role) muda cargo e liberação
-- A policy de update de profiles deixa cada um editar a própria linha; sem isto,
-- qualquer usuário poderia se promover ou se ativar.
-- ==============================================================================
create or replace function public.profiles_protect_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null
     and public.get_user_role(auth.uid()) <> 'dev' then
    raise exception 'ACESSO_NEGADO: somente o dev pode alterar cargo ou liberação de usuários.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_access on public.profiles;
create trigger profiles_protect_access
  before update on public.profiles
  for each row execute function public.profiles_protect_access();

revoke all on function public.profiles_protect_access() from public, anon, authenticated;

-- definir_cargo é security definer: tira do navegador (continua funcionando no SQL Editor)
-- e passa a liberar o perfil junto com o cargo
create or replace function public.definir_cargo(
  p_usuario text,       -- E-mail do usuário OU ID uuid (ex: 'usuario@email.com')
  p_novo_cargo text     -- 'dev', 'admin' ou 'member'
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_cargo_limpo text;
begin
  v_cargo_limpo := lower(trim(p_novo_cargo));
  if v_cargo_limpo not in ('dev', 'admin', 'member') then
    raise exception 'Cargo inválido: "%". Utilize apenas: dev, admin ou member.', p_novo_cargo;
  end if;

  select id, email into v_user_id, v_email
  from auth.users
  where lower(trim(email)) = lower(trim(p_usuario))
     or id::text = trim(p_usuario)
  limit 1;

  if v_user_id is null then
    select id, email into v_user_id, v_email
    from public.profiles
    where lower(trim(email)) = lower(trim(p_usuario))
       or id::text = trim(p_usuario)
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'Usuário "%" não foi encontrado no sistema.', p_usuario;
  end if;

  insert into public.profiles (id, email, role, active, updated_at)
  values (v_user_id, v_email, v_cargo_limpo, true, now())
  on conflict (id) do update
  set
    role = v_cargo_limpo,
    active = true,
    email = coalesce(v_email, profiles.email),
    updated_at = now();

  update auth.users
  set
    raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(v_cargo_limpo)),
    raw_app_meta_data  = jsonb_set(coalesce(raw_app_meta_data,  '{}'::jsonb), '{role}', to_jsonb(v_cargo_limpo))
  where id = v_user_id;

  return format('Sucesso! O usuário %s (%s) agora possui o cargo [%s] e está liberado.', coalesce(v_email, 'id: ' || v_user_id::text), v_user_id, upper(v_cargo_limpo));
end;
$$;

revoke all on function public.definir_cargo(text, text) from public, anon, authenticated;

-- ==============================================================================
-- 7. PEDIDO DE ACESSO PELA TELA DE LOGIN (chamado pelo navegador, sem login)
-- Confere os campos e o domínio corporativo. Pedido repetido é ignorado em
-- silêncio, para a tela não revelar quem já pediu.
-- ==============================================================================
create or replace function public.solicitar_acesso(
  p_nome text,
  p_email text,
  p_cargo text,
  p_mensagem text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Domínios aceitos (mesma lista de src/constants/acesso.js)
  v_dominios text[] := array['unitaengenharia.com.br'];
  v_nome text := trim(coalesce(p_nome, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cargo text := lower(trim(coalesce(p_cargo, '')));
  v_mensagem text := nullif(trim(coalesce(p_mensagem, '')), '');
begin
  if char_length(v_nome) < 3 or char_length(v_nome) > 120 then
    raise exception 'NOME_INVALIDO: informe o nome completo.';
  end if;
  if char_length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'EMAIL_INVALIDO: informe um e-mail válido.';
  end if;
  if split_part(v_email, '@', 2) <> all (v_dominios) then
    raise exception 'EMAIL_NAO_CORPORATIVO: use seu e-mail corporativo.';
  end if;
  if v_cargo not in ('admin', 'member') then
    raise exception 'CARGO_INVALIDO: escolha um perfil válido.';
  end if;
  if char_length(coalesce(v_mensagem, '')) > 1000 then
    raise exception 'MENSAGEM_LONGA: a mensagem pode ter até 1000 caracteres.';
  end if;

  begin
    insert into public.access_requests (email, full_name, requested_role, message)
    values (v_email, v_nome, v_cargo, v_mensagem);
  exception when unique_violation then
    null; -- já existe pedido em aberto para este e-mail
  end;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.solicitar_acesso(text, text, text, text) from public;
grant execute on function public.solicitar_acesso(text, text, text, text) to anon, authenticated;

-- ==============================================================================
-- 8. ATALHO PARA O DEV: APROVAR PEDIDO PELO SQL EDITOR
-- Exemplo: SELECT public.aprovar_acesso('nome@unitaengenharia.com.br', 'admin');
-- Depois convide o e-mail em Authentication → Users (se ainda não tiver usuário).
-- ==============================================================================
create or replace function public.aprovar_acesso(p_email text, p_cargo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_cargo text := nullif(lower(trim(coalesce(p_cargo, ''))), '');
  v_status text;
begin
  if v_cargo is not null and v_cargo not in ('dev', 'admin', 'member') then
    raise exception 'Cargo inválido: "%". Utilize apenas: dev, admin ou member.', p_cargo;
  end if;

  update public.access_requests
  set status = 'aprovado', approved_role = coalesce(v_cargo, approved_role)
  where email = v_email and status = 'pendente'
  returning status into v_status;

  if v_status is null then
    raise exception 'Nenhum pedido pendente para "%".', p_email;
  end if;

  if v_status = 'atendido' then
    return format('Pedido de %s aprovado e usuário já liberado.', v_email);
  end if;
  return format('Pedido de %s aprovado. Agora convide o e-mail em Authentication → Users → Send invitation.', v_email);
end;
$$;

revoke all on function public.aprovar_acesso(text, text) from public, anon, authenticated;

-- ==============================================================================
-- 9. VIEWS DE CONSULTA
-- SELECT * FROM public.vw_usuarios;
-- SELECT * FROM public.vw_solicitacoes_acesso;
-- ==============================================================================
create or replace view public.vw_usuarios as
select
  p.email,
  p.role as cargo,
  case
    when p.role = 'dev' then 'Dev (Acesso Total + Único que pode EXCLUIR obras)'
    when p.role = 'admin' then 'Admin (Criar, Alterar, Importar e Exportar)'
    else 'Membro (Visualização do planejamento/avanço e Exportação)'
  end as permissoes,
  p.nome,
  p.id,
  p.created_at as data_cadastro,
  p.updated_at as ultima_alteracao,
  p.active as ativo
from public.profiles p
order by
  case when p.role = 'dev' then 1 when p.role = 'admin' then 2 else 3 end,
  p.email;

create or replace view public.vw_solicitacoes_acesso
with (security_invoker = true) as
select
  r.status,
  r.email,
  r.full_name as nome,
  r.requested_role as cargo_pedido,
  r.approved_role as cargo_aprovado,
  r.message as mensagem,
  r.notes as observacao,
  r.created_at as pedido_em,
  r.reviewed_at as analisado_em,
  r.fulfilled_at as atendido_em,
  r.id
from public.access_requests r
order by
  case r.status when 'pendente' then 1 when 'aprovado' then 2 else 3 end,
  r.created_at desc;

revoke all on public.vw_solicitacoes_acesso from anon, authenticated;
