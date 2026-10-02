// server/repositories/macrofluxosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const macrofluxosRepository = {
  /**
   * Retorna todos os macrofluxos cadastrados (biblioteca global)
   */
  async getAll(filterUserId = null) {
    let query = supabaseAdmin
      .from('macrofluxos')
      .select('id, nome, descricao, atividades_padrao, user_id, created_at, updated_at')
      .order('nome', { ascending: true });

    if (filterUserId) {
      query = query.eq('user_id', filterUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar macrofluxos no Supabase:', error);
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao || '',
      atividadesPadrao: row.atividades_padrao || [],
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Retorna um macrofluxo por ID
   */
  async getById(id) {
    const { data, error } = await supabaseAdmin
      .from('macrofluxos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Erro ao buscar macrofluxo por ID no Supabase:', error);
      throw error;
    }

    if (!data) return null;
    return {
      id: data.id,
      nome: data.nome,
      descricao: data.descricao || '',
      atividadesPadrao: data.atividades_padrao || [],
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Cria ou atualiza um macrofluxo
   */
  async upsert(macro, userId = null) {
    const effectiveUserId = userId || macro.user_id || null;
    const payload = {
      id: macro.id,
      nome: macro.nome || 'Novo Macrofluxo',
      descricao: macro.descricao || '',
      atividades_padrao: macro.atividadesPadrao || macro.atividades_padrao || [],
      ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('macrofluxos')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar macrofluxo no Supabase:', error);
      throw error;
    }

    return {
      id: data.id,
      nome: data.nome,
      descricao: data.descricao || '',
      atividadesPadrao: data.atividades_padrao || [],
      user_id: data.user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Exclui um macrofluxo por ID
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('macrofluxos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar macrofluxo no Supabase:', error);
      throw error;
    }

    return true;
  },
};
