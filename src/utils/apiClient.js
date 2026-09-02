// src/utils/apiClient.js
import { supabasePublic } from "./supabaseClient";

const API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL || ""}${normalizedPath}`;
};

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("lob:auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiClient = {
  async getProjetos() {
    // 1. Tentar via backend proxy se disponível
    try {
      const res = await fetch(apiUrl("/api/projetos"), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Fallback direto para o Supabase Client
    try {
      const { data, error } = await supabasePublic
        .from("projetos")
        .select("id, nome, updated_at, created_at, user_id, dados")
        .order("updated_at", { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("apiClient.getProjetos Supabase error:", err);
    }
    return null;
  },

  async getProjeto(id) {
    // 1. Tentar via backend proxy
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Fallback direto para o Supabase
    try {
      const { data, error } = await supabasePublic
        .from("projetos")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("apiClient.getProjeto Supabase error:", err);
    }
    return null;
  },

  async salvarProjeto(projeto) {
    // 1. Tentar via backend proxy
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(projeto.id)}`), {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Fallback direto para o Supabase
    try {
      const { data: userData } = await supabasePublic.auth.getUser();
      const userId = userData?.user?.id || null;

      const payload = {
        id: projeto.id,
        nome: projeto.nome || "Sem nome",
        dados: projeto,
        ...(userId ? { user_id: userId } : {}),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabasePublic
        .from("projetos")
        .upsert(payload, { onConflict: "id" })
        .select();

      if (!error && data) {
        return data?.[0];
      }
    } catch (err) {
      console.warn("apiClient.salvarProjeto Supabase error:", err);
    }
    return null;
  },

  async excluirProjeto(id) {
    // 1. Tentar via backend proxy
    try {
      const res = await fetch(apiUrl(`/api/projetos/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. Fallback direto para o Supabase
    try {
      const { data, error } = await supabasePublic
        .from("projetos")
        .delete()
        .eq("id", id)
        .select();

      if (!error) {
        return { success: true, deleted: data?.[0] };
      }
    } catch (err) {
      console.warn("apiClient.excluirProjeto Supabase error:", err);
    }
    return null;
  },
};
