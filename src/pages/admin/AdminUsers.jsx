import React, { useEffect, useState, useCallback, useRef } from "react"
import {
  FiUserPlus,
  FiRotateCw,
  FiEdit,
  FiTrash,
  FiUsers,
  FiEye,
  FiShield,
  FiMapPin,
  FiFileText,
  FiUploadCloud,
  FiPhone,
  FiSearch,
  FiX,
  FiAlertTriangle,
  FiBriefcase,
  FiHelpCircle,
  FiDownload,
  FiCheckCircle
} from "react-icons/fi"
import { toast } from "react-hot-toast"
import api from "../../api/apiClient"
import {
  Button,
  IconButton,
  Switch,
} from "../../components/ui"
import { getRoleLabel } from "../../components/constants/uiLabels"

import CreateAdminUserModal from "../admin/CreateAdminUserModal"
import EditAdminUserModal from "./EditAdminUserModal"
import ResetPasswordAdminModal from "../../components/ResetPasswordAdminModal"
import AssignLocalesModal from "./AssignLocalesModal"
import AssignUsersModal from "./AssignUsersModal"
import UserQuickView from "../../components/UserQuickView"
import { motion, AnimatePresence } from "framer-motion"
import * as XLSX from "xlsx"

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf"

const parseContractDate = (value) => {
  if (!value) return null

  const datePart = String(value).slice(0, 10)
  const [year, month, day] = datePart.split("-").map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const getContractStatus = (fechaTerminoContrato) => {
  const endDate = parseContractDate(fechaTerminoContrato)

  if (!endDate) {
    return {
      status: "without_date",
      daysRemaining: null,
      priority: 4
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.round(
    (endDate.getTime() - today.getTime()) / millisecondsPerDay
  )

  if (daysRemaining < 0) {
    return {
      status: "expired",
      daysRemaining,
      priority: 1
    }
  }

  if (daysRemaining <= 2) {
    return {
      status: "critical",
      daysRemaining,
      priority: 2
    }
  }

  if (daysRemaining <= 5) {
    return {
      status: "warning",
      daysRemaining,
      priority: 3
    }
  }

  return {
    status: "active",
    daysRemaining,
    priority: 4
  }
}

const formatContractDate = (value) => {
  const date = parseContractDate(value)

  if (!date) return "Sin fecha"

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

const getRoleVisual = (role) => {
  const roles = {
    ROOT: {
      badge:
        "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
      avatar:
        "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
    },
    ADMIN_CLIENTE: {
      badge:
        "border-orange-100 bg-orange-50 text-orange-700",
      avatar:
        "border-orange-100 bg-orange-50 text-orange-700",
    },
    ADMIN: {
      badge:
        "border-orange-100 bg-orange-50 text-orange-700",
      avatar:
        "border-orange-100 bg-orange-50 text-orange-700",
    },
    ADMIN_REGIONAL: {
      badge:
        "border-indigo-100 bg-indigo-50 text-indigo-700",
      avatar:
        "border-indigo-100 bg-indigo-50 text-indigo-700",
    },
    SUPERVISOR: {
      badge:
        "border-blue-100 bg-blue-50 text-blue-700",
      avatar:
        "border-blue-100 bg-blue-50 text-blue-700",
    },
    USUARIO: {
      badge:
        "border-[#87be00]/20 bg-[#87be00]/10 text-[#679300]",
      avatar:
        "border-[#87be00]/20 bg-[#87be00]/10 text-[#679300]",
    },
    MERCADERISTA: {
      badge:
        "border-[#87be00]/20 bg-[#87be00]/10 text-[#679300]",
      avatar:
        "border-[#87be00]/20 bg-[#87be00]/10 text-[#679300]",
    },
    MERCADERISTA_REGIONAL: {
      badge:
        "border-lime-100 bg-lime-50 text-lime-700",
      avatar:
        "border-lime-100 bg-lime-50 text-lime-700",
    },
    VIEW: {
      badge:
        "border-violet-100 bg-violet-50 text-violet-700",
      avatar:
        "border-violet-100 bg-violet-50 text-violet-700",
    },
    VIEWER: {
      badge:
        "border-violet-100 bg-violet-50 text-violet-700",
      avatar:
        "border-violet-100 bg-violet-50 text-violet-700",
    },
  }

  return (
    roles[role] || {
      badge:
        "border-gray-100 bg-gray-50 text-gray-600",
      avatar:
        "border-gray-100 bg-gray-50 text-gray-600",
    }
  )
}

const getUserInitials = (user) => {
  const first = user?.first_name?.trim()?.charAt(0) || ""
  const last = user?.last_name?.trim()?.charAt(0) || ""

  return `${first}${last}`.toUpperCase() || "U"
}

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [companies, setCompanies] = useState([]) 
  const [selectedCompanyId, setSelectedCompanyId] = useState("") 
  
  const [openModal, setOpenModal] = useState(false)
  const [openBulkHelp, setOpenBulkHelp] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [assignSupervisor, setAssignSupervisor] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  const [assignUser, setAssignUser] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activePopover, setActivePopover] = useState(null)

  const [contractAlerts, setContractAlerts] = useState([])
  const [showContractAlertModal, setShowContractAlertModal] = useState(false)

  const fileInputRef = useRef(null)
  const contractAlertShownRef = useRef(false)
  const storedUser = localStorage.getItem("user")
  const userLocal = storedUser ? JSON.parse(storedUser) : null

  // 🚩 DETERMINAR SI TIENE ACCESO TOTAL (ROOT O CULTIVA)
  const isOwnerAdmin = userLocal?.role === "ADMIN_CLIENTE";
  const isCultivaAdmin =
    isOwnerAdmin &&
    String(userLocal?.company_id || "") === CULTIVA_COMPANY_ID;
  const tieneAccesoGlobal = userLocal?.role === "ROOT" || isCultivaAdmin;

  // FILTRADO EN CASCADA: SI HAY EMPRESA SELECCIONADA FILTRA POR ELLA, SINO DEJA PASAR TODO
  const filteredUsers = users.filter((user) => {
    if (selectedCompanyId && String(user.company_id) !== String(selectedCompanyId)) {
      return false
    }

    const term = searchTerm.toLowerCase().trim()
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
    const email = user.email?.toLowerCase() || ""
    const rut = user.rut?.toLowerCase() || ""
    
    return fullName.includes(term) || email.includes(term) || rut.includes(term)
  })

  const safe = (value) => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // MÉTODO EXTRACTOR DE LICENCIAS ADAPTADO PARA MULTI-EMPRESA O MODO GLOBAL
  const getLicenciasDinamicas = () => {
    if (!stats) return { supervisors: 0, users: 0, view: 0, maxSup: 0, maxUsr: 0, maxVw: 0 }
    
    if (selectedCompanyId) {
      const supFiltered = users.filter(u => String(u.company_id) === String(selectedCompanyId) && u.role === "SUPERVISOR").length
      const usrFiltered = users.filter(u => String(u.company_id) === String(selectedCompanyId) && u.role === "USUARIO").length
      const viewFiltered = users.filter(u => String(u.company_id) === String(selectedCompanyId) && u.role === "VIEW").length
      
      return {
        supervisors: supFiltered,
        users: usrFiltered,
        view: viewFiltered,
        maxSup: "∞", 
        maxUsr: "∞",
        maxVw: "∞"
      }
    }

    return {
      supervisors: safe(users.filter(u => u.role === "SUPERVISOR").length),
      users: safe(users.filter(u => u.role === "USUARIO").length),
      view: safe(users.filter(u => u.role === "VIEW").length),
      maxSup: safe(stats.limits?.max_supervisors) || "—",
      maxUsr: safe(stats.limits?.max_users) || "—",
      maxVw: safe(stats.limits?.max_view) || "—"
    }
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const timestamp = Date.now()
      
      const [usersResponse, statsResponse, companiesResponse] = await Promise.all([
        api.get(`users?ts=${timestamp}`),
        api.get(`users/company/${userLocal.company_id}/stats?ts=${timestamp}`).catch(() => null), 
        api.get(`companies?ts=${timestamp}`)
      ])
      
      const parsedUsers = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || [])
      const parsedCompanies = Array.isArray(companiesResponse) ? companiesResponse : (companiesResponse.data || [])
      
      setUsers(parsedUsers)
      setCompanies(parsedCompanies)
      setStats(statsResponse)
      const usersWithContractAlerts = parsedUsers
        .map((user) => ({
          ...user,
          contractStatus: getContractStatus(user.fecha_termino_contrato)
        }))
        .filter(({ contractStatus }) =>
          ["expired", "critical", "warning"].includes(contractStatus.status)
        )
        .sort(
          (a, b) =>
            a.contractStatus.priority - b.contractStatus.priority ||
            a.contractStatus.daysRemaining - b.contractStatus.daysRemaining
        )

      setContractAlerts(usersWithContractAlerts)

      if (
        usersWithContractAlerts.length > 0 &&
        !contractAlertShownRef.current
      ) {
        contractAlertShownRef.current = true
        setShowContractAlertModal(true)
      }
    } catch (error) {
      console.error("GLOBAL FETCH ERROR:", error)
      toast.error("Error al sincronizar el catálogo multi-empresa")
    } finally {
      setLoading(false)
    }
  }, [userLocal.company_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const targetCompanyId = selectedCompanyId || userLocal.company_id
    if (!targetCompanyId) {
      toast.error("Por favor selecciona una empresa en el filtro antes de ejecutar la carga masiva.")
      return
    }

    const formData = new FormData()
    formData.append("excel", file)
    formData.append("company_id", targetCompanyId)
    try {
      setBulkLoading(true)
      const res = await api.post("/users/bulk", formData)
      toast.success(res.message || "Carga masiva completada con éxito")
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al procesar el archivo masivo")
    } finally {
      setBulkLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const toggleUser = async (user) => {
    if (user.id === userLocal.id) {
      toast.error("Por motivos de seguridad, no puedes deshabilitar tu propia cuenta.")
      return
    }
    try {
      await api.patch(`users/${user.id}/toggle`)
      toast.success("Estado de acceso actualizado")
      fetchData()
    } catch (error) {
      toast.error("No se pudo cambiar el estado del usuario")
    }
  }

  const deleteUser = async (targetUser) => {
    if (targetUser.id === userLocal.id) {
      toast.error("Acción denegada: Imposible eliminar el perfil con el que iniciaste sesión.")
      return
    }
    try {
      await api.delete(`users/${targetUser.id}`)
      toast.success("Usuario eliminado del sistema")
      fetchData()
      setUserToDelete(null)
    } catch (error) {
      toast.error("No se pudo eliminar el usuario")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 px-4 font-[Outfit] text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#87be00] border-t-transparent" />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
            Cargando usuarios
          </p>

          <p className="mt-1 text-[11px] font-medium text-gray-300">
            Sincronizando colaboradores y licencias.
          </p>
        </div>
      </div>
    )
  }

  const licencias = getLicenciasDinamicas()
  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(selectedCompanyId)

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCompanyId("")
  }

  return (
    <div
      className="min-h-full bg-gray-50/40 pb-20 font-[Outfit]"
      onClick={() => setActivePopover(null)}
    >
      {/* ENCABEZADO CULTIVAPP */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 md:px-8 md:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiUsers size={21} />
            </div>

            <div>
              <h1 className="text-3xl font-black leading-none tracking-tight text-gray-900 md:text-5xl">
                Gestión de usuarios
              </h1>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                {tieneAccesoGlobal
                  ? "Administración multiempresa"
                  : `Administración · ${
                      userLocal?.company_name ||
                      "Mi empresa"
                    }`}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 md:gap-3 lg:w-auto">
            <div className="group relative shrink-0">
              <IconButton
                label="Ver formato de carga masiva de usuarios"
                size="lg"
                onClick={() =>
                  setOpenBulkHelp(true)
                }
                className="shrink-0"
              >
                <FiHelpCircle size={19} />
              </IconButton>

              <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-[300] hidden w-64 rounded-2xl border border-gray-100 bg-gray-900 px-4 py-3 text-left shadow-2xl group-hover:block">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#87be00]">
                  Formato de carga
                </p>

                <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-300">
                  Revisa las columnas y descarga la plantilla oficial para importar usuarios.
                </p>

                <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-gray-900" />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              leftIcon={
                <FiUploadCloud size={15} />
              }
              loading={bulkLoading}
              loadingText="Importando..."
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="min-w-0 flex-1 whitespace-nowrap lg:flex-none"
            >
              Importar usuarios
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleBulkUpload}
            />

            <Button
              type="button"
              size="lg"
              leftIcon={
                <FiUserPlus size={15} />
              }
              onClick={() =>
                setOpenModal(true)
              }
              className="min-w-0 flex-1 whitespace-nowrap lg:flex-none"
            >
              Crear usuario
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 pt-6 sm:px-6 md:px-8">
        {/* INDICADORES */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProgressCard
            title="Supervisores"
            used={licencias.supervisors}
            max={licencias.maxSup}
            color="bg-blue-500"
            bgClass="bg-blue-50 text-blue-600"
            icon={<FiShield size={18} />}
            description="Gestión y seguimiento de equipos"
          />

          <ProgressCard
            title="Mercaderistas"
            used={licencias.users}
            max={licencias.maxUsr}
            color="bg-[#87be00]"
            bgClass="bg-[#87be00]/10 text-[#679300]"
            icon={<FiUsers size={18} />}
            description="Ejecución operativa en terreno"
          />

          <ProgressCard
            title="Visualizadores"
            used={licencias.view}
            max={licencias.maxVw}
            color="bg-violet-500"
            bgClass="bg-violet-50 text-violet-600"
            icon={<FiEye size={18} />}
            description="Consulta y supervisión de información"
          />
        </section>

        {/* FILTROS */}
        <section className="rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#87be00]">
                Filtros de búsqueda
              </p>

              <h2 className="mt-1 text-base font-black text-gray-900">
                Localiza colaboradores
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#87be00]/20 bg-[#87be00]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#679300]">
                {filteredUsers.length} usuario
                {filteredUsers.length === 1
                  ? ""
                  : "s"}
              </span>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                >
                  <FiX size={13} />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-3 ${
              tieneAccesoGlobal
                ? "md:grid-cols-[minmax(240px,320px)_1fr]"
                : ""
            }`}
          >
            {tieneAccesoGlobal && (
              <div className="relative">
                <FiBriefcase
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={15}
                />

                <select
                  value={selectedCompanyId}
                  onChange={(event) =>
                    setSelectedCompanyId(
                      event.target.value,
                    )
                  }
                  className={`${inputClass} appearance-none pl-11 pr-10`}
                >
                  <option value="">
                    Todas las empresas
                  </option>

                  {companies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name ||
                        company.nombre ||
                        "Empresa"}
                    </option>
                  ))}
                </select>

                <SelectArrow />
              </div>
            )}

            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={15}
              />

              <input
                type="search"
                placeholder="Buscar por nombre, correo o RUT..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11 pr-11`}
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-red-500"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* TABLA DE ESCRITORIO */}
        <section className="hidden overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm md:block">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                Listado de usuarios
              </p>

              <p className="mt-1 text-[11px] font-semibold text-gray-500">
                Roles, empresa, contacto y acciones disponibles.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 transition-all hover:border-[#87be00]/30 hover:bg-[#87be00]/5 hover:text-[#87be00]"
              aria-label="Actualizar usuarios"
            >
              <FiRotateCw size={16} />
            </button>
          </div>

          <div className="max-h-[68vh] overflow-auto custom-scrollbar">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="sticky top-0 z-20 border-b border-gray-100 bg-white">
                <tr>
                  <th className={thClass}>
                    Colaborador
                  </th>

                  <th className={`${thClass} text-center`}>
                    Rol
                  </th>

                  <th className={`${thClass} text-center`}>
                    Empresa
                  </th>

                  <th className={`${thClass} text-center`}>
                    Teléfono
                  </th>

                  <th className={`${thClass} text-center`}>
                    Correo
                  </th>

                  <th className={`${thClass} text-center`}>
                    Estado
                  </th>

                  <th className={`${thClass} text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const roleVisual =
                      getRoleVisual(user.role)

                    const companyName =
                      companies.find(
                        (company) =>
                          String(company.id) ===
                          String(user.company_id),
                      )?.name ||
                      "Sin empresa asignada"

                    return (
                      <tr
                        key={user.id}
                        className="group transition-colors hover:bg-gray-50/60"
                      >
                        <td className="p-5 align-top">
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                              <UserQuickView
                                user={user}
                                isActive={
                                  activePopover ===
                                  user.id
                                }
                                onToggle={() =>
                                  setActivePopover(
                                    activePopover ===
                                      user.id
                                      ? null
                                      : user.id,
                                  )
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-900">
                                {user.first_name}{" "}
                                {user.last_name}
                              </p>

                              <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-wider text-gray-400">
                                {user.rut ||
                                  "Sin RUT"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-5 text-center align-top">
                          <span
                            className={`inline-flex rounded-lg border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] ${roleVisual.badge}`}
                          >
                            {getRoleLabel(
                              user.role,
                            )}
                          </span>
                        </td>

                        <td className="p-5 text-center align-top">
                          <span className="inline-flex max-w-[190px] truncate rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-blue-700">
                            {companyName}
                          </span>
                        </td>

                        <td className="p-5 align-top">
                          <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[11px] font-semibold text-gray-500">
                            <FiPhone
                              className="text-gray-300"
                              size={13}
                            />

                            {user.phone || "—"}
                          </div>
                        </td>

                        <td className="p-5 align-top">
                          <div className="flex max-w-[230px] items-center justify-center gap-2 text-[11px] font-semibold text-gray-500">
                            <FiFileText
                              className="shrink-0 text-gray-300"
                              size={13}
                            />

                            <span className="truncate">
                              {user.email}
                            </span>
                          </div>
                        </td>

                        <td className="p-5 text-center align-top">
                          <Switch
                            checked={user.is_active}
                            disabled={
                              user.id ===
                              userLocal.id
                            }
                            size="sm"
                            label={
                              user.is_active
                                ? `Desactivar a ${user.first_name} ${user.last_name}`
                                : `Activar a ${user.first_name} ${user.last_name}`
                            }
                            onChange={() =>
                              toggleUser(user)
                            }
                          />
                        </td>

                        <td className="p-5 align-top">
                          <div className="flex justify-end gap-2">
                            {(user.role ===
                              "SUPERVISOR" ||
                              user.role ===
                                "VIEW" ||
                              user.role ===
                                "MERCADERISTA_REGIONAL") && (
                              <IconButton
                                label={`Asignar locales a ${user.first_name} ${user.last_name}`}
                                size="sm"
                                variant="primary"
                                onClick={() =>
                                  setAssignSupervisor(
                                    user,
                                  )
                                }
                              >
                                <FiMapPin size={14} />
                              </IconButton>
                            )}

                            {(user.role ===
                              "VIEW" ||
                              user.role ===
                                "SUPERVISOR" ||
                              user.role ===
                                "ADMIN_REGIONAL") && (
                              <IconButton
                                label={
                                  user.role === "ADMIN_REGIONAL"
                                    ? `Asignar usuarios y locales a ${user.first_name} ${user.last_name}`
                                    : `Asignar usuarios a ${user.first_name} ${user.last_name}`
                                }
                                size="sm"
                                variant="info"
                                onClick={() =>
                                  setAssignUser(
                                    user,
                                  )
                                }
                              >
                                <FiUsers size={14} />
                              </IconButton>
                            )}

                            <IconButton
                              label={`Editar usuario ${user.first_name} ${user.last_name}`}
                              size="sm"
                              onClick={() =>
                                setEditUser(user)
                              }
                            >
                              <FiEdit size={14} />
                            </IconButton>

                            <IconButton
                              label={`Restablecer contraseña de ${user.first_name} ${user.last_name}`}
                              size="sm"
                              variant="info"
                              onClick={() =>
                                setResetUser(user)
                              }
                            >
                              <FiRotateCw size={14} />
                            </IconButton>

                            <IconButton
                              label={
                                user.role !==
                                  "ADMIN_CLIENTE" &&
                                user.id !==
                                  userLocal.id
                                  ? `Eliminar usuario ${user.first_name} ${user.last_name}`
                                  : "Eliminar usuario no disponible"
                              }
                              size="sm"
                              variant="danger"
                              disabled={
                                user.role ===
                                  "ADMIN_CLIENTE" ||
                                user.id ===
                                  userLocal.id
                              }
                              onClick={() =>
                                setUserToDelete(
                                  user,
                                )
                              }
                            >
                              <FiTrash size={14} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-6"
                    >
                      <UsersEmptyState
                        title="Sin información disponible"
                        description="No existen usuarios que coincidan con los filtros seleccionados."
                        compact
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TARJETAS MÓVILES */}
        <section className="space-y-3 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                Resultados
              </p>

              <p className="mt-1 text-2xl font-black text-gray-900">
                {filteredUsers.length}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm transition-all hover:text-[#87be00]"
              aria-label="Actualizar usuarios"
            >
              <FiRotateCw size={16} />
            </button>
          </div>

          {filteredUsers.length > 0 ? (
            filteredUsers.map(
              (user, index) => {
                const roleVisual =
                  getRoleVisual(user.role)

                const companyName =
                  companies.find(
                    (company) =>
                      String(company.id) ===
                      String(user.company_id),
                  )?.name ||
                  "Sin empresa asignada"

                return (
                  <motion.article
                    key={user.id}
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.03,
                    }}
                    className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${roleVisual.avatar}`}
                        >
                          {getUserInitials(
                            user,
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-gray-900">
                            {user.first_name}{" "}
                            {user.last_name}
                          </h3>

                          <p className="mt-1 truncate text-[10px] font-medium text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={user.is_active}
                        disabled={
                          user.id ===
                          userLocal.id
                        }
                        size="sm"
                        label={
                          user.is_active
                            ? `Desactivar a ${user.first_name} ${user.last_name}`
                            : `Activar a ${user.first_name} ${user.last_name}`
                        }
                        onChange={() =>
                          toggleUser(user)
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${roleVisual.badge}`}
                      >
                        {getRoleLabel(
                          user.role,
                        )}
                      </span>

                      <span className="max-w-full truncate rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-blue-700">
                        {companyName}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                      <p className="flex items-center gap-2 text-[10px] font-semibold text-gray-500">
                        <FiPhone
                          className="shrink-0 text-[#87be00]"
                          size={13}
                        />
                        {user.phone ||
                          "Sin teléfono"}
                      </p>

                      <p className="flex items-center gap-2 text-[10px] font-semibold text-gray-500">
                        <FiFileText
                          className="shrink-0 text-[#87be00]"
                          size={13}
                        />
                        <span className="truncate">
                          {user.rut ||
                            "Sin RUT"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-50 pt-4">
                      {(user.role ===
                        "SUPERVISOR" ||
                        user.role ===
                          "VIEW" ||
                        user.role ===
                          "MERCADERISTA_REGIONAL") && (
                        <IconButton
                          label={`Asignar locales a ${user.first_name} ${user.last_name}`}
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            setAssignSupervisor(
                              user,
                            )
                          }
                        >
                          <FiMapPin size={14} />
                        </IconButton>
                      )}

                      {(user.role ===
                        "VIEW" ||
                        user.role ===
                          "SUPERVISOR" ||
                        user.role ===
                          "ADMIN_REGIONAL") && (
                        <IconButton
                          label={
                            user.role === "ADMIN_REGIONAL"
                              ? `Asignar usuarios y locales a ${user.first_name} ${user.last_name}`
                              : `Asignar usuarios a ${user.first_name} ${user.last_name}`
                          }
                          size="sm"
                          variant="info"
                          onClick={() =>
                            setAssignUser(
                              user,
                            )
                          }
                        >
                          <FiUsers size={14} />
                        </IconButton>
                      )}

                      <IconButton
                        label={`Editar usuario ${user.first_name} ${user.last_name}`}
                        size="sm"
                        onClick={() =>
                          setEditUser(user)
                        }
                      >
                        <FiEdit size={14} />
                      </IconButton>

                      <IconButton
                        label={`Restablecer contraseña de ${user.first_name} ${user.last_name}`}
                        size="sm"
                        variant="info"
                        onClick={() =>
                          setResetUser(user)
                        }
                      >
                        <FiRotateCw size={14} />
                      </IconButton>

                      <IconButton
                        label={
                          user.role !==
                            "ADMIN_CLIENTE" &&
                          user.id !==
                            userLocal.id
                            ? `Eliminar usuario ${user.first_name} ${user.last_name}`
                            : "Eliminar usuario no disponible"
                        }
                        size="sm"
                        variant="danger"
                        disabled={
                          user.role ===
                            "ADMIN_CLIENTE" ||
                          user.id ===
                            userLocal.id
                        }
                        onClick={() =>
                          setUserToDelete(user)
                        }
                      >
                        <FiTrash size={14} />
                      </IconButton>
                    </div>
                  </motion.article>
                )
              },
            )
          ) : (
            <UsersEmptyState
              title="Sin información disponible"
              description="No existen usuarios que coincidan con los filtros seleccionados."
            />
          )}
        </section>
      </main>

      {openBulkHelp && (
        <BulkUsersHelpModal
          onClose={() =>
            setOpenBulkHelp(false)
          }
        />
      )}

      <CreateAdminUserModal
        isOpen={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        onCreated={fetchData}
      />

      <EditAdminUserModal
        isOpen={!!editUser}
        user={editUser}
        stats={stats}
        onClose={() =>
          setEditUser(null)
        }
        onUpdated={fetchData}
      />

      {resetUser && (
        <ResetPasswordAdminModal
          user={resetUser}
          onClose={() =>
            setResetUser(null)
          }
          onUpdated={fetchData}
        />
      )}

      {assignSupervisor && (
        <AssignLocalesModal
          supervisor={assignSupervisor}
          onClose={() =>
            setAssignSupervisor(null)
          }
          onRefresh={fetchData}
        />
      )}

      {assignUser && (
        <AssignUsersModal
          targetUser={assignUser}
          onClose={() =>
            setAssignUser(null)
          }
          onRefresh={fetchData}
        />
      )}

      <AnimatePresence>
        {showContractAlertModal &&
          contractAlerts.length > 0 && (
            <ContractAlertsModal
              users={contractAlerts}
              companies={companies}
              onClose={() =>
                setShowContractAlertModal(
                  false,
                )
              }
              onEdit={(user) => {
                setShowContractAlertModal(
                  false,
                )
                setEditUser(user)
              }}
            />
          )}
      </AnimatePresence>

      {userToDelete && (
        <DeleteAdminUserModal
          user={userToDelete}
          onClose={() =>
            setUserToDelete(null)
          }
          onConfirm={() =>
            deleteUser(userToDelete)
          }
        />
      )}
    </div>
  )
}

const SelectArrow = () => (
  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </div>
)

const UsersEmptyState = ({
  title,
  description,
  compact = false,
}) => (
  <div
    className={`flex flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-gray-200 bg-white px-6 text-center ${
      compact ? "py-10" : "py-14"
    }`}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
      <FiUsers size={21} />
    </div>

    <h3 className="mt-4 text-base font-black text-gray-800">
      {title}
    </h3>

    {description && (
      <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-gray-400">
        {description}
      </p>
    )}
  </div>
)

const BulkUsersHelpModal = ({ onClose }) => {
  const handleDownloadTemplate = () => {
    const headers = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "password",
      "role",
      "rut",
      "position",
      "tipo_contrato",
      "fecha_inicio_contrato",
      "fecha_termino_contrato",
      "supervisor_nombre",
      "supervisor_telefono",
      "trabajando_para",
    ]

    const usersSheet =
      XLSX.utils.aoa_to_sheet([
        headers,
      ])

    usersSheet["!cols"] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 26 },
      { wch: 28 },
      { wch: 24 },
      { wch: 24 },
    ]

    usersSheet["!autofilter"] = {
      ref: "A1:N1",
    }

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet([
        [
          "Campo",
          "Obligatorio",
          "Descripción",
          "Ejemplo",
        ],
        [
          "first_name",
          "Sí",
          "Nombre del usuario.",
          "Ignacio",
        ],
        [
          "last_name",
          "Sí",
          "Apellidos del usuario.",
          "Estay Baeza",
        ],
        [
          "email",
          "Sí",
          "Correo electrónico único.",
          "usuario@empresa.cl",
        ],
        [
          "phone",
          "No",
          "Teléfono de contacto.",
          "56912345678",
        ],
        [
          "password",
          "Sí",
          "Contraseña temporal inicial.",
          "Temporal01",
        ],
        [
          "role",
          "Sí",
          "Rol válido: ADMIN_CLIENTE, SUPERVISOR, USUARIO o VIEW.",
          "USUARIO",
        ],
        [
          "rut",
          "Sí",
          "RUT chileno con dígito verificador.",
          "28.176.589-2",
        ],
        [
          "position",
          "No",
          "Cargo o función del colaborador.",
          "Mercaderista",
        ],
        [
          "tipo_contrato",
          "No",
          "Tipo de contrato laboral.",
          "Indefinido",
        ],
        [
          "fecha_inicio_contrato",
          "No",
          "Fecha de inicio en formato AAAA-MM-DD.",
          "2026-05-01",
        ],
        [
          "fecha_termino_contrato",
          "No",
          "Fecha de término en formato AAAA-MM-DD.",
          "2026-05-31",
        ],
        [
          "supervisor_nombre",
          "No",
          "Nombre del supervisor directo. Úsalo para mercaderistas.",
          "Juan Estay Rodríguez",
        ],
        [
          "supervisor_telefono",
          "No",
          "Teléfono del supervisor directo.",
          "995318205",
        ],
        [
          "trabajando_para",
          "No",
          "Marca, cliente o empresa para la que presta servicio.",
          "Walmart",
        ],
      ])

    instructionsSheet["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 62 },
      { wch: 30 },
    ]

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      usersSheet,
      "Usuarios",
    )

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instrucciones",
    )

    XLSX.writeFile(
      workbook,
      "Carga_Masiva_Usuarios.xlsx",
      {
        bookType: "xlsx",
        compression: true,
      },
    )
  }

  const columns = [
    {
      name: "first_name",
      description: "Nombre del usuario.",
      example: "Ignacio",
      required: true,
    },
    {
      name: "last_name",
      description: "Apellidos del usuario.",
      example: "Estay Baeza",
      required: true,
    },
    {
      name: "email",
      description: "Correo electrónico único dentro de CultivApp.",
      example: "usuario@empresa.cl",
      required: true,
    },
    {
      name: "phone",
      description: "Teléfono de contacto del usuario.",
      example: "56912345678",
      required: false,
    },
    {
      name: "password",
      description: "Contraseña temporal utilizada en el primer acceso.",
      example: "Temporal01",
      required: true,
    },
    {
      name: "role",
      description: "Rol permitido: ADMIN_CLIENTE, SUPERVISOR, USUARIO o VIEW.",
      example: "USUARIO",
      required: true,
    },
    {
      name: "rut",
      description: "RUT chileno con dígito verificador.",
      example: "28.176.589-2",
      required: true,
    },
    {
      name: "position",
      description: "Cargo o función del colaborador.",
      example: "Mercaderista",
      required: false,
    },
    {
      name: "tipo_contrato",
      description: "Tipo de contrato laboral.",
      example: "Indefinido",
      required: false,
    },
    {
      name: "fecha_inicio_contrato",
      description: "Fecha de inicio en formato AAAA-MM-DD.",
      example: "2026-05-01",
      required: false,
    },
    {
      name: "fecha_termino_contrato",
      description: "Fecha de término en formato AAAA-MM-DD.",
      example: "2026-05-31",
      required: false,
    },
    {
      name: "supervisor_nombre",
      description: "Nombre del supervisor directo del mercaderista.",
      example: "Juan Estay Rodríguez",
      required: false,
    },
    {
      name: "supervisor_telefono",
      description: "Teléfono del supervisor directo.",
      example: "995318205",
      required: false,
    },
    {
      name: "trabajando_para",
      description: "Marca, cliente o empresa para la que presta servicio.",
      example: "Walmart",
      required: false,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-users-help-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-slate-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiFileText size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Carga masiva
                </p>

                <h2
                  id="bulk-users-help-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-slate-900 sm:text-2xl"
                >
                  Formato de usuarios
                </h2>

                <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-400">
                  Conserva exactamente los encabezados y descarga la plantilla oficial.
                </p>
              </div>
            </div>

            <IconButton
              label="Cerrar ayuda de carga masiva"
              onClick={onClose}
            >
              <FiX size={18} />
            </IconButton>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/50 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.6rem] border border-[#87be00]/20 bg-[#87be00]/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertTriangle
                className="mt-0.5 shrink-0 text-[#679300]"
                size={17}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#679300]">
                  Empresa de destino
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-600">
                  La carga se asociará a la empresa seleccionada en el filtro. Para administradores sin acceso global se utilizará automáticamente la empresa de su sesión.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-800">
                Leyenda de columnas
              </h3>

              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Los nombres deben mantenerse en minúsculas y sin espacios adicionales.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {columns.map((column) => (
                <div
                  key={column.name}
                  className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[200px_1fr] sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-lg border border-[#87be00]/20 bg-[#87be00]/10 px-2.5 py-1 font-mono text-[9px] font-black text-[#679300]">
                      {column.name}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${
                        column.required
                          ? "border-rose-100 bg-rose-50 text-rose-500"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {column.required ? "Obligatorio" : "Opcional"}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold leading-relaxed text-slate-600">
                      {column.description}
                    </p>

                    <p className="mt-1 text-[9px] font-medium text-slate-400">
                      Ejemplo:{" "}
                      <strong className="text-slate-600">
                        {column.example}
                      </strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-800">
              Antes de importar
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Completa los registros en la hoja Usuarios.",
                "No cambies los nombres de los encabezados.",
                "Usa correos y RUT únicos.",
                "Escribe el rol exactamente en mayúsculas.",
                "Usa fechas con formato AAAA-MM-DD.",
                "Guarda el archivo en formato .xlsx.",
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3"
                >
                  <FiCheckCircle
                    className="mt-0.5 shrink-0 text-[#87be00]"
                    size={14}
                  />

                  <span className="text-[10px] font-semibold leading-relaxed text-slate-600">
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="order-2 sm:order-1"
          >
            Cerrar
          </Button>

          <Button
            type="button"
            variant="dark"
            leftIcon={<FiDownload size={15} />}
            onClick={handleDownloadTemplate}
            className="order-1 sm:order-2"
          >
            Descargar plantilla oficial
          </Button>
        </footer>
      </div>
    </div>
  )
}

const ProgressCard = ({
  title,
  used,
  max,
  color,
  icon,
  bgClass,
  description,
}) => {
  const percentage =
    typeof max === "number" &&
    max > 0
      ? Math.min(
          (used / max) * 100,
          100,
        )
      : 0

  return (
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-gray-100">
        <div
          className={`${color} h-full rounded-r-full transition-all duration-1000 ease-out`}
          style={{
            width:
              typeof max === "number"
                ? `${percentage}%`
                : "0%",
          }}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bgClass}`}
        >
          {icon}
        </div>

        <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
          Licencias
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-400">
          {title}
        </p>

        <p className="mt-2 text-3xl font-black leading-none text-gray-900">
          {used}
          <span className="ml-1.5 text-sm font-bold text-gray-300">
            / {max}
          </span>
        </p>

        <p className="mt-3 text-[10px] font-medium leading-relaxed text-gray-400">
          {description}
        </p>
      </div>
    </article>
  )
}

const ContractAlertsModal = ({ users, companies, onClose, onEdit }) => {
  const expiredCount = users.filter(
    (user) => user.contractStatus?.status === "expired"
  ).length

  const criticalCount = users.filter(
    (user) => user.contractStatus?.status === "critical"
  ).length

  const warningCount = users.filter(
    (user) => user.contractStatus?.status === "warning"
  ).length

  const getStatusConfig = (contractStatus) => {
    switch (contractStatus?.status) {
      case "expired":
        return {
          label: "Contrato vencido",
          description: `Venció hace ${Math.abs(contractStatus.daysRemaining)} ${
            Math.abs(contractStatus.daysRemaining) === 1 ? "día" : "días"
          }`,
          iconClass: "bg-rose-100 text-rose-600",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          rowClass: "border-rose-100 bg-rose-50/30"
        }

      case "critical":
        return {
          label: "Vencimiento crítico",
          description:
            contractStatus.daysRemaining === 0
              ? "Vence hoy"
              : `Vence en ${contractStatus.daysRemaining} ${
                  contractStatus.daysRemaining === 1 ? "día" : "días"
                }`,
          iconClass: "bg-orange-100 text-orange-600",
          badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
          rowClass: "border-orange-100 bg-orange-50/30"
        }

      case "warning":
        return {
          label: "Próximo a vencer",
          description: `Vence en ${contractStatus.daysRemaining} días`,
          iconClass: "bg-amber-100 text-amber-600",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          rowClass: "border-amber-100 bg-amber-50/20"
        }

      default:
        return {
          label: "Vigente",
          description: "",
          iconClass: "bg-emerald-100 text-emerald-600",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          rowClass: "border-emerald-100 bg-emerald-50/20"
        }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-4 font-[Outfit] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-gray-100 bg-white p-6 md:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <FiAlertTriangle size={24} />
              </div>

              <div>
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                  Alertas de contratos
                </h2>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Se encontraron colaboradores con contratos vencidos o próximos a vencer.
                </p>
              </div>
            </div>

            <IconButton
              label="Cerrar alertas de contratos"
              onClick={onClose}
            >
              <FiX size={18} />
            </IconButton>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mt-5">
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-rose-600">{expiredCount}</p>
              <p className="text-[8px] md:text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                Vencidos
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-orange-600">{criticalCount}</p>
              <p className="text-[8px] md:text-[9px] font-bold text-orange-500 uppercase tracking-wider">
                Hasta 2 días
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-amber-600">{warningCount}</p>
              <p className="text-[8px] md:text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                Hasta 5 días
              </p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/40 p-4 md:p-6">
          {users.map((user) => {
            const config = getStatusConfig(user.contractStatus)

            const companyName =
              companies.find(
                (company) => String(company.id) === String(user.company_id)
              )?.name || "Sin empresa"

            return (
              <div
                key={user.id}
                className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${config.rowClass}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.iconClass}`}>
                    <FiAlertTriangle size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-slate-900 uppercase truncate">
                      {user.first_name} {user.last_name}
                    </p>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {user.email}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-lg border text-[8px] font-extrabold uppercase tracking-wider ${config.badgeClass}`}>
                        {config.label}
                      </span>

                      <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[8px] font-bold text-slate-500 uppercase">
                        {companyName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:text-right">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700">
                      {config.description}
                    </p>

                    <p className="text-[9px] text-slate-400 mt-1">
                      Término: {formatContractDate(user.fecha_termino_contrato)}
                    </p>
                  </div>

                  <Button
                    variant="dark"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="shrink-0"
                  >
                    Regularizar contrato
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-4 md:p-5 flex justify-end">
          <Button onClick={onClose}>
            Entendido
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const DeleteAdminUserModal = ({ user, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-4 font-[Outfit] backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <IconButton
          label="Cerrar confirmación de eliminación"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <FiX size={16} />
        </IconButton>

        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
            <FiAlertTriangle size={22} />
          </div>
          
          <h3 className="text-base font-extrabold text-[#111111] uppercase tracking-tight">
            Eliminar usuario
          </h3>
          
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Estás a punto de eliminar de forma permanente al colaborador <strong className="text-slate-800 uppercase font-bold">{user.first_name} {user.last_name}</strong>. Esta acción no se puede revertir.
          </p>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-3.5 w-full flex items-center justify-center gap-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Rol: {getRoleLabel(user.role)}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-medium font-mono text-slate-500">ID: {user.id?.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiTrash size={13} /> Eliminar
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

const inputClass = `
  h-12 w-full rounded-2xl
  border border-gray-100
  bg-gray-50
  px-4
  text-[11px] font-bold
  text-gray-700
  outline-none
  shadow-inner
  transition-all
  placeholder:text-gray-300
  focus:border-[#87be00]/40
  focus:bg-white
  focus:ring-4
  focus:ring-[#87be00]/10
`

const thClass =
  "px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 whitespace-nowrap"

export default AdminUsers;
