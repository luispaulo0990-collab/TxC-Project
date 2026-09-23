// server/repositories/projetosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const projetosRepository = {
  /** Retorna as obras pertencentes ao usuário autenticado ou aos seus grupos */
  async getAll(userId = null) {
    let query = supabaseAdmin
      .from('projetos')
      .select('id, nome, updated_at, created_at, user_id, grupo_id, dados')
      .order('updated_at', { ascending: false });

    if (userId) {
      // Buscar grupos dos quais o usuário é membro
      try {
        const { data: membroGrupos } = await supabaseAdmin
          .from('grupo_membros')
          .select('grupo_id')
          .eq('user_id', userId);

        const grupoIds = (membroGrupos || []).map((m) => m.grupo_id).filter(Boolean);

        if (grupoIds.length > 0) {
          query = query.or(`user_id.eq.${userId},grupo_id.in.(${grupoIds.join(',')})`);
        } else {
          query = query.eq('user_id', userId);
        }
      } catch (e) {
        console.warn('Erro ao consultar grupos do membro, filtrando por user_id:', e);
        query = query.eq('user_id', userId);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar projetos no Supabase:', error);
      throw error;
    }
    return data ?? [];
  },

  async getById(id, userId = null) {
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
    if (!data) return null;

    // Verificar permissão se userId for fornecido
    if (userId && data.user_id && data.user_id !== userId) {
      if (data.grupo_id) {
        const { data: membro } = await supabaseAdmin
          .from('grupo_membros')
          .select('id')
          .eq('grupo_id', data.grupo_id)
          .eq('user_id', userId)
          .maybeSingle();
        if (!membro) return null;
      } else {
        return null;
      }
    }

    return data;
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

  async delete(id, userId = null) {
    if (userId) {
      const item = await this.getById(id, userId);
      if (!item) {
        throw new Error('Projeto não encontrado ou você não tem permissão para excluí-lo');
      }
    }

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

