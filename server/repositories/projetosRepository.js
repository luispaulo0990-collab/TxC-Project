// server/repositories/projetosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const projetosRepository = {
  /** Retorna todas as obras cadastradas (visão compartilhada da equipe) */
  async getAll(filterUserId = null) {
    let query = supabaseAdmin
      .from('projetos')
      .select('id, nome, updated_at, created_at, user_id, grupo_id, dados')
      .order('updated_at', { ascending: false });

    if (filterUserId) {
      query = query.eq('user_id', filterUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar projetos no Supabase:', error);
      throw error;
    }
    return data ?? [];
  },

  async getById(id) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Erro ao buscar projeto por ID no Supabase:', error);
      throw error;
    }
    return data ?? null;
  },

  /** Upsert de projeto — persiste no Supabase associado ao usuário */
  async upsert(projeto, userId = null, grupoId = null) {
    const effectiveUserId = userId || projeto.user_id || null;
    const effectiveGrupoId = grupoId || projeto.grupo_id || null;

    const dados = {
      ...(projeto.dados || projeto),
      id: projeto.id,
      user_id: effectiveUserId,
    };

    const payload = {
      id: projeto.id,
      nome: projeto.nome || 'Sem nome',
      dados,
      ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
      ...(effectiveGrupoId ? { grupo_id: effectiveGrupoId } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('projetos')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Erro ao salvar projeto no Supabase:', error);
      throw error;
    }
    return data?.[0];
  },

  async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao excluir projeto no Supabase:', error);
      throw error;
    }
    return data?.[0];
  },
};

