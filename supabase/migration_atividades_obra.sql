-- ============================================================
-- Migration: Persistência de Atividades com Identificação da Obra
-- Execute este script no SQL Editor do Supabase para que a tabela
-- de atividades contenha todas as colunas necessárias e seja
-- visível em qual obra (projeto) cada atividade foi criada.
-- ============================================================

-- 1. Cria a tabela de atividades caso não exista
create table if not exists public.atividades (
  id text primary key default gen_random_uuid()::text,
  projeto_id text references public.projetos(id) on delete cascade,
  nome text not null default 'Nova atividade',
  user_id uuid references auth.users(id) on delete set null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Adiciona colunas para identificar claramente a obra e detalhes da atividade
alter table public.atividades add column if not exists projeto_nome text;
alter table public.atividades add column if not exists obra_nome text;
alter table public.atividades add column if not exists torre_id text;
alter table public.atividades add column if not exists torre_nome text;
alter table public.atividades add column if not exists data_inicio text;
alter table public.atividades add column if not exists data_fim text;
alter table public.atividades add column if not exists avanco numeric default 0;
alter table public.atividades add column if not exists cor text;
alter table public.atividades add column if not exists modo text default 'LINHA';

-- 3. Cria índices para busca rápida por obra e por atividade
create index if not exists idx_atividades_projeto_id on public.atividades(projeto_id);
create index if not exists idx_atividades_projeto_nome on public.atividades(projeto_nome);
create index if not exists idx_atividades_obra_nome on public.atividades(obra_nome);

-- 4. Habilita Row Level Security e concede permissões globais
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

-- 5. Sincronização inicial (Backfill): migra todas as atividades das obras existentes para a tabela
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
  coalesce(ativ->>'id', gen_random_uuid()::text) as id,
  p.id as projeto_id,
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
