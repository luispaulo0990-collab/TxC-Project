-- ==============================================================================
-- SISTEMA DE PERMISSÕES TXC POR CARGOS (DEV, ADMIN, MEMBER)
-- Execute este script no SQL Editor do Supabase (projeto TxC)
--
-- CARGOS E PERMISSÕES:
-- 1. DEV:
--    - Acesso total irrestrito ao sistema.
--    - ÚNICO perfil que pode excluir obras permanentemente.
--
-- 2. ADMIN:
--    - Pode criar obras, alterá-las, importar planilhas e exportar relatórios.
--    - NÃO pode excluir obras.
--
-- 3. MEMBER (Visualizador):
--    - Apenas visualiza o planejamento / avanço e exporta informações.
--    - NÃO pode criar obras, alterar dados nem importar planilhas.
-- ==============================================================================

-- 1. Criar ou garantir estrutura da tabela public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  role text not null default 'member',
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

-- Garantir colunas essenciais caso a tabela já existisse
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists created_at timestamptz default timezone('utc'::text, now());
alter table public.profiles add column if not exists updated_at timestamptz default timezone('utc'::text, now());

-- Constraint de cargos permitidos: 'dev', 'admin', 'member'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('dev', 'admin', 'member'));

-- Criar índices para busca rápida
create index if not exists idx_profiles_email on public.profiles(lower(email));
create index if not exists idx_profiles_role on public.profiles(role);

-- ==============================================================================
-- 2. SINCRONIZAÇÃO AUTOMÁTICA DE NOVOS USUÁRIOS (TRIGGER)
-- Todo novo usuário cadastrado no Supabase ganha automaticamente uma linha em profiles
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Se foi passado cargo nos metadados, usa ele; senão o padrão é 'member'
  v_role := coalesce(lower(new.raw_user_meta_data->>'role'), 'member');
  if v_role not in ('dev', 'admin', 'member') then
    v_role := 'member';
  end if;

  insert into public.profiles (id, email, nome, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    v_role,
    now(),
    now()
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 3. BACKFILL: Sincronizar todos os usuários já existentes no auth.users
-- ==============================================================================
insert into public.profiles (id, email, nome, role, created_at, updated_at)
select 
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  case 
    when lower(coalesce(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', '')) in ('dev', 'admin', 'member') 
      then lower(coalesce(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role'))
    else 'member'
  end,
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update
set 
  email = excluded.email,
  updated_at = now();

-- ==============================================================================
-- 4. FUNÇÃO FACILITADORA: DEFINIR CARGO DE USUÁRIO (POR EMAIL OU ID)
-- Permite trocar o cargo de forma simples:
-- Exemplo: SELECT public.definir_cargo('luispaulo@exemplo.com', 'dev');
-- ==============================================================================
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
  -- 1. Normalizar o cargo solicitado
  v_cargo_limpo := lower(trim(p_novo_cargo));
  if v_cargo_limpo not in ('dev', 'admin', 'member') then
    raise exception 'Cargo inválido: "%". Utilize apenas: dev, admin ou member.', p_novo_cargo;
  end if;

  -- 2. Tentar localizar por E-MAIL ou por UUID
  select id, email into v_user_id, v_email
  from auth.users
  where lower(trim(email)) = lower(trim(p_usuario))
     or id::text = trim(p_usuario)
  limit 1;

  if v_user_id is null then
    -- Tenta encontrar na tabela profiles se auth.users não retornou
    select id, email into v_user_id, v_email
    from public.profiles
    where lower(trim(email)) = lower(trim(p_usuario))
       or id::text = trim(p_usuario)
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'Usuário "%" não foi encontrado no sistema.', p_usuario;
  end if;

  -- 3. Atualizar public.profiles
  insert into public.profiles (id, email, role, updated_at)
  values (v_user_id, v_email, v_cargo_limpo, now())
  on conflict (id) do update
  set 
    role = v_cargo_limpo,
    email = coalesce(v_email, profiles.email),
    updated_at = now();

  -- 4. Atualizar metadados no auth.users para que JWT e sessões fiquem 100% sincronizados
  update auth.users
  set 
    raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(v_cargo_limpo)),
    raw_app_meta_data  = jsonb_set(coalesce(raw_app_meta_data,  '{}'::jsonb), '{role}', to_jsonb(v_cargo_limpo))
  where id = v_user_id;

  return format('Sucesso! O usuário %s (%s) agora possui o cargo [%s].', coalesce(v_email, 'id: ' || v_user_id::text), v_user_id, upper(v_cargo_limpo));
end;
$$;

-- ==============================================================================
-- 5. VIEW PARA VISUALIZAÇÃO FÁCIL DOS USUÁRIOS E SEUS CARGOS
-- Para listar todos: SELECT * FROM public.vw_usuarios;
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
  p.updated_at as ultima_alteracao
from public.profiles p
order by 
  case when p.role = 'dev' then 1 when p.role = 'admin' then 2 else 3 end,
  p.email;

-- ==============================================================================
-- 6. FUNÇÃO DE SUPORTE AO RLS: CONSULTAR CARGO ATUAL DO USUÁRIO
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
begin
  if uid is null then
    return 'member';
  end if;

  select role into v_role
  from public.profiles
  where id = uid;

  return coalesce(v_role, 'member');
end;
$$;

-- ==============================================================================
-- 7. ATIVAÇÃO DE RLS E POLÍTICAS DE ACESSO
-- ==============================================================================
alter table if exists public.profiles enable row level security;
alter table if exists public.projetos enable row level security;
alter table if exists public.atividades enable row level security;
alter table if exists public.historico_avanco enable row level security;

-- ─── Policies: public.profiles ───
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_policy" on public.profiles
  for update using (
    auth.uid() = id or public.get_user_role(auth.uid()) = 'dev'
  );

-- ─── Policies: public.projetos ───
-- Leitura: Dev, Admin e Membro podem visualizar
drop policy if exists "projetos_select_all" on public.projetos;
drop policy if exists "projetos_select_role" on public.projetos;
drop policy if exists "projetos_select_own" on public.projetos;
create policy "projetos_select_role" on public.projetos
  for select using (true);

-- Criação: Apenas Dev e Admin
drop policy if exists "projetos_insert_all" on public.projetos;
drop policy if exists "projetos_insert_role" on public.projetos;
drop policy if exists "projetos_insert_own" on public.projetos;
create policy "projetos_insert_role" on public.projetos
  for insert with check (
    public.get_user_role(auth.uid()) in ('dev', 'admin')
  );

-- Edição: Apenas Dev e Admin
drop policy if exists "projetos_update_all" on public.projetos;
drop policy if exists "projetos_update_role" on public.projetos;
drop policy if exists "projetos_update_own" on public.projetos;
create policy "projetos_update_role" on public.projetos
  for update
  using (public.get_user_role(auth.uid()) in ('dev', 'admin'))
  with check (public.get_user_role(auth.uid()) in ('dev', 'admin'));

-- Exclusão: EXCLUSIVAMENTE DEV pode apagar obras
drop policy if exists "projetos_delete_all" on public.projetos;
drop policy if exists "projetos_delete_role" on public.projetos;
drop policy if exists "projetos_delete_own" on public.projetos;
create policy "projetos_delete_role" on public.projetos
  for delete using (
    public.get_user_role(auth.uid()) = 'dev'
  );

-- ─── Policies: public.atividades ───
drop policy if exists "atividades_select_role" on public.atividades;
drop policy if exists "atividades_all" on public.atividades;
create policy "atividades_select_role" on public.atividades
  for select using (true);

drop policy if exists "atividades_write_role" on public.atividades;
drop policy if exists "atividades_insert_role" on public.atividades;
drop policy if exists "atividades_update_role" on public.atividades;
drop policy if exists "atividades_delete_role" on public.atividades;
create policy "atividades_write_role" on public.atividades
  for all
  using (public.get_user_role(auth.uid()) in ('dev', 'admin'))
  with check (public.get_user_role(auth.uid()) in ('dev', 'admin'));

-- ─── Policies: public.historico_avanco ───
drop policy if exists "historico_avanco_select" on public.historico_avanco;
create policy "historico_avanco_select" on public.historico_avanco
  for select using (true);

drop policy if exists "historico_avanco_write" on public.historico_avanco;
create policy "historico_avanco_write" on public.historico_avanco
  for all
  using (public.get_user_role(auth.uid()) in ('dev', 'admin'))
  with check (public.get_user_role(auth.uid()) in ('dev', 'admin'));

-- ==============================================================================
-- EXEMPLOS PRÁTICOS DE USO (Copie, altere o email e execute no SQL Editor):
--
-- 1) Ver todos os usuários e seus cargos atuais:
--    SELECT * FROM public.vw_usuarios;
--
-- 2) Promover o seu usuário para DEV (Acesso total + pode excluir obras):
--    SELECT public.definir_cargo('seu-email@gmail.com', 'dev');
--
-- 3) Definir um usuário como ADMIN (Criar, editar, importar, exportar):
--    SELECT public.definir_cargo('engenheiro@empresa.com', 'admin');
--
-- 4) Definir um usuário como MEMBRO (Apenas visualizador + exportar):
--    SELECT public.definir_cargo('cliente@empresa.com', 'member');
-- ==============================================================================
