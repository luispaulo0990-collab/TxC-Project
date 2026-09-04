// server/repositories/projetosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const projetosRepository = {
  /** Retorna obras próprias do usuário + obras dos grupos que ele participa */
  async getAll(userId = null) {
    if (!userId) {
      // Sem autenticação: retornar lista vazia por segurança
      return [];
    }

    // Buscar grupo_ids do usuário
    const { data: memberships } = await supabaseAdmin
      .from('grupo_membros')
      .select('grupo_id')
      .eq('user_id', userId);

    const grupoIds = memberships?.map((m) => m.grupo_id) ?? [];

    // Buscar obras próprias OU do grupo, com info do autor
    let query = supabaseAdmin
      .from('projetos')
      .select('id, nome, updated_at, created_at, user_id, grupo_id, dados')
      .order('updated_at', { ascending: false });

    if (grupoIds.length > 0) {
      query = query.or(`user_id.eq.${userId},grupo_id.in.(${grupoIds.join(',')})`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(id, userId) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  /** Upsert de projeto — aceita grupoId opcional */
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

    if (error) throw error;
    return data?.[0];
  },

  async delete(id, userId) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    if (error) throw error;
    return data?.[0];
  },
};
