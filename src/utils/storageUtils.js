/* ─── Persistência Unificada (localStorage + window.storage fallback) ─── */

export const storage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
      try {
        return await window.storage.get(key);
      } catch (err) {
        console.warn("window.storage error, falling back to localStorage", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const val = window.localStorage.getItem(key);
      return val ? { value: val } : null;
    }
    return null;
  },

  async set(key, value) {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
      try {
        return await window.storage.set(key, value);
      } catch (err) {
        console.warn("window.storage error, falling back to localStorage", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
    return false;
  },

  async remove(key) {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.remove === "function") {
      try {
        return await window.storage.remove(key);
      } catch (err) {
        console.warn("window.storage remove error", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
    return false;
  },
};
