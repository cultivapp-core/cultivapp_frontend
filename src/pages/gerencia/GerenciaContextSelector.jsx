import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiLogOut,
  FiRefreshCw,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import { motion } from "framer-motion";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

/* =========================================
   CONFIGURACIÓN DE PERFILES
========================================= */

const ROLE_CONFIG = {
  ADMIN_CLIENTE: {
    label: "Administrador",
    description:
      "Gestión general de usuarios, locales, rutas, catálogo y reportes.",
    icon: FiShield,
    route: "/admin",
  },

  ADMIN_REGIONAL: {
    label: "Administrador Regional",
    description:
      "Gestión y monitoreo de operaciones regionales.",
    icon: FiBriefcase,
    route: "/admin-regional",
  },

  SUPERVISOR: {
    label: "Supervisor",
    description:
      "Seguimiento de rutas, mercaderistas y ejecución en terreno.",
    icon: FiUsers,
    route: "/supervisor",
  },

  USUARIO: {
    label: "Mercaderista",
    description:
      "Agenda, locales y flujo operativo de visitas.",
    icon: FiUser,
    route: "/usuario",
  },

  MERCADERISTA_REGIONAL: {
    label: "Mercaderista Regional",
    description:
      "Operación regional, inventario y reposición.",
    icon: FiBriefcase,
    route: "/mercaderista-regional",
  },

  VIEW: {
    label: "Viewer",
    description:
      "Visualización de dashboard, planificación y reportes.",
    icon: FiUsers,
    route: "/viewer",
  },
};

/* =========================================
   HELPERS
========================================= */

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

const unwrapResponse = (response) =>
  response?.data ?? response ?? {};

const companyIdOf = (company) =>
  String(
    company?.id ??
      company?.company_id ??
      company?.companyId ??
      "",
  );

const companyNameOf = (company) =>
  company?.name ??
  company?.company_name ??
  company?.companyName ??
  "Empresa";

const userIdOf = (user) =>
  String(
    user?.id ??
      user?.user_id ??
      "",
  );

const userNameOf = (user) => {
  const fullName = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user?.name ||
    user?.email ||
    "Usuario"
  );
};

const roleValueOf = (item) => {
  if (typeof item === "string") {
    return normalizeRole(item);
  }

  return normalizeRole(
    item?.role ??
      item?.allowed_role ??
      item?.code ??
      item?.profile,
  );
};

/* =========================================
   NORMALIZAR OPCIONES DEL BACKEND
========================================= */

const normalizeCompaniesResponse = (
  response,
) => {
  const payload =
    unwrapResponse(response);

  /*
   * Soporta una respuesta plana tipo:
   *
   * [
   *   {
   *     company_id,
   *     company_name,
   *     allowed_role
   *   }
   * ]
   */
  const possibleRows =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.options)
        ? payload.options
        : Array.isArray(
              payload?.data?.options,
            )
          ? payload.data.options
          : null;

  if (
    Array.isArray(possibleRows) &&
    possibleRows.some(
      (item) =>
        item?.allowed_role ||
        item?.role,
    )
  ) {
    const grouped =
      new Map();

    possibleRows.forEach((row) => {
      const companyId =
        companyIdOf(row);

      if (!companyId) {
        return;
      }

      if (!grouped.has(companyId)) {
        grouped.set(companyId, {
          id: companyId,
          name: companyNameOf(row),
          roles: [],
        });
      }

      const role =
        roleValueOf(row);

      if (
        role &&
        role !== "ROOT" &&
        ROLE_CONFIG[role]
      ) {
        const company =
          grouped.get(companyId);

        if (
          !company.roles.includes(
            role,
          )
        ) {
          company.roles.push(role);
        }
      }
    });

    return [
      ...grouped.values(),
    ];
  }

  /*
   * Respuesta agrupada por empresa.
   */
  const rawCompanies =
    Array.isArray(payload?.companies)
      ? payload.companies
      : Array.isArray(
            payload?.data?.companies,
          )
        ? payload.data.companies
        : Array.isArray(
              payload?.data,
            )
          ? payload.data
          : [];

  const permissions =
    Array.isArray(
      payload?.permissions,
    )
      ? payload.permissions
      : Array.isArray(
            payload?.data?.permissions,
          )
        ? payload.data.permissions
        : [];

  return rawCompanies
    .filter(
      (company) =>
        company?.is_active !== false,
    )
    .map((company) => {
      const companyId =
        companyIdOf(company);

      const directRoles =
        company?.roles ??
        company?.allowed_roles ??
        company?.allowedRoles ??
        company?.profiles ??
        [];

      let roles =
        Array.isArray(directRoles)
          ? directRoles
              .map(roleValueOf)
              .filter(Boolean)
          : [];

      /*
       * Si las empresas y permisos vienen separados.
       */
      if (
        roles.length === 0 &&
        permissions.length > 0
      ) {
        roles = permissions
          .filter(
            (permission) =>
              companyIdOf(
                permission,
              ) === companyId,
          )
          .map(roleValueOf)
          .filter(Boolean);
      }

      roles = [
        ...new Set(roles),
      ].filter(
        (role) =>
          role !== "ROOT" &&
          Boolean(
            ROLE_CONFIG[role],
          ),
      );

      return {
        ...company,
        id: companyId,
        name:
          companyNameOf(company),
        roles,
      };
    })
    .filter(
      (company) =>
        company.id &&
        company.roles.length > 0,
    );
};

/* =========================================
   NORMALIZAR USUARIOS DE CONTEXTO
========================================= */

const normalizeUsersResponse = (
  response,
  role,
) => {
  const payload =
    unwrapResponse(response);

  const nestedData =
    payload?.data;

  const rawUsers =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(
              nestedData?.users,
            )
          ? nestedData.users
          : Array.isArray(nestedData)
            ? nestedData
            : [];

  let requiresActingUser =
    payload?.requiresActingUser ??
    payload?.requires_acting_user ??
    nestedData
      ?.requiresActingUser ??
    nestedData
      ?.requires_acting_user;

  /*
   * Respaldo según el modelo actual:
   * ADMIN_CLIENTE no requiere acting user.
   */
  if (
    typeof requiresActingUser !==
    "boolean"
  ) {
    requiresActingUser =
      normalizeRole(role) !==
      "ADMIN_CLIENTE";
  }

  return {
    users: rawUsers,
    requiresActingUser:
      Boolean(
        requiresActingUser,
      ),
  };
};

/* =========================================
   COMPONENTE
========================================= */

const GerenciaContextSelector =
  () => {
    const navigate =
      useNavigate();

    /*
     * NUEVO:
     * Cuando se vuelve desde un dashboard para
     * cambiar solamente de perfil:
     *
     * /gerencia?companyId=UUID&mode=profile
     *
     * La empresa queda preseleccionada.
     */
    const [
      searchParams,
      setSearchParams,
    ] = useSearchParams();

    const presetCompanyId =
      String(
        searchParams.get(
          "companyId",
        ) || "",
      ).trim();

    const selectorMode =
      String(
        searchParams.get("mode") ||
          "",
      )
        .trim()
        .toLowerCase();

    const isProfileChangeMode =
      selectorMode === "profile" &&
      Boolean(presetCompanyId);

    const {
      user,
      realUser,
      loading: authLoading,
      gerenciaOriginalToken,
      applyGerenciaContext,
      logout,
    } = useAuth();

    const [
      companies,
      setCompanies,
    ] = useState([]);

    const [
      selectedCompanyId,
      setSelectedCompanyId,
    ] = useState("");

    const [
      selectedRole,
      setSelectedRole,
    ] = useState("");

    const [
      contextUsers,
      setContextUsers,
    ] = useState([]);

    const [
      selectedUserId,
      setSelectedUserId,
    ] = useState("");

    const [
      requiresActingUser,
      setRequiresActingUser,
    ] = useState(false);

    const [
      loadingOptions,
      setLoadingOptions,
    ] = useState(true);

    const [
      loadingUsers,
      setLoadingUsers,
    ] = useState(false);

    const [
      entering,
      setEntering,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState("");

    /* =========================================
       TOKEN ORIGINAL GERENCIA
    ========================================= */

    const originalAuthConfig =
      useCallback(
        () => ({
          headers: {
            Authorization:
              `Bearer ${gerenciaOriginalToken}`,
          },

          /*
           * Una falla de permisos de contexto
           * no debe destruir la sesión real.
           */
          preserveSessionOnAuthError:
            true,
        }),
        [gerenciaOriginalToken],
      );

    /* =========================================
       CARGAR EMPRESAS + PERFILES
    ========================================= */

    const loadContextOptions =
      useCallback(async () => {
        if (
          !gerenciaOriginalToken
        ) {
          return;
        }

        try {
          setLoadingOptions(true);
          setError("");

          let response;

          /*
           * Endpoint principal del selector.
           */
          try {
            response =
              await api.get(
                "/gerencia/context-options",
                originalAuthConfig(),
              );
          } catch (requestError) {
            /*
             * Compatibilidad con la ruta de
             * empresas del backend.
             */
            const requestStatus =
              Number(
                requestError?.status ??
                  requestError
                    ?.response
                    ?.status ??
                  0,
              );

            if (
              requestStatus !== 404
            ) {
              throw requestError;
            }

            response =
              await api.get(
                "/gerencia/companies",
                originalAuthConfig(),
              );
          }

          const normalized =
            normalizeCompaniesResponse(
              response,
            );

          setCompanies(normalized);

          if (
            normalized.length === 0
          ) {
            setError(
              "No existen empresas o perfiles habilitados para esta cuenta de gerencia.",
            );
          }
        } catch (requestError) {
          console.error(
            "❌ Error cargando contexto GERENCIA:",
            requestError,
          );

          setCompanies([]);

          const message =
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError?.data
              ?.message ||
            requestError?.message ||
            "No fue posible cargar las empresas autorizadas.";

          setError(message);

          toast.error(message);
        } finally {
          setLoadingOptions(
            false,
          );
        }
      }, [
        gerenciaOriginalToken,
        originalAuthConfig,
      ]);

    useEffect(() => {
      if (authLoading) {
        return;
      }

      const realRole =
        normalizeRole(
          realUser?.role ||
            user?.real_role ||
            user?.role,
        );

      if (
        realRole !== "GERENCIA"
      ) {
        navigate("/", {
          replace: true,
        });

        return;
      }

      loadContextOptions();
    }, [
      authLoading,
      realUser,
      user,
      navigate,
      loadContextOptions,
    ]);

    /* =========================================
       PRESELECCIONAR EMPRESA AL CAMBIAR PERFIL
    ========================================= */

    useEffect(() => {
      if (
        !presetCompanyId ||
        companies.length === 0
      ) {
        return;
      }

      const companyExists =
        companies.some(
          (company) =>
            String(company.id) ===
            String(presetCompanyId),
        );

      if (!companyExists) {
        /*
         * Si el companyId recibido ya no está
         * autorizado, volvemos al selector normal.
         */
        setSearchParams(
          {},
          {
            replace: true,
          },
        );

        return;
      }

      if (
        String(
          selectedCompanyId,
        ) ===
        String(presetCompanyId)
      ) {
        return;
      }

      setSelectedCompanyId(
        presetCompanyId,
      );

      /*
       * Al volver desde otro perfil,
       * mantenemos empresa pero reiniciamos perfil
       * y acting user para obligar una selección nueva.
       */
      setSelectedRole("");
      setSelectedUserId("");
      setContextUsers([]);
      setRequiresActingUser(false);
      setError("");
    }, [
      presetCompanyId,
      companies,
      selectedCompanyId,
      setSearchParams,
    ]);

    /* =========================================
       EMPRESA SELECCIONADA
    ========================================= */

    const selectedCompany =
      useMemo(
        () =>
          companies.find(
            (company) =>
              String(
                company.id,
              ) ===
              String(
                selectedCompanyId,
              ),
          ) || null,
        [
          companies,
          selectedCompanyId,
        ],
      );

    const availableRoles =
      useMemo(
        () =>
          (
            selectedCompany?.roles ||
            []
          ).filter(
            (role) =>
              role !== "ROOT" &&
              ROLE_CONFIG[role],
          ),
        [selectedCompany],
      );

    const selectedUser =
      useMemo(
        () =>
          contextUsers.find(
            (item) =>
              userIdOf(item) ===
              String(
                selectedUserId,
              ),
          ) || null,
        [
          contextUsers,
          selectedUserId,
        ],
      );

    /* =========================================
       CAMBIAR EMPRESA
    ========================================= */

    const handleCompanyChange = (
      event,
    ) => {
      const companyId =
        event.target.value;

      setSelectedCompanyId(
        companyId,
      );

      setSelectedRole("");
      setSelectedUserId("");
      setContextUsers([]);
      setRequiresActingUser(
        false,
      );

      setError("");
    };

    /*
     * NUEVO:
     * En mode=profile la empresa queda bloqueada
     * para evitar cambiarla accidentalmente.
     * Este botón vuelve al selector completo.
     */
    const handleUnlockCompany =
      () => {
        setSearchParams(
          {},
          {
            replace: true,
          },
        );

        setSelectedCompanyId("");
        setSelectedRole("");
        setSelectedUserId("");
        setContextUsers([]);
        setRequiresActingUser(
          false,
        );
        setError("");
      };

    /* =========================================
       SELECCIONAR PERFIL
    ========================================= */

    const handleRoleSelect =
      async (role) => {
        if (
          !selectedCompanyId ||
          !role
        ) {
          return;
        }

        const normalizedRole =
          normalizeRole(role);

        if (
          normalizedRole === "ROOT"
        ) {
          return;
        }

        setSelectedRole(
          normalizedRole,
        );

        setSelectedUserId("");
        setContextUsers([]);
        setError("");

        try {
          setLoadingUsers(true);

          const response =
            await api.get(
              "/gerencia/context-users",
              {
                ...originalAuthConfig(),

                params: {
                  companyId:
                    selectedCompanyId,

                  role:
                    normalizedRole,
                },
              },
            );

          const normalized =
            normalizeUsersResponse(
              response,
              normalizedRole,
            );

          setRequiresActingUser(
            normalized
              .requiresActingUser,
          );

          setContextUsers(
            normalized.users,
          );

          /*
           * Si solamente existe un usuario
           * operativo, lo dejamos seleccionado.
           */
          if (
            normalized
              .requiresActingUser &&
            normalized.users
              .length === 1
          ) {
            setSelectedUserId(
              userIdOf(
                normalized
                  .users[0],
              ),
            );
          }
        } catch (requestError) {
          console.error(
            "❌ Error cargando usuarios de contexto:",
            requestError,
          );

          setContextUsers([]);

          const message =
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError?.data
              ?.message ||
            requestError?.message ||
            "No fue posible cargar los usuarios disponibles.";

          setError(message);

          toast.error(message);
        } finally {
          setLoadingUsers(false);
        }
      };

    /* =========================================
       INGRESAR AL CONTEXTO
    ========================================= */

    const handleEnterContext =
      async () => {
        if (
          !selectedCompanyId
        ) {
          toast.error(
            "Selecciona una empresa.",
          );

          return;
        }

        if (!selectedRole) {
          toast.error(
            "Selecciona un perfil.",
          );

          return;
        }

        if (
          requiresActingUser &&
          !selectedUserId
        ) {
          toast.error(
            "Selecciona el usuario que deseas representar.",
          );

          return;
        }

        const roleConfig =
          ROLE_CONFIG[
            selectedRole
          ];

        if (!roleConfig) {
          toast.error(
            "Perfil no válido.",
          );

          return;
        }

        try {
          setEntering(true);
          setError("");

          const body = {
            companyId:
              selectedCompanyId,

            role:
              selectedRole,
          };

          if (
            requiresActingUser
          ) {
            body.actingUserId =
              selectedUserId;
          }

          const response =
            await api.post(
              "/gerencia/switch-context",
              body,
              originalAuthConfig(),
            );

          /*
           * Guarda:
           * - nuevo JWT contextual
           * - empresa activa
           * - perfil activo
           * - acting user
           *
           * sin perder la identidad GERENCIA.
           */
          applyGerenciaContext(
            response,
          );

          toast.success(
            `Ingresando como ${roleConfig.label}`,
          );

          navigate(
            roleConfig.route,
            {
              replace: true,
            },
          );
        } catch (requestError) {
          console.error(
            "❌ Error cambiando contexto GERENCIA:",
            requestError,
          );

          const message =
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError?.data
              ?.message ||
            requestError?.message ||
            "No fue posible ingresar al perfil seleccionado.";

          setError(message);

          toast.error(message);
        } finally {
          setEntering(false);
        }
      };

    /* =========================================
       LOGOUT
    ========================================= */

    const handleLogout = () => {
      logout();

      navigate("/", {
        replace: true,
      });
    };

    /* =========================================
       LOADING AUTH
    ========================================= */

    if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#87be00]" />
        </div>
      );
    }

    /* =========================================
       RENDER
    ========================================= */

    return (
      <div className="min-h-screen bg-[#F5F7F8] font-[Outfit] text-slate-900">
        <div className="grid min-h-screen lg:grid-cols-[420px_1fr]">

          {/* =====================================
              PANEL IZQUIERDO
          ====================================== */}

          <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#87be00]/10 blur-3xl" />

            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#87be00]/5 blur-3xl" />

            <div className="relative z-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#87be00] text-white shadow-xl shadow-[#87be00]/20">
                <FiShield size={25} />
              </div>

              <p className="mt-8 text-[10px] font-black uppercase tracking-[0.35em] text-[#87be00]">
                CultivApp
              </p>

              <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">
                Centro de
                <br />
                Gerencia
              </h1>

              <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-slate-400">
                Selecciona la empresa y el
                perfil operacional con el que
                deseas ingresar.
              </p>
            </div>

            <div className="relative z-10 space-y-4">
              {[
                {
                  number: "01",
                  title: "Empresa",
                  description:
                    "Selecciona la organización.",
                },
                {
                  number: "02",
                  title: "Perfil",
                  description:
                    "Define el nivel operativo.",
                },
                {
                  number: "03",
                  title: "Usuario",
                  description:
                    "Cuando el perfil lo requiera.",
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[10px] font-black text-[#a8d52c]">
                    {step.number}
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">
                      {step.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 border-t border-white/10 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Sesión multiempresa
              </p>

              <p className="mt-2 text-xs text-slate-400">
                La identidad real de Gerencia se
                mantiene durante toda la sesión.
              </p>
            </div>
          </aside>

          {/* =====================================
              PANEL DERECHO
          ====================================== */}

          <main className="flex min-h-screen flex-col">

            {/* TOPBAR */}

            <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#87be00] lg:hidden">
                  CultivApp · Gerencia
                </p>

                <p className="text-sm font-black text-slate-900">
                  {isProfileChangeMode
                    ? "Cambiar perfil"
                    : "Selección de contexto"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <FiLogOut size={15} />
                <span className="hidden sm:inline">
                  Cerrar sesión
                </span>
              </button>
            </header>

            {/* CONTENIDO */}

            <div className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 14,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="w-full max-w-4xl"
              >
                {/* CABECERA */}

                <div className="mb-7">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[#87be00]/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6d9700]">
                    <FiShield />
                    Acceso de Gerencia
                  </span>

                  <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {isProfileChangeMode
                      ? "Selecciona tu nuevo perfil"
                      : "¿Cómo deseas ingresar?"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {isProfileChangeMode
                      ? "Mantendremos la empresa seleccionada. Solo debes elegir el nuevo perfil y, cuando corresponda, el usuario operacional."
                      : "Selecciona una empresa y luego el perfil que necesitas utilizar. Podrás cambiarlo posteriormente sin cerrar tu sesión."}
                  </p>
                </div>

                {/* TARJETA */}

                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">

                  {/* EMPRESA */}

                  <div className="border-b border-slate-100 p-5 sm:p-7">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <FiBriefcase size={17} />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                            Paso 1
                          </p>

                          <h3 className="text-sm font-black text-slate-900">
                            {isProfileChangeMode
                              ? "Empresa actual"
                              : "Selecciona una empresa"}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isProfileChangeMode && (
                          <button
                            type="button"
                            onClick={handleUnlockCompany}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:border-[#87be00] hover:text-[#6f9d00]"
                          >
                            Cambiar empresa
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={loadContextOptions}
                          disabled={loadingOptions}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:text-[#87be00] disabled:opacity-50"
                          title="Actualizar"
                        >
                          <FiRefreshCw
                            className={
                              loadingOptions
                                ? "animate-spin"
                                : ""
                            }
                          />
                        </button>
                      </div>
                    </div>

                    {loadingOptions ? (
                      <div className="flex min-h-[70px] items-center justify-center rounded-2xl bg-slate-50">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[#87be00]" />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedCompanyId}
                          onChange={handleCompanyChange}
                          disabled={isProfileChangeMode}
                          className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-800 outline-none transition focus:border-[#87be00] focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                        >
                          <option value="">
                            Seleccionar empresa...
                          </option>

                          {companies.map(
                            (company) => (
                              <option
                                key={company.id}
                                value={company.id}
                              >
                                {company.name}
                              </option>
                            ),
                          )}
                        </select>

                        <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    )}

                    {isProfileChangeMode &&
                      selectedCompany && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#87be00]/10 px-3 py-2">
                          <FiCheck
                            size={13}
                            className="text-[#6f9d00]"
                          />

                          <p className="text-[10px] font-bold text-[#5f8700]">
                            La empresa se mantiene en{" "}
                            {selectedCompany.name}.
                          </p>
                        </div>
                      )}
                  </div>

                  {/* PERFIL */}

                  <div className="border-b border-slate-100 p-5 sm:p-7">
                    <div className="mb-5 flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          selectedCompany
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-300"
                        }`}
                      >
                        <FiUsers size={17} />
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                          Paso 2
                        </p>

                        <h3 className="text-sm font-black text-slate-900">
                          Selecciona un perfil
                        </h3>
                      </div>
                    </div>

                    {!selectedCompany ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-xs font-bold text-slate-400">
                          Primero selecciona una empresa.
                        </p>
                      </div>
                    ) : availableRoles.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-xs font-bold text-slate-400">
                          No existen perfiles habilitados para esta empresa.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {availableRoles.map(
                          (role) => {
                            const config =
                              ROLE_CONFIG[role];

                            const Icon =
                              config.icon;

                            const active =
                              selectedRole ===
                              role;

                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() =>
                                  handleRoleSelect(
                                    role,
                                  )
                                }
                                className={`relative flex min-h-[112px] items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                                  active
                                    ? "border-[#87be00] bg-[#87be00]/5 shadow-lg shadow-[#87be00]/10"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                    active
                                      ? "bg-[#87be00] text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <Icon
                                    size={18}
                                  />
                                </div>

                                <div className="pr-6">
                                  <p className="text-xs font-black uppercase tracking-wide text-slate-900">
                                    {
                                      config.label
                                    }
                                  </p>

                                  <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                                    {
                                      config.description
                                    }
                                  </p>
                                </div>

                                {active && (
                                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#87be00] text-white">
                                    <FiCheck
                                      size={13}
                                    />
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>

                  {/* USUARIO OPERACIONAL */}

                  {selectedRole && (
                    <div className="border-b border-slate-100 p-5 sm:p-7">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <FiUser size={17} />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                            Paso 3
                          </p>

                          <h3 className="text-sm font-black text-slate-900">
                            {requiresActingUser
                              ? "Selecciona el usuario operacional"
                              : "Usuario operacional"}
                          </h3>
                        </div>
                      </div>

                      {loadingUsers ? (
                        <div className="flex min-h-[70px] items-center justify-center rounded-2xl bg-slate-50">
                          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[#87be00]" />
                        </div>
                      ) : !requiresActingUser ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/5 p-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87be00] text-white">
                            <FiCheck
                              size={16}
                            />
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-900">
                              No requiere seleccionar usuario
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-slate-500">
                              El perfil utilizará directamente la empresa seleccionada.
                            </p>
                          </div>
                        </div>
                      ) : contextUsers.length ===
                        0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs font-bold text-amber-700">
                            No existen usuarios disponibles para este perfil en la empresa seleccionada.
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={selectedUserId}
                            onChange={(event) =>
                              setSelectedUserId(
                                event.target
                                  .value,
                              )
                            }
                            className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-800 outline-none transition focus:border-[#87be00] focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                          >
                            <option value="">
                              Seleccionar usuario...
                            </option>

                            {contextUsers.map(
                              (
                                contextUser,
                              ) => (
                                <option
                                  key={userIdOf(
                                    contextUser,
                                  )}
                                  value={userIdOf(
                                    contextUser,
                                  )}
                                >
                                  {userNameOf(
                                    contextUser,
                                  )}
                                  {contextUser?.email
                                    ? ` · ${contextUser.email}`
                                    : ""}
                                </option>
                              ),
                            )}
                          </select>

                          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ERROR */}

                  {error && (
                    <div className="mx-5 mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 sm:mx-7">
                      <p className="text-xs font-bold text-red-600">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* RESUMEN + BOTÓN */}

                  <div className="p-5 sm:p-7">
                    {selectedCompany &&
                      selectedRole && (
                        <div className="mb-5 rounded-2xl bg-slate-950 p-4 text-white">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#a8d52c]">
                            Contexto seleccionado
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span>
                              {
                                selectedCompany.name
                              }
                            </span>

                            <span className="text-slate-600">
                              /
                            </span>

                            <span>
                              {
                                ROLE_CONFIG[
                                  selectedRole
                                ]?.label
                              }
                            </span>

                            {requiresActingUser &&
                              selectedUser && (
                                <>
                                  <span className="text-slate-600">
                                    /
                                  </span>

                                  <span className="text-[#a8d52c]">
                                    {userNameOf(
                                      selectedUser,
                                    )}
                                  </span>
                                </>
                              )}
                          </div>
                        </div>
                      )}

                    <button
                      type="button"
                      disabled={
                        entering ||
                        !selectedCompanyId ||
                        !selectedRole ||
                        (
                          requiresActingUser &&
                          !selectedUserId
                        )
                      }
                      onClick={
                        handleEnterContext
                      }
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#87be00] px-6 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-[#87be00]/20 transition hover:bg-[#78aa00] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      {entering ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          Preparando contexto...
                        </>
                      ) : (
                        <>
                          {isProfileChangeMode
                            ? "Ingresar con nuevo perfil"
                            : "Ingresar al perfil"}

                          <FiArrowRight
                            size={16}
                          />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    );
  };

export default GerenciaContextSelector;