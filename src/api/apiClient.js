import OfflineManager from "../services/offlineManager";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

const API_URL =
  BASE_URL.replace(/\/+$/, "") +
  (/\/api$/i.test(BASE_URL.replace(/\/+$/, "")) ? "" : "/api");

export const getApiBaseUrl = () => API_URL;

const getToken = () => {
  let token = localStorage.getItem("token");

  if (
    !token ||
    token === "null" ||
    token === "undefined" ||
    token === ""
  ) {
    return null;
  }

  token = token.replace(/^"|"$/g, "");

  const cleanToken = token.startsWith("Bearer ")
    ? token.split(" ")[1]
    : token;

  return cleanToken?.trim() || null;
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const redirectToLogin = (errorType) => {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const targetSearch = `?error=${errorType}`;

  if (
    currentPath === "/" &&
    currentSearch === targetSearch
  ) {
    return;
  }

  window.location.href = `/${targetSearch}`;
};

const parseResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  try {
    return await response.text();
  } catch {
    return "";
  }
};

const isHtmlDocument = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return (
    /^\s*<!doctype html/i.test(value) ||
    /^\s*<html/i.test(value)
  );
};

const getResponseMessage = (
  data,
  status,
  endpoint,
) => {
  if (
    data &&
    typeof data === "object"
  ) {
    return (
      data.message ||
      data.error ||
      data.detail ||
      data.detalle ||
      `Error HTTP ${status}`
    );
  }

  if (isHtmlDocument(data)) {
    return (
      `El servidor respondió HTML en lugar de JSON para ${endpoint}. ` +
      "Revisa la ruta API y el prefijo /api."
    );
  }

  if (
    typeof data === "string" &&
    data.trim()
  ) {
    return data;
  }

  return `Error HTTP ${status}`;
};

const classifyAuthError = ({
  status,
  data,
  message,
}) => {
  const code = String(
    data?.code ||
      data?.error_code ||
      data?.type ||
      "",
  ).toLowerCase();

  const normalizedMessage = String(
    message || "",
  ).toLowerCase();

  if (
    code === "multiple_session" ||
    code === "session_replaced" ||
    normalizedMessage.includes("otro dispositivo") ||
    normalizedMessage.includes("sesión reemplazada") ||
    normalizedMessage.includes("session replaced") ||
    normalizedMessage.includes("multiple session")
  ) {
    return "multiple_session";
  }

  if (
    code === "account_disabled" ||
    code === "user_disabled" ||
    normalizedMessage.includes("cuenta deshabilitada") ||
    normalizedMessage.includes("usuario deshabilitado") ||
    normalizedMessage.includes("cuenta inactiva") ||
    normalizedMessage.includes("usuario inactivo")
  ) {
    return "account_disabled";
  }

  if (
    code === "company_disabled" ||
    code === "company_inactive" ||
    (
      normalizedMessage.includes("empresa") &&
      (
        normalizedMessage.includes("deshabilitada") ||
        normalizedMessage.includes("deshabilitado") ||
        normalizedMessage.includes("inactiva") ||
        normalizedMessage.includes("inactivo") ||
        normalizedMessage.includes("suspendida") ||
        normalizedMessage.includes("suspendido")
      )
    )
  ) {
    return "company_disabled";
  }

  if (
    code === "token_expired" ||
    code === "session_expired" ||
    normalizedMessage.includes("jwt expired") ||
    normalizedMessage.includes("token expirado") ||
    normalizedMessage.includes("token expired") ||
    normalizedMessage.includes("sesión expirada") ||
    normalizedMessage.includes("session expired")
  ) {
    return "session_expired";
  }

  if (
    status === 403 ||
    code === "forbidden" ||
    normalizedMessage.includes("acceso denegado") ||
    normalizedMessage.includes("sin permisos") ||
    normalizedMessage.includes("no tienes permisos")
  ) {
    return "forbidden";
  }

  if (status === 401) {
    return "unauthorized";
  }

  return null;
};

const isGpsGeofenceResponse = ({
  endpoint,
  data,
  message,
}) => {
  const cleanEndpoint = String(
    endpoint || "",
  ).toLowerCase();

  if (!cleanEndpoint.includes("/check-in")) {
    return false;
  }

  const code = String(
    data?.code ||
      data?.error_code ||
      "",
  )
    .trim()
    .toUpperCase();

  const normalizedMessage = String(
    message || "",
  )
    .trim()
    .toLowerCase();

  return (
    code === "OUTSIDE_GEOFENCE" ||
    code === "OUT_OF_GPS_RANGE" ||
    code === "GPS_OUT_OF_RANGE" ||
    data?.isValid === false ||
    data?.is_valid_gps === false ||
    data?.data?.is_valid_gps === false ||
    normalizedMessage.includes("fuera del rango") ||
    normalizedMessage.includes("fuera de rango") ||
    normalizedMessage.includes("metros del local")
  );
};

const request = async (
  endpoint,
  options = {},
) => {
  const {
    offlineFallback = true,
    preserveSessionOnAuthError = false,
    ...fetchOptions
  } = options;

  const token = getToken();

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const finalUrl = `${API_URL}${cleanEndpoint}`;

  const method = String(
    fetchOptions.method || "GET",
  ).toUpperCase();

  const isFD = fetchOptions.body instanceof FormData;

  const isLoginRequest =
    cleanEndpoint === "/auth/login" ||
    cleanEndpoint.startsWith("/auth/login?");

  // Conserva todos los headers enviados por cada módulo.
  // Para FormData se elimina únicamente Content-Type para que
  // fetch/browser genere automáticamente multipart/form-data + boundary.
  const incomingHeaders = {
    ...(fetchOptions.headers || {}),
  };

  if (isFD) {
    Object.keys(incomingHeaders).forEach((key) => {
      if (key.toLowerCase() === "content-type") {
        delete incomingHeaders[key];
      }
    });
  }

  const config = {
    ...fetchOptions,
    method,
    headers: {
      ...(
        !isFD
          ? {
              "Content-Type": "application/json",
            }
          : {}
      ),
      ...(
        token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}
      ),
      ...incomingHeaders,
    },
  };

  delete config.params;

  try {
    const response = await fetch(
      finalUrl,
      config,
    );

    const data = await parseResponseData(
      response,
    );

    const message = getResponseMessage(
      data,
      response.status,
      cleanEndpoint,
    );

    if (!response.ok) {
      /**
       * Un rechazo por geocerca GPS puede llegar como HTTP 403,
       * pero no representa falta de permisos ni sesión vencida.
       * Nunca se debe borrar la sesión por OUTSIDE_GEOFENCE.
       */
      const isGpsGeofenceError =
        isGpsGeofenceResponse({
          endpoint: cleanEndpoint,
          data,
          message,
        });

      const authErrorType =
        isGpsGeofenceError
          ? null
          : classifyAuthError({
              status: response.status,
              data,
              message,
            });

      if (
        !isLoginRequest &&
        token &&
        authErrorType &&
        !preserveSessionOnAuthError
      ) {
        clearSession();

        window.dispatchEvent(
          new CustomEvent(
            "session_expired",
            {
              detail: {
                type: authErrorType,
                status: response.status,
                message,
              },
            },
          ),
        );

        redirectToLogin(
          authErrorType,
        );
      }

      throw {
        status: response.status,
        code:
          data &&
          typeof data === "object"
            ? data.code
            : undefined,
        message,
        data,
        endpoint: cleanEndpoint,
        url: finalUrl,
      };
    }

    return data;
  } catch (error) {
    const isNetworkError =
      error?.name === "TypeError" ||
      String(
        error?.message || "",
      ).includes("Failed to fetch");

    const isMutation = [
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ].includes(method);

    const isTerrainRoute =
      cleanEndpoint.includes("/reports/") ||
      cleanEndpoint.includes("/scans") ||
      cleanEndpoint.includes("/finish") ||
      cleanEndpoint.includes("/photo") ||
      cleanEndpoint.includes("/task");

    if (
      offlineFallback &&
      isNetworkError &&
      isMutation &&
      isTerrainRoute
    ) {
      console.warn(
        "🌐 [apiClient] Guardando operación de terreno en la cola offline:",
        cleanEndpoint,
      );

      return OfflineManager.save(
        cleanEndpoint,
        method,
        fetchOptions.body,
      );
    }

    throw error;
  }
};

const serializeBody = (body) =>
  body instanceof FormData
    ? body
    : typeof body === "string"
      ? body
      : JSON.stringify(body);

const api = {
  get: (
    endpoint,
    config = null,
  ) => {
    let url = endpoint;

    const hasRequestOptions = Boolean(
      config &&
      typeof config === "object" &&
      (
        "headers" in config ||
        "credentials" in config ||
        "signal" in config ||
        "cache" in config ||
        "offlineFallback" in config ||
        "preserveSessionOnAuthError" in config
      )
    );

    const params =
      config?.params ||
      (
        hasRequestOptions
          ? null
          : config
      );

    if (
      params &&
      typeof params === "object" &&
      !(params instanceof FormData)
    ) {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(
          ([key, value]) =>
            key !== "params" &&
            value != null,
        ),
      );

      const query = new URLSearchParams(
        cleanParams,
      ).toString();

      if (query) {
        url += `${
          url.includes("?")
            ? "&"
            : "?"
        }${query}`;
      }
    }

    const requestConfig =
      hasRequestOptions
        ? {
            ...config,
          }
        : {};

    delete requestConfig.params;

    return request(
      url,
      {
        ...requestConfig,
        method: "GET",
      },
    );
  },

  post: (
    endpoint,
    body,
    config = {},
  ) =>
    request(
      endpoint,
      {
        ...config,
        method: "POST",
        body: serializeBody(body),
      },
    ),

  put: (
    endpoint,
    body,
    config = {},
  ) =>
    request(
      endpoint,
      {
        ...config,
        method: "PUT",
        body: serializeBody(body),
      },
    ),

  patch: (
    endpoint,
    body,
    config = {},
  ) =>
    request(
      endpoint,
      {
        ...config,
        method: "PATCH",
        body: serializeBody(body),
      },
    ),

  delete: (
    endpoint,
    body = null,
    config = {},
  ) =>
    request(
      endpoint,
      {
        ...config,
        method: "DELETE",
        ...(
          body !== null &&
          body !== undefined
            ? {
                body: serializeBody(body),
              }
            : {}
        ),
      },
    ),
};

export default api;
