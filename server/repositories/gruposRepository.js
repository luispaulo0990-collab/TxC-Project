// server/repositories/gruposRepository.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

export const gruposRepository = {
  /** Retorna todos os grupos em que o usuário é membro, com lista de membros */
  async getMeusGrupos(userId) {
    const { data, error } = await supabaseAdmin
      .from('grupo_membros')
      .select(`
        role,
        grupo:grupos(
          id,
          nome,
          criado_por,
          created_at,
          membros:grupo_membros(
            id,
            role,
            created_at,
            perfil:profiles(id, email, nome)
          )
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map((gm) => ({ ...gm.grupo, meu_role: gm.role })) ?? [];
  },

  /** Cria novo grupo e adiciona o criador como admin */
  async criarGrupo(nome, userId) {
    const { data: grupo, error: gErr } = await supabaseAdmin
      .from('grupos')
      .insert({ nome, criado_por: userId })
      .select()
      .single();
    if (gErr) throw gErr;

    const { error: mErr } = await supabaseAdmin
      .from('grupo_membros')
      .insert({ grupo_id: grupo.id, user_id: userId, role: 'admin' });
    if (mErr) throw mErr;

    return grupo;
  },

  /** Adiciona membro ao grupo por email (busca pelo perfil) */
  async adicionarMembro(grupoId, email, role = 'member') {
    // Buscar usuário pelo email no auth.users via service_role
    const { data: usersData, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
    if (uErr) throw uErr;

    const target = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!target) throw new Error('Usuário não encontrado com este email.');

    const { data, error } = await supabaseAdmin
      .from('grupo_membros')
      .upsert(
        { grupo_id: grupoId, user_id: target.id, role },
        { onConflict: 'grupo_id,user_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Altera papel de um membro */
  async alterarRole(grupoId, userId, novoRole) {
    const { data, error } = await supabaseAdmin
      .from('grupo_membros')
      .update({ role: novoRole })
      .eq('grupo_id', grupoId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Remove membro do grupo */
  async removerMembro(grupoId, userId) {
    const { data, error } = await supabaseAdmin
      .from('grupo_membros')
      .delete()
      .eq('grupo_id', grupoId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Deleta grupo inteiro (apenas criador/admin) */
  async deletarGrupo(grupoId, userId) {
    // Verificar se é admin
    const { data: membro } = await supabaseAdmin
      .from('grupo_membros')
      .select('role')
      .eq('grupo_id', grupoId)
      .eq('user_id', userId)
      .single();
    if (!membro || membro.role !== 'admin') {
      throw new Error('Apenas admins podem deletar grupos.');
    }
    const { error } = await supabaseAdmin.from('grupos').delete().eq('id', grupoId);
    if (error) throw error;
    return { success: true };
  },

  /** Retorna o papel do usuário em um grupo específico */
  async getRoleNoGrupo(grupoId, userId) {
    const { data, error } = await supabaseAdmin
      .from('grupo_membros')
      .select('role')
      .eq('grupo_id', grupoId)
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data?.role ?? null;
  },
};
