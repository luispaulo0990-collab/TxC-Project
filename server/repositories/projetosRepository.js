// server/repositories/projetosRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const projetosRepository = {
  async getAll(userId = null) {
    let query = supabaseAdmin.from('projetos').select('id, nome, updated_at, created_at, user_id, dados');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async upsert(projeto, userId = null) {
    const payload = {
      id: projeto.id,
      nome: projeto.nome || 'Sem nome',
      dados: projeto,
      ...(userId ? { user_id: userId } : {}),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('projetos')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return data?.[0];
  },

  async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('projetos')
      .delete()
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }
};
