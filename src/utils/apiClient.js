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
  async getProjetos(customUserId = null) {
    const user = getCurrentUser();
    const effectiveUserId = customUserId || user?.id || null;

    try {
      const res = await fetch(apiUrl('/api/projetos'), {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
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

      if (effectiveUserId) {
        query = query.eq('user_id', effectiveUserId);
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
  }
};

