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

    const salvo = data?.[0];

    // Sincronizar atividades na tabela public.atividades com identificação da obra
    try {
      const atividades = Array.isArray(dados.atividades) ? dados.atividades : [];
      const torres = Array.isArray(dados.torres) ? dados.torres : [];
      const nomeObra = projeto.nome || 'Sem nome';

      if (atividades.length > 0) {
        const ativRows = atividades.map((ativ) => {
          const torre = torres.find((t) => t.id === ativ.torreId);
          return {
            id: String(ativ.id),
            projeto_id: String(projeto.id),
            projeto_nome: nomeObra,
            obra_nome: nomeObra,
            nome: ativ.nome || 'Nova atividade',
            torre_id: ativ.torreId ? String(ativ.torreId) : null,
            torre_nome: torre?.nome || '',
            data_inicio: ativ.dataIni || null,
            data_fim: ativ.dataFim || null,
            avanco: Number(ativ.avanco) || 0,
            cor: ativ.cor || '',
            modo: ativ.modo || 'LINHA',
            dados: ativ,
            ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
            updated_at: new Date().toISOString(),
          };
        });

        const { error: ativErr } = await supabaseAdmin
          .from('atividades')
          .upsert(ativRows, { onConflict: 'id' });

        if (ativErr) {
          console.warn('Tentativa com colunas estendidas falhou, gravando colunas base:', ativErr.message);
          const baseRows = ativRows.map((r) => ({
            id: r.id,
            projeto_id: r.projeto_id,
            nome: r.nome,
            dados: r.dados,
            ...(r.user_id ? { user_id: r.user_id } : {}),
            updated_at: r.updated_at,
          }));
          await supabaseAdmin.from('atividades').upsert(baseRows, { onConflict: 'id' });
        }

        // Remove atividades que foram excluídas desta obra
        const idsAtuais = atividades.map((a) => String(a.id));
        if (idsAtuais.length > 0) {
          await supabaseAdmin
            .from('atividades')
            .delete()
            .eq('projeto_id', String(projeto.id))
            .not('id', 'in', `(${idsAtuais.join(',')})`);
        }
      } else {
        await supabaseAdmin
          .from('atividades')
          .delete()
          .eq('projeto_id', String(projeto.id));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar tabela atividades no servidor:', e);
    }

    return salvo;
  },

  async delete(id) {
    try {
      await supabaseAdmin.from('atividades').delete().eq('projeto_id', id);
    } catch {}

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

