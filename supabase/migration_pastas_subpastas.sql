-- ==============================================================================
-- MIGRAÇÃO: SUBPASTAS (PASTAS DENTRO DE PASTAS) NA TELA INICIAL (TXC)
-- Execute este script no SQL Editor do Supabase (projeto TxC),
-- DEPOIS de migration_pastas_obras.sql. Pode ser executado mais de uma vez.
--
-- - public.pastas.parent_id : pasta "mãe" (null = pasta na raiz)
-- - Excluir uma pasta exclui também as subpastas dela (cascata).
--   As obras nunca são excluídas: os vínculos somem e elas voltam para a raiz.
-- ==============================================================================

alter table public.pastas
  add column if not exists parent_id uuid references public.pastas(id) on delete cascade;

create index if not exists idx_pastas_parent_id on public.pastas(parent_id);

-- Uma pasta não pode ser mãe dela mesma
alter table public.pastas drop constraint if exists pastas_parent_diferente;
alter table public.pastas
  add constraint pastas_parent_diferente check (parent_id is null or parent_id <> id);

-- Atualiza o cache da API para a coluna nova aparecer na hora
notify pgrst, 'reload schema';
