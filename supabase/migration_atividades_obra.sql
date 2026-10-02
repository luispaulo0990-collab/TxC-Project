-- ============================================================
-- Migration: Persistência de Atividades com Identificação da Obra
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Recria a tabela public.atividades com os tipos e colunas corretos
-- (Como as atividades ficam armazenadas com segurança dentro de projetos.dados,
--  o drop/create garante que não haja conflitos de tipo UUID/TEXT anteriores)
drop table if exists public.atividades cascade;

create table public.atividades (
  id text primary key default gen_random_uuid()::text,
  projeto_id text references public.projetos(id) on delete cascade,
  projeto_nome text,
  obra_nome text,
  nome text not null default 'Nova atividade',
  torre_id text,
  torre_nome text,
  data_inicio text,
  data_fim text,
  avanco numeric default 0,
  cor text,
  modo text default 'LINHA',
  user_id uuid references auth.users(id) on delete set null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices para consultas rápidas
create index if not exists idx_atividades_projeto_id on public.atividades(projeto_id);
create index if not exists idx_atividades_projeto_nome on public.atividades(projeto_nome);
create index if not exists idx_atividades_obra_nome on public.atividades(obra_nome);

-- 3. Habilita Row Level Security e permissões de acesso compartilhadas
alter table public.atividades enable row level security;

drop policy if exists "atividades_all" on public.atividades;
drop policy if exists "atividades_select_all" on public.atividades;
drop policy if exists "atividades_insert_all" on public.atividades;
drop policy if exists "atividades_update_all" on public.atividades;
drop policy if exists "atividades_delete_all" on public.atividades;

create policy "atividades_select_all" on public.atividades for select using (true);
create policy "atividades_insert_all" on public.atividades for insert with check (true);
create policy "atividades_update_all" on public.atividades for update using (true) with check (true);
create policy "atividades_delete_all" on public.atividades for delete using (true);

-- 4. Backfill: Popula a tabela com todas as atividades das obras que já existem hoje no banco
insert into public.atividades (
  id,
  projeto_id,
  projeto_nome,
  obra_nome,
  nome,
  torre_id,
  torre_nome,
  data_inicio,
  data_fim,
  avanco,
  cor,
  modo,
  user_id,
  dados,
  updated_at
)
select
  coalesce(ativ->>'id', gen_random_uuid()::text)::text as id,
  p.id::text as projeto_id,
  p.nome as projeto_nome,
  p.nome as obra_nome,
  coalesce(ativ->>'nome', 'Atividade') as nome,
  ativ->>'torreId' as torre_id,
  coalesce(
    (
      select t->>'nome'
      from jsonb_array_elements(coalesce(p.dados->'torres', '[]'::jsonb)) t
      where t->>'id' = ativ->>'torreId'
      limit 1
    ),
    ''
  ) as torre_nome,
  ativ->>'dataIni' as data_inicio,
  ativ->>'dataFim' as data_fim,
  coalesce((ativ->>'avanco')::numeric, 0) as avanco,
  coalesce(ativ->>'cor', '') as cor,
  coalesce(ativ->>'modo', 'LINHA') as modo,
  p.user_id,
  ativ as dados,
  now() as updated_at
from public.projetos p,
     jsonb_array_elements(coalesce(p.dados->'atividades', '[]'::jsonb)) ativ
on conflict (id) do update set
  projeto_id = excluded.projeto_id,
  projeto_nome = excluded.projeto_nome,
  obra_nome = excluded.obra_nome,
  nome = excluded.nome,
  torre_id = excluded.torre_id,
  torre_nome = excluded.torre_nome,
  data_inicio = excluded.data_inicio,
  data_fim = excluded.data_fim,
  avanco = excluded.avanco,
  cor = excluded.cor,
  modo = excluded.modo,
  dados = excluded.dados,
  updated_at = now();
