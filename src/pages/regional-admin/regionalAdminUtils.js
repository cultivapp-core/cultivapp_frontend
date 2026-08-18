export const getPayload = (response) => response?.data ?? response ?? {};

export const getArray = (value, candidateKeys = []) => {
  const payload = getPayload(value);

  if (Array.isArray(payload)) return payload;

  for (const key of candidateKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

export const getFilters = (response) => {
  const payload = getPayload(response);

  return {
    companies: getArray(payload, ["companies", "empresas"]),
    regions: getArray(payload, ["regions", "regiones"]),
    locales: getArray(payload, ["locales", "stores"]),
  };
};

export const getDashboardRows = (response) =>
  getArray(response, [
    "items",
    "rows",
    "inventory",
    "inventories",
    "balances",
    "stock",
    "products",
  ]);

export const getProductRows = (response) =>
  getArray(response, ["items", "rows", "products", "catalog"]);

export const getHistoryRows = (response) =>
  getArray(response, ["items", "rows", "history", "loads", "data"]);

export const getMovementRows = (response) =>
  getArray(response, ["items", "rows", "movements", "history"]);

export const idOf = (item) =>
  item?.id ?? item?.company_id ?? item?.region_id ?? item?.local_id ?? "";

export const nameOf = (item) =>
  item?.name ??
  item?.nombre ??
  item?.company_name ??
  item?.region_name ??
  item?.local_name ??
  item?.nombre_local ??
  item?.codigo_local ??
  "Sin nombre";

export const localLabel = (item) => {
  const code = item?.codigo_local ?? item?.local_code ?? item?.code;
  const name = item?.local_name ?? item?.nombre_local ?? item?.name ?? item?.nombre;

  if (code && name && code !== name) return `${code} · ${name}`;
  return code || name || "Local sin nombre";
};

export const numberOf = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatQuantity = (value, unitType = "UN") =>
  new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: unitType === "KG" ? 3 : 0,
    maximumFractionDigits: unitType === "KG" ? 3 : 0,
  }).format(numberOf(value));

export const formatDate = (value, withTime = false) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {}),
  }).format(date);
};

export const todayInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export const getErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.response?.data?.message ??
  error?.message ??
  fallback;
