import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { presenceSocket } from "../services/presenceSocket";

export const AuthContext = createContext(null);

/* =========================================
   HELPERS
========================================= */

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

const buildEffectiveUser = (realUser, context) => {
  if (!realUser) return null;

  const realRole = normalizeRole(realUser.role);

  if (realRole !== "GERENCIA" || !context) {
    return realUser;
  }

  const actingUser =
    context?.acting_user &&
    typeof context.acting_user === "object"
      ? context.acting_user
      : null;

  const effectiveRole =
    normalizeRole(context?.role) || realRole;

  const effectiveCompanyId =
    context?.company_id ||
    realUser?.company_id ||
    null;

  const effectiveUserId =
    context?.acting_user_id ||
    actingUser?.id ||
    realUser?.id ||
    null;

  return {
    ...realUser,
    ...(actingUser || {}),

    /*
     * Datos operacionales que seguirá utilizando
     * el frontend existente.
     */
    id: effectiveUserId,
    role: effectiveRole,
    company_id: effectiveCompanyId,

    company_name:
      context?.company_name ||
      actingUser?.company_name ||
      realUser?.company_name ||
      null,

    /*
     * Identidad real de la cuenta autenticada.
     */
    real_id: realUser?.id || null,
    real_role: realRole,
    real_company_id:
      realUser?.company_id || null,

    /*
     * Contexto activo GERENCIA.
     */
    active_company_id:
      effectiveCompanyId,
    active_role:
      effectiveRole,
    acting_user_id:
      context?.acting_user_id || null,

    is_gerencia_context: true,
  };
};

/* =========================================
   PROVIDER
========================================= */

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  /*
   * NUEVO:
   * identidad real y contexto de GERENCIA.
   */
  const [realUser, setRealUser] =
    useState(null);

  const [
    gerenciaOriginalToken,
    setGerenciaOriginalToken,
  ] = useState(null);

  const [
    gerenciaContext,
    setGerenciaContext,
  ] = useState(null);

  const [
    mustChangePassword,
    setMustChangePassword,
  ] = useState(false);

  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  /* =========================================
     RESTAURAR SESIÓN
  ========================================= */

  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken =
          localStorage.getItem("token");

        const storedUser =
          localStorage.getItem("user");

        const storedPasswordFlag =
          localStorage.getItem(
            "mustChangePassword",
          );

        const storedRealUser =
          localStorage.getItem(
            "gerencia_real_user",
          );

        const storedOriginalToken =
          localStorage.getItem(
            "gerencia_original_token",
          );

        const storedContext =
          localStorage.getItem(
            "gerencia_context",
          );

        if (storedToken && storedUser) {
          const parsedUser =
            JSON.parse(storedUser);

          const parsedRealUser =
            storedRealUser
              ? JSON.parse(storedRealUser)
              : parsedUser;

          const parsedContext =
            storedContext
              ? JSON.parse(storedContext)
              : null;

          const realRole =
            normalizeRole(
              parsedRealUser?.role,
            );

          /*
           * Compatibilidad con una sesión GERENCIA
           * que quedó guardada antes de esta mejora.
           *
           * Si todavía no existe gerencia_original_token,
           * el token actual del login se adopta como original.
           */
          const originalToken =
            realRole === "GERENCIA"
              ? (
                  storedOriginalToken ||
                  storedToken
                )
              : null;

          const effectiveUser =
            buildEffectiveUser(
              parsedRealUser,
              parsedContext,
            );

          setToken(storedToken);
          setRealUser(parsedRealUser);
          setGerenciaOriginalToken(
            originalToken,
          );
          setGerenciaContext(
            parsedContext,
          );
          setUser(effectiveUser);
          setIsAuthenticated(true);

          if (
            storedPasswordFlag ===
            "true"
          ) {
            setMustChangePassword(
              true,
            );
          }

          if (
            realRole === "GERENCIA" &&
            originalToken
          ) {
            localStorage.setItem(
              "gerencia_original_token",
              originalToken,
            );

            localStorage.setItem(
              "gerencia_real_user",
              JSON.stringify(
                parsedRealUser,
              ),
            );
          }
        }
      } catch (error) {
        console.error(
          "❌ Error recuperando sesión:",
          error,
        );

        localStorage.clear();

        setToken(null);
        setUser(null);
        setRealUser(null);
        setGerenciaOriginalToken(null);
        setGerenciaContext(null);
        setMustChangePassword(false);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /* =========================================
     PERSISTENCIA GENERAL
  ========================================= */

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(
        "token",
        token,
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user),
      );

      localStorage.setItem(
        "mustChangePassword",
        mustChangePassword
          ? "true"
          : "false",
      );

      setIsAuthenticated(true);
    }
  }, [
    token,
    user,
    mustChangePassword,
  ]);

  /* =========================================
     LOGIN
  ========================================= */

  const login = (data) => {
    const passwordFlag = Boolean(
      data.mustChangePassword ??
      data.must_change_password,
    );

    const loginUser =
      data?.user || null;

    const loginToken =
      data?.token || null;

    const loginRole =
      normalizeRole(
        loginUser?.role,
      );

    /*
     * Siempre comienza una nueva sesión limpia.
     * No se conserva un contexto GERENCIA anterior.
     */
    localStorage.removeItem(
      "gerencia_context",
    );

    localStorage.removeItem(
      "gerencia_real_user",
    );

    localStorage.removeItem(
      "gerencia_original_token",
    );

    setGerenciaContext(null);

    setToken(loginToken);
    setUser(loginUser);
    setRealUser(loginUser);
    setMustChangePassword(
      passwordFlag,
    );
    setIsAuthenticated(true);

    localStorage.setItem(
      "token",
      loginToken,
    );

    localStorage.setItem(
      "user",
      JSON.stringify(loginUser),
    );

    localStorage.setItem(
      "mustChangePassword",
      passwordFlag
        ? "true"
        : "false",
    );

    /*
     * GERENCIA conserva el JWT ORIGINAL.
     * Este token será el que utilizará el selector
     * para consultar empresas, perfiles, usuarios
     * y solicitar un nuevo switch-context.
     */
    if (
      loginRole === "GERENCIA"
    ) {
      setGerenciaOriginalToken(
        loginToken,
      );

      localStorage.setItem(
        "gerencia_original_token",
        loginToken,
      );

      localStorage.setItem(
        "gerencia_real_user",
        JSON.stringify(loginUser),
      );
    } else {
      setGerenciaOriginalToken(null);
    }
  };

  /* =========================================
     APLICAR CONTEXTO GERENCIA
  ========================================= */

  const applyGerenciaContext = (
    response,
  ) => {
    const data =
      response?.data || response;

    if (
      !data?.token ||
      !data?.context
    ) {
      throw new Error(
        "La respuesta del contexto GERENCIA es inválida",
      );
    }

    const currentRealUser =
      realUser ||
      (
        normalizeRole(user?.real_role) ===
        "GERENCIA"
          ? {
              ...user,
              id:
                user?.real_id ||
                user?.id,
              role: "GERENCIA",
              company_id:
                user?.real_company_id ||
                user?.company_id ||
                null,
            }
          : user
      );

    if (
      normalizeRole(
        currentRealUser?.role,
      ) !== "GERENCIA"
    ) {
      throw new Error(
        "La sesión actual no corresponde a GERENCIA",
      );
    }

    const contextRole =
      normalizeRole(
        data.context.role,
      );

    if (
      !contextRole ||
      contextRole === "ROOT"
    ) {
      throw new Error(
        "El perfil seleccionado no es válido para GERENCIA",
      );
    }

    const normalizedContext = {
      ...data.context,

      role: contextRole,

      company_id:
        data.context.company_id ||
        null,

      company_name:
        data.context.company_name ||
        null,

      acting_user_id:
        data.context
          .acting_user_id ||
        null,

      acting_user:
        data.context
          .acting_user ||
        null,

      requiresActingUser:
        Boolean(
          data.context
            .requiresActingUser,
        ),
    };

    const effectiveUser =
      buildEffectiveUser(
        currentRealUser,
        normalizedContext,
      );

    /*
     * El token normal pasa a ser el token contextual.
     * gerenciaOriginalToken NO se modifica.
     */
    setToken(data.token);
    setUser(effectiveUser);
    setRealUser(currentRealUser);
    setGerenciaContext(
      normalizedContext,
    );

    localStorage.setItem(
      "token",
      data.token,
    );

    localStorage.setItem(
      "user",
      JSON.stringify(
        effectiveUser,
      ),
    );

    localStorage.setItem(
      "gerencia_real_user",
      JSON.stringify(
        currentRealUser,
      ),
    );

    localStorage.setItem(
      "gerencia_context",
      JSON.stringify(
        normalizedContext,
      ),
    );

    return {
      user: effectiveUser,
      context: normalizedContext,
    };
  };

  /* =========================================
     VOLVER AL SELECTOR GERENCIA
  ========================================= */

  const clearGerenciaContext = () => {
    const currentRealUser =
      realUser;

    if (
      normalizeRole(
        currentRealUser?.role,
      ) !== "GERENCIA"
    ) {
      return;
    }

    if (
      gerenciaOriginalToken
    ) {
      setToken(
        gerenciaOriginalToken,
      );

      localStorage.setItem(
        "token",
        gerenciaOriginalToken,
      );
    }

    setUser(currentRealUser);
    setGerenciaContext(null);

    localStorage.setItem(
      "user",
      JSON.stringify(
        currentRealUser,
      ),
    );

    localStorage.removeItem(
      "gerencia_context",
    );
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const logout = () => {
    if (presenceSocket.connected) {
      presenceSocket.emit(
        "presence_logout",
      );

      presenceSocket.disconnect();
    }

    setToken(null);
    setUser(null);
    setRealUser(null);
    setGerenciaOriginalToken(null);
    setGerenciaContext(null);
    setMustChangePassword(false);
    setIsAuthenticated(false);

    localStorage.clear();
  };

  /* =========================================
     PASSWORD
  ========================================= */

  const clearMustChangePassword =
    () => {
      setMustChangePassword(
        false,
      );

      localStorage.setItem(
        "mustChangePassword",
        "false",
      );
    };

  /* =========================================
     ROLES
  ========================================= */

  const hasRole = (
    allowedRoles,
  ) => {
    if (!user) return false;

    const roles =
      Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

    const currentRole =
      normalizeRole(user.role);

    return roles
      .map(normalizeRole)
      .includes(currentRole);
  };

  /* =========================================
     VALORES EFECTIVOS
  ========================================= */

  const realRole =
    normalizeRole(
      realUser?.role ||
      user?.real_role ||
      user?.role,
    );

  const effectiveRole =
    normalizeRole(
      user?.role,
    );

  const effectiveCompanyId =
    user?.company_id || null;

  const effectiveUserId =
    user?.id || null;

  const isGerencia =
    realRole === "GERENCIA";

  const hasGerenciaContext =
    isGerencia &&
    Boolean(
      gerenciaContext?.company_id &&
      gerenciaContext?.role,
    );

  const contextValue =
    useMemo(
      () => ({
        /*
         * Compatibilidad con todo el frontend actual.
         */
        user,
        token,
        loading,
        isAuthenticated,
        mustChangePassword,

        login,
        logout,
        hasRole,
        clearMustChangePassword,

        /*
         * Identidad real.
         */
        realUser,
        realRole,

        /*
         * Identidad operacional.
         */
        effectiveRole,
        effectiveCompanyId,
        effectiveUserId,

        /*
         * GERENCIA.
         */
        isGerencia,
        gerenciaOriginalToken,
        gerenciaContext,
        hasGerenciaContext,
        applyGerenciaContext,
        clearGerenciaContext,
      }),
      [
        user,
        token,
        loading,
        isAuthenticated,
        mustChangePassword,
        realUser,
        realRole,
        effectiveRole,
        effectiveCompanyId,
        effectiveUserId,
        isGerencia,
        gerenciaOriginalToken,
        gerenciaContext,
        hasGerenciaContext,
      ],
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);