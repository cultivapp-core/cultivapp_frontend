export const ROLE_LABELS = {
  ROOT: "Administrador general",

  ADMIN: "Administrador",
  ADMIN_CLIENTE: "Administrador",

  SUPERVISOR: "Supervisor",

  MERCADERISTA: "Mercaderista",
  USUARIO: "Mercaderista",

  VIEWER: "Visualizador",
  VIEW: "Visualizador",
};

export const ROUTE_STATUS_LABELS = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] ?? role ?? "Sin perfil";
};

export const getRouteStatusLabel = (status) => {
  return ROUTE_STATUS_LABELS[status] ?? status ?? "Sin estado";
};