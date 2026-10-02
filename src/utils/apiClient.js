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
        return data[0];
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

