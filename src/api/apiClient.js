import OfflineManager from "../services/offlineManager"

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000"

const API_URL =
  BASE_URL.replace(/\/+$/, "") +
  (BASE_URL.includes("/api") ? "" : "/api")

/* =========================================================
   OBTENER Y LIMPIAR TOKEN
========================================================= */
const getToken = () => {
  let token = localStorage.getItem("token")

  if (
    !token ||
    token === "null" ||
    token === "undefined" ||
    token === ""
  ) {
    return null
  }

  token = token.replace(/^"|"$/g, "")

  const cleanToken = token.startsWith("Bearer ")
    ? token.slice(7)
    : token

  return cleanToken?.trim() || null
}

/* =========================================================
   LIMPIAR DATOS DE AUTENTICACIÓN
========================================================= */
const clearAuthStorage = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

/* =========================================================
   NORMALIZAR DATOS DE ERROR
========================================================= */
const getErrorMessage = (data) => {
  if (typeof data === "string") {
    return data
  }

  return (
    data?.message ||
    data?.error ||
    "Ocurrió un error inesperado"
  )
}

/* =========================================================
   CLASIFICAR ERRORES DE AUTENTICACIÓN
========================================================= */
const classifyAuthError = (status, data) => {
  const code = String(
    data?.code ||
    data?.errorCode ||
    data?.error_code ||
    ""
  ).toLowerCase()

  const normalizedMessage = getErrorMessage(data).toLowerCase()

  /*
   * Debe evaluarse antes del 403 genérico.
   */
  if (
    code === "contract_expired" ||
    normalizedMessage.includes("contrato vencido") ||
    normalizedMessage.includes(
      "contrato se encuentra vencido"
    )
  ) {
    return "contract_expired"
  }

  if (
    code === "multiple_session" ||
    normalizedMessage.includes("múltiples dispositivos") ||
    normalizedMessage.includes("otro dispositivo") ||
    normalizedMessage.includes("sesión reemplazada")
  ) {
    return "multiple_session"
  }

  if (status === 401) {
    return "session_expired"
  }

  if (status === 403) {
    return "forbidden"
  }

  return null
}

/* =========================================================
   REDIRECCIÓN POR CIERRE DE SESIÓN
========================================================= */
const redirectToLogin = (errorType, delay = 0) => {
  const currentPath = window.location.pathname

  if (currentPath === "/") {
    return
  }

  const redirect = () => {
    window.location.href =
      `/?error=${encodeURIComponent(errorType)}`
  }

  if (delay > 0) {
    setTimeout(redirect, delay)
    return
  }

  redirect()
}

/* =========================================================
   REQUEST PRINCIPAL
========================================================= */
const request = async (endpoint, options = {}) => {
  const token = getToken()

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`

  const finalUrl = `${API_URL}${cleanEndpoint}`

  const isFormData = options.body instanceof FormData

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
      ...(!isFormData && {
        "Content-Type": "application/json"
      }),

      ...(token && {
        Authorization: `Bearer ${token}`
      }),

      ...options.headers
    }
  }

  try {
    const response = await fetch(finalUrl, config)

    const contentType =
      response.headers.get("content-type") || ""

    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text()

    /* =====================================================
       RESPUESTA CORRECTA
    ===================================================== */
    if (response.ok) {
      return data
    }

    const message = getErrorMessage(data)

    const authError = classifyAuthError(
      response.status,
      data
    )

    /* =====================================================
       CONTRATO VENCIDO
    ===================================================== */
    if (authError === "contract_expired") {
      clearAuthStorage()

      window.dispatchEvent(
        new CustomEvent("auth_error", {
          detail: {
            type: "contract_expired",
            message
          }
        })
      )

      /*
       * Si el error ocurrió durante una petición con sesión
       * iniciada, se expulsa al usuario.
       *
       * En el propio login no se redirige, porque LoginForm
       * mostrará directamente la alerta.
       */
      const isLoginRequest =
        cleanEndpoint === "/auth/login" ||
        cleanEndpoint.endsWith("/auth/login")

      if (!isLoginRequest) {
        redirectToLogin("contract_expired")
      }

      throw {
        status: response.status,
        code: data?.code || "CONTRACT_EXPIRED",
        authError: "contract_expired",
        message,
        data
      }
    }

    /* =====================================================
       SESIÓN EN OTRO DISPOSITIVO
    ===================================================== */
    if (authError === "multiple_session") {
      clearAuthStorage()

      window.dispatchEvent(
        new CustomEvent("auth_error", {
          detail: {
            type: "multiple_session",
            message
          }
        })
      )

      redirectToLogin("multiple_session")

      throw {
        status: response.status,
        code: data?.code || "MULTIPLE_SESSION",
        authError: "multiple_session",
        message,
        data
      }
    }

    /* =====================================================
       SESIÓN EXPIRADA
    ===================================================== */
    if (authError === "session_expired") {
      const isLoginRequest =
        cleanEndpoint === "/auth/login" ||
        cleanEndpoint.endsWith("/auth/login")

      /*
       * Un 401 al intentar iniciar sesión normalmente significa
       * credenciales incorrectas. No debe tratarse como una
       * sesión previamente expirada.
       */
      if (!isLoginRequest) {
        clearAuthStorage()

        window.dispatchEvent(
          new Event("session_expired")
        )

        redirectToLogin("session_expired", 1500)
      }

      throw {
        status: response.status,
        code: data?.code || null,
        authError: isLoginRequest
          ? "invalid_credentials"
          : "session_expired",
        message,
        data
      }
    }

    /* =====================================================
       OTROS ERRORES HTTP
    ===================================================== */
    throw {
      status: response.status,
      code: data?.code || null,
      authError,
      message,
      data
    }
  } catch (error) {
    const isNetworkError =
      error?.name === "TypeError" ||
      error?.message?.includes("Failed to fetch")

    const requestMethod = String(
      options.method || "GET"
    ).toUpperCase()

    const isMutation = [
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ].includes(requestMethod)

    const isTerrainRoute =
      endpoint.includes("/reports/") ||
      endpoint.includes("/scans") ||
      endpoint.includes("/finish") ||
      endpoint.includes("/photo") ||
      endpoint.includes("/task")

    if (
      isNetworkError &&
      isMutation &&
      isTerrainRoute
    ) {
      console.warn(
        "🌐 [apiClient] Guardando en OfflineManager por error de red en ruta de terreno:",
        endpoint
      )

      return await OfflineManager.save(
        cleanEndpoint,
        requestMethod,
        options.body
      )
    }

    throw error
  }
}

/* =========================================================
   MÉTODOS HTTP
========================================================= */
const api = {
  get: (endpoint, config = null) => {
    let url = endpoint

    const params = config?.params || config

    if (
      params &&
      typeof params === "object" &&
      !(params instanceof FormData)
    ) {
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(
          ([, value]) => value != null
        )
      )

      const query = new URLSearchParams(
        filteredParams
      ).toString()

      if (query) {
        url += `${url.includes("?") ? "&" : "?"}${query}`
      }
    }

    return request(url, {
      method: "GET",
      ...config
    })
  },

  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : typeof body === "string"
            ? body
            : JSON.stringify(body)
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body:
        body instanceof FormData
          ? body
          : typeof body === "string"
            ? body
            : JSON.stringify(body)
    }),

  patch: (endpoint, body) =>
    request(endpoint, {
      method: "PATCH",
      body:
        body instanceof FormData
          ? body
          : typeof body === "string"
            ? body
            : JSON.stringify(body)
    }),

  delete: (endpoint) =>
    request(endpoint, {
      method: "DELETE"
    })
}

export default api