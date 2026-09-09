// server/repositories/projetosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const projetosRepository = {
  /** Retorna todas as obras para qualquer usuário/perfil */
  async getAll(_userId = null) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .select('id, nome, updated_at, created_at, user_id, dados')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar projetos no Supabase:', error);
      throw error;
    }
    return data ?? [];
  },

  async getById(id, _userId = null) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Erro ao buscar projeto por ID no Supabase:', error);
      throw error;
    }
    return data;
  },

  /** Upsert de projeto — persiste no Supabase compartilhado */
  async upsert(projeto, userId = null, grupoId = null) {
    const payload = {
      id: projeto.id,
      nome: projeto.nome || 'Sem nome',
      dados: projeto,
      ...(userId ? { user_id: userId } : {}),
      ...(grupoId ? { grupo_id: grupoId } : {}),
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

  async delete(id, _userId = null) {
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

