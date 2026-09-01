// src/utils/apiClient.js

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL || ''}${normalizedPath}`;
};

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lob:auth_token') : null;
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
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('apiClient.getProjetos error:', err);
      return null;
    }
  },

  async getProjeto(id) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('apiClient.getProjeto error:', err);
      return null;
    }
  },

  async salvarProjeto(projeto) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(projeto.id)}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(projeto)
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('apiClient.salvarProjeto error:', err);
      return null;
    }
  },

  async excluirProjeto(id) {
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('apiClient.excluirProjeto error:', err);
      return null;
    }
  }
};
