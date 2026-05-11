import OfflineManager from "../services/offlineManager";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = BASE_URL.replace(/\/+$/, "") + (BASE_URL.includes("/api") ? "" : "/api");

/**
 * Obtiene y limpia el token de sesión
 */
const getToken = () => {
  let token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined" || token === "") return null;
  token = token.replace(/^"|"$/g, '');
  const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
  return cleanToken?.trim() || null;
};

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const finalUrl = `${API_URL}${cleanEndpoint}`;
  
  const isFD = options.body instanceof FormData;

  const config = {
    method: options.method || "GET",
    ...options,
    headers: {
      ...(!isFD && { "Content-Type": "application/json" }),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}), 
      ...options.headers,
    },
  };

  try {
    const response = await fetch(finalUrl, config);

    // 🚩 MANEJO DE SESIÓN EXPIRADA (SUAVIZADO)
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user"); 
      
      // Disparamos un evento por si algún componente de React quiere reaccionar
      window.dispatchEvent(new Event("session_expired"));

      if (window.location.pathname !== "/") {
        // Le damos un "tiempo de gracia" de 1.5s para que los procesos
        // de sincronización en segundo plano (useOfflineSync) puedan pausarse
        // limpiamente sin ser asesinados por la recarga de página.
        setTimeout(() => {
          window.location.href = "/?error=session_expired";
        }, 1500);
      }
      throw { status: 401, message: "Sesión expirada" };
    }

    const contentType = response.headers.get("content-type");
    let data = (contentType && contentType.includes("application/json")) 
               ? await response.json() 
               : await response.text();

    if (!response.ok) throw { status: response.status, message: data?.message || data };

    return data;

  } catch (error) {
    const isNetworkError = error.name === "TypeError" || error.message?.includes("Failed to fetch");
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(options.method);

    /**
     * 🚩 MEJORA: Filtro de Rutas Offline actualizado con Tareas y Fotos
     */
    const isTerrainRoute = 
      endpoint.includes("/reports/") || 
      endpoint.includes("/scans") || 
      endpoint.includes("/finish") ||
      endpoint.includes("/photo") ||  // Añadido
      endpoint.includes("/task");     // Añadido

    if (isNetworkError && isMutation && isTerrainRoute) {
      // Delegamos la responsabilidad al componente de base de datos local
      return await OfflineManager.save(cleanEndpoint, options.method, options.body);
    }
    
    throw error;
  }
};

const api = {
  get: (endpoint, config = null) => {
    let url = endpoint;
    const params = config?.params || config;
    if (params && typeof params === "object" && !(params instanceof FormData)) {
      const query = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null))).toString();
      if (query) url += `${url.includes("?") ? "&" : "?"}${query}`;
    }
    return request(url, { method: "GET", ...config });
  },

  post: (endpoint, body) => request(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : (typeof body === "string" ? body : JSON.stringify(body)),
  }),
  
  put: (endpoint, body) => request(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : (typeof body === "string" ? body : JSON.stringify(body)),
  }),

  patch: (endpoint, body) => request(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : (typeof body === "string" ? body : JSON.stringify(body)),
  }),
  
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

export default api;