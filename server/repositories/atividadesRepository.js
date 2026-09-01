// server/repositories/atividadesRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const atividadesRepository = {
  async getAll() {
    const { data, error } = await supabaseAdmin.from('atividades').select('*');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabaseAdmin
      .from('atividades')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabaseAdmin.from('atividades').insert([payload]);
    if (error) throw error;
    return data[0];
  },

  async update(id, payload) {
    const { data, error } = await supabaseAdmin
      .from('atividades')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('atividades')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data[0];
  },
};
