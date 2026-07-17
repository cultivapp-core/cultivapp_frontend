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
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const finalUrl = `${API_URL}${cleanEndpoint}`;
  const isFD = options.body instanceof FormData;

  const method = String(
    options.method || "GET"
  ).toUpperCase();

  const isLoginRequest =
    cleanEndpoint === "/auth/login" ||
    cleanEndpoint.startsWith("/auth/login?");

  const config = {
    method,
    ...options,
    headers: {
      ...(!isFD && {
        "Content-Type": "application/json"
      }),
      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),
      ...options.headers
    }
  };

  try {
    const response = await fetch(finalUrl, config);

    /*
     * Primero leemos la respuesta.
     * Así podemos distinguir:
     *
     * - Cuenta deshabilitada
     * - Credenciales incorrectas
     * - Empresa inactiva
     * - Token realmente expirado
     */
    const contentType =
      response.headers.get("content-type");

    const data =
      contentType &&
      contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    const responseMessage = String(
      data?.message || data || ""
    );

    const normalizedMessage =
      responseMessage.toLowerCase();

    const responseCode = String(
      data?.code || ""
    ).toLowerCase();

    const isExpiredSession =
      responseCode === "token_expired" ||
      responseCode === "session_expired" ||
      normalizedMessage.includes("jwt expired") ||
      normalizedMessage.includes("token expirado") ||
      normalizedMessage.includes("token expired") ||
      normalizedMessage.includes("sesión expirada") ||
      normalizedMessage.includes("session expired");

    /*
     * IMPORTANTE:
     *
     * No tratamos el 401 del login como sesión expirada.
     * El LoginForm necesita recibir el mensaje real del backend.
     */
    if (
      response.status === 401 &&
      !isLoginRequest &&
      token &&
      isExpiredSession
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.dispatchEvent(
        new Event("session_expired")
      );

      if (window.location.pathname !== "/") {
        window.location.href =
          "/?error=session_expired";
      }

      throw {
        status: 401,
        code:
          data?.code ||
          "SESSION_EXPIRED",
        message:
          responseMessage ||
          "Sesión expirada",
        data
      };
    }

    /*
     * Cualquier otro error conserva el mensaje
     * y el código entregados por el backend.
     */
    if (!response.ok) {
      throw {
        status: response.status,
        code: data?.code,
        message:
          responseMessage ||
          `Error HTTP ${response.status}`,
        data
      };
    }

    return data;
  } catch (error) {
    const isNetworkError =
      error?.name === "TypeError" ||
      error?.message?.includes(
        "Failed to fetch"
      );

    const isMutation = [
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ].includes(method);

    const isTerrainRoute =
      endpoint.includes("/reports/") ||
      endpoint.includes("/scans") ||
      endpoint.includes("/finish") ||
      endpoint.includes("/photo") ||
      endpoint.includes("/task");

    if (
      isNetworkError &&
      isMutation &&
      isTerrainRoute
    ) {
      console.warn(
        "🌐 [apiClient] Guardando en OfflineManager por error de red en ruta de terreno:",
        endpoint
      );

      return await OfflineManager.save(
        cleanEndpoint,
        method,
        options.body
      );
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