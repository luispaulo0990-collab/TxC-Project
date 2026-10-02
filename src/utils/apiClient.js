// src/utils/apiClient.js
import { supabasePublic } from './supabaseClient';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL || ''}${normalizedPath}`;
};

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('lob:auth_token') || localStorage.getItem('lob:auth_token')
    : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('lob:user') || localStorage.getItem('lob:user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const apiClient = {
  async getProjetos(filterUserId = null) {
    try {
      const res = await fetch(apiUrl('/api/projetos'), {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (filterUserId) return data.filter((p) => p.user_id === filterUserId);
          return data;
        }
      }
    } catch (err) {
      console.warn('apiClient.getProjetos proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      let query = supabasePublic
        .from('projetos')
        .select('id, nome, updated_at, created_at, user_id, grupo_id, dados')
        .order('updated_at', { ascending: false });

      if (filterUserId) {
        query = query.eq('user_id', filterUserId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data;
      }
      if (error) {
        console.warn('supabasePublic getProjetos error:', error);
      }
    } catch (err) {
      console.warn('supabasePublic getProjetos exception:', err);
    }
    return [];
  },

  async getProjeto(id) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch (err) {
      console.warn('apiClient.getProjeto proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      const { data, error } = await supabasePublic
        .from('projetos')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('supabasePublic getProjeto error:', err);
    }
    return null;
  },

  async salvarProjeto(projeto, customUserId = null) {
    const user = getCurrentUser();
    const effectiveUserId = customUserId || projeto.user_id || user?.id || null;
    const projetoComUser = {
      ...projeto,
      user_id: effectiveUserId,
    };

    let proxyError = null;
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(projeto.id)}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(projetoComUser)
      });
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      } else {
        const errText = await res.text();
        proxyError = new Error(`Proxy error (${res.status}): ${errText}`);
      }
    } catch (err) {
      proxyError = err;
      console.warn('apiClient.salvarProjeto proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      const payload = {
        id: projeto.id,
        nome: projeto.nome || 'Sem nome',
        user_id: effectiveUserId,
        ...(projeto.grupo_id ? { grupo_id: projeto.grupo_id } : {}),
        dados: projetoComUser,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabasePublic
        .from('projetos')
        .upsert(payload, { onConflict: 'id' })
        .select();
      if (!error && data && data.length > 0) {
        const salvo = data[0];

        // Sincronizar atividades na tabela public.atividades com identificação da obra
        try {
          const atividades = Array.isArray(projetoComUser.atividades) ? projetoComUser.atividades : [];
          const torres = Array.isArray(projetoComUser.torres) ? projetoComUser.torres : [];
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

            const { error: ativErr } = await supabasePublic
              .from('atividades')
              .upsert(ativRows, { onConflict: 'id' });

            if (ativErr) {
              const baseRows = ativRows.map((r) => ({
                id: r.id,
                projeto_id: r.projeto_id,
                nome: r.nome,
                dados: r.dados,
                ...(r.user_id ? { user_id: r.user_id } : {}),
                updated_at: r.updated_at,
              }));
              await supabasePublic.from('atividades').upsert(baseRows, { onConflict: 'id' });
            }

            const idsAtuais = atividades.map((a) => String(a.id));
            if (idsAtuais.length > 0) {
              await supabasePublic
                .from('atividades')
                .delete()
                .eq('projeto_id', String(projeto.id))
                .not('id', 'in', `(${idsAtuais.join(',')})`);
            }
          } else {
            await supabasePublic
              .from('atividades')
              .delete()
              .eq('projeto_id', String(projeto.id));
          }
        } catch (e) {
          console.warn('Erro ao sincronizar public.atividades no cliente:', e);
        }

        return salvo;
      }
      if (error) {
        console.error('supabasePublic salvarProjeto error:', error);
        throw error;
      }
    } catch (err) {
      console.error('Falha ao salvar no Supabase direto:', err);
      if (proxyError) {
        throw proxyError;
      }
      throw err;
    }

    return null;
  },

  async excluirProjeto(id) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('apiClient.excluirProjeto proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      try {
        await supabasePublic.from('atividades').delete().eq('projeto_id', id);
      } catch {}

      const { data, error } = await supabasePublic
        .from('projetos')
        .delete()
        .eq('id', id)
        .select();
      if (!error) {
        return { success: true, deleted: data?.[0] };
      }
    } catch (err) {
      console.warn('supabasePublic excluirProjeto error:', err);
    }
    return null;
  },

  /* ─── Comentários por Atividade (Persistidos no Supabase) ──── */
  /* ─── Biblioteca Global de Macrofluxos ─────────────────────── */
  async getMacrofluxos(filterUserId = null) {
    try {
      const res = await fetch(apiUrl('/api/macrofluxos'), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('apiClient.getMacrofluxos proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      let query = supabasePublic
        .from('macrofluxos')
        .select('id, nome, descricao, atividades_padrao, user_id, created_at, updated_at')
        .order('nome', { ascending: true });

      if (filterUserId) {
        query = query.eq('user_id', filterUserId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao || '',
          atividadesPadrao: row.atividades_padrao || [],
          user_id: row.user_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
      }
      if (error) {
        console.warn('supabasePublic getMacrofluxos error:', error);
      }
    } catch (err) {
      console.warn('supabasePublic getMacrofluxos exception:', err);
    }
    return [];
  },

  async salvarMacrofluxo(macro, customUserId = null) {
    const user = getCurrentUser();
    const effectiveUserId = customUserId || macro.user_id || user?.id || null;
    const payloadEnvio = {
      id: macro.id,
      nome: macro.nome || 'Novo Macrofluxo',
      descricao: macro.descricao || '',
      atividadesPadrao: macro.atividadesPadrao || macro.atividades_padrao || [],
      user_id: effectiveUserId,
    };

    try {
      const res = await fetch(apiUrl(`/api/macrofluxos/${encodeURIComponent(macro.id)}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payloadEnvio),
      });
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch (err) {
      console.warn('apiClient.salvarMacrofluxo proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      const dbPayload = {
        id: macro.id,
        nome: macro.nome || 'Novo Macrofluxo',
        descricao: macro.descricao || '',
        atividades_padrao: macro.atividadesPadrao || macro.atividades_padrao || [],
        ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabasePublic
        .from('macrofluxos')
        .upsert(dbPayload, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          nome: data.nome,
          descricao: data.descricao || '',
          atividadesPadrao: data.atividades_padrao || [],
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
      if (error) {
        console.error('supabasePublic salvarMacrofluxo error:', error);
        throw error;
      }
    } catch (err) {
      console.error('Falha ao salvar macrofluxo no Supabase direto:', err);
      throw err;
    }

    return payloadEnvio;
  },

  async excluirMacrofluxo(id) {
    try {
      const res = await fetch(apiUrl(`/api/macrofluxos/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('apiClient.excluirMacrofluxo proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      const { error } = await supabasePublic
        .from('macrofluxos')
        .delete()
        .eq('id', id);

      return !error;
    } catch (err) {
      console.error('supabasePublic excluirMacrofluxo exception:', err);
      return false;
    }
  },

  async getComentariosAtividade(projetoId, atividadeId) {
    if (!projetoId || !atividadeId) return [];
    try {
      const { data, error } = await supabasePublic
        .from('atividade_comentarios')
        .select('*')
        .eq('projeto_id', String(projetoId))
        .eq('atividade_id', String(atividadeId))
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
      if (error) {
        console.warn('getComentariosAtividade error:', error);
      }
    } catch (err) {
      console.warn('Erro ao buscar comentários da atividade:', err);
    }
    return [];
  },

  async adicionarComentarioAtividade(projetoId, atividadeId, texto, user = null) {
    if (!projetoId || !atividadeId || !texto?.trim()) return null;
    const u = user || getCurrentUser();
    const payload = {
      projeto_id: String(projetoId),
      atividade_id: String(atividadeId),
      user_id: u?.id || null,
      user_nome: u?.user_metadata?.nome || u?.nome || u?.email?.split('@')[0] || 'Usuário',
      user_email: u?.email || null,
      texto: texto.trim(),
    };
    try {
      const { data, error } = await supabasePublic
        .from('atividade_comentarios')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
      if (error) {
        console.warn('Erro ao inserir comentário no Supabase:', error);
      }
    } catch (err) {
      console.warn('Exceção ao inserir comentário no Supabase:', err);
    }
    // Fallback para exibir na interface mesmo se a tabela estiver sendo criada
    return {
      id: 'temp_' + Date.now(),
      ...payload,
      created_at: new Date().toISOString(),
    };
  },

  async excluirComentarioAtividade(comentarioId) {
    try {
      const { error } = await supabasePublic
        .from('atividade_comentarios')
        .delete()
        .eq('id', comentarioId);
      return !error;
    } catch {
      return false;
    }
  },

  /* ─── Perfis de Usuários (para vinculação em grupos) ────────── */
  async getPerfisDisponiveis() {
    try {
      const { data, error } = await supabasePublic
        .from('profiles')
        .select('id, email, nome')
        .order('email', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('Erro ao buscar perfis:', err);
    }
    return [];
  }
};

