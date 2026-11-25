-- ==============================================================================
-- MIGRAÇÃO: TRILHA DE NOVIDADES (vista uma vez por perfil) · TXC
-- Execute este script no SQL Editor do Supabase (projeto TxC).
-- Pode ser executado mais de uma vez com segurança.
--
-- novidades_vistas guarda a versão da última trilha de novidades que o usuário
-- já viu (ex.: '2026-11-v2'). Quando o app publicar uma versão nova da trilha,
-- ela aparece de novo uma única vez para cada perfil.
--
-- Cada usuário já pode atualizar a própria linha em public.profiles
-- (política profiles_update_policy), então não é preciso nova política.
-- ==============================================================================

alter table public.profiles add column if not exists novidades_vistas text;

-- Atualiza o cache da API para a coluna nova aparecer na hora
notify pgrst, 'reload schema';
