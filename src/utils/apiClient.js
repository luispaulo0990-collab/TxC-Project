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

export const apiClient = {
  async getProjetos() {
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
      const { data, error } = await supabasePublic
        .from('projetos')
        .select('id, nome, updated_at, created_at, user_id, dados')
        .order('updated_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('supabasePublic getProjetos error:', err);
    }
    return null;
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

  async salvarProjeto(projeto) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(projeto.id)}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(projeto)
      });
      if (res.ok) {
        const data = await res.json();
        if (data) return data;
      }
    } catch (err) {
      console.warn('apiClient.salvarProjeto proxy error, tentando Supabase direto:', err);
    }

    // Fallback direto via Supabase
    try {
      const payload = {
        id: projeto.id,
        nome: projeto.nome || 'Sem nome',
        dados: projeto,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabasePublic
        .from('projetos')
        .upsert(payload, { onConflict: 'id' })
        .select();
      if (!error && data) {
        return data[0] || payload;
      }
    } catch (err) {
      console.warn('supabasePublic salvarProjeto error:', err);
    }
    return { id: projeto.id, nome: projeto.nome, dados: projeto };
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

