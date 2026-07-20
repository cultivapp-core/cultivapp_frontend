import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiLoader,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
} from "../../components/ui";

const COLUMN_LABELS = {
  asistencia: {
    operario: "Operario",
    local: "Local",
    fecha: "Fecha",
    hora_ingreso: "Hora ingreso",
    hora_salida: "Hora salida",
    status: "Estado",
  },
  visitas: {
    operario: "Operario",
    local: "Local",
    fecha: "Fecha visita",
    hora_ingreso: "Inicio visita",
    hora_salida: "Fin visita",
    duracion_min: "Duración (min)",
    status: "Estado",
  },
  gestion: {
    fecha: "Fecha",
    operario: "Operario",
    local: "Local",
    cantidad_codigos:
      "Cantidad EAN",
    codigos_ean: "Códigos EAN",
    producto: "Producto",
    marca: "Marca",
    task_type: "Tipo tarea",
    observacion: "Observación",
    start_time: "Inicio tarea",
    end_time: "Fin tarea",
    duracion_minutos:
      "Duración (min)",
    foto_antes: "Foto antes",
    foto_despues: "Foto después",
  },
};

const STATUS_LABELS = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  IN_PROGRESS: "En curso",
};

const REPORT_TYPES = [
  {
    value: "asistencia",
    label: "Asistencia",
    description:
      "Entradas y salidas",
    icon: FiUsers,
  },
  {
    value: "visitas",
    label: "Visitas",
    description:
      "Duración de visitas",
    icon: FiClock,
  },
  {
    value: "gestion",
    label: "Gestión",
    description:
      "Tareas y códigos EAN",
    icon: FiCheckCircle,
  },
];

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "es-CL",
    {
      timeZone:
        "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "es-CL",
    {
      timeZone:
        "America/Santiago",
    },
  );
};

const buildRows = (
  data,
  type,
) => {
  const labels =
    COLUMN_LABELS[type] || {};

  return data.map((row) => {
    const output = {};

    Object.entries(labels).forEach(
      ([key, label]) => {
        if (!(key in row)) return;

        let value = row[key];

        if (
          key ===
            "hora_ingreso" ||
          key ===
            "hora_salida" ||
          key === "start_time" ||
          key === "end_time"
        ) {
          value =
            formatDateTime(value);
        } else if (
          key === "fecha"
        ) {
          value = formatDate(value);
        } else if (
          key === "status"
        ) {
          value =
            STATUS_LABELS[value] ||
            value ||
            "—";
        }

        output[label] =
          value ?? "—";
      },
    );

    return output;
  });
};

const ReportsPage = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [loading, setLoading] =
    useState(false);
  const [companies, setCompanies] =
    useState([]);
  const [
    loadingCompanies,
    setLoadingCompanies,
  ] = useState(false);
  const [
    lastResult,
    setLastResult,
  ] = useState(null);
  const [error, setError] =
    useState("");

  const [filters, setFilters] =
    useState({
      type: "asistencia",
      companyId:
        user?.company_id || "",
      startDate: new Date()
        .toISOString()
        .split("T")[0],
      endDate: new Date()
        .toISOString()
        .split("T")[0],
    });

  useEffect(() => {
    if (
      !isRoot &&
      user?.company_id
    ) {
      setFilters((current) => ({
        ...current,
        companyId:
          user.company_id,
      }));
    }
  }, [
    isRoot,
    user?.company_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!isRoot) return;

      try {
        setLoadingCompanies(true);

        const response =
          await api.get("/companies");

        const data =
          getResponseData(
            response,
            [],
          );

        setCompanies(
          Array.isArray(data)
            ? data.filter(
                (company) =>
                  company?.is_active !==
                  false,
              )
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );

        toast.error(
          "No se pudieron cargar las empresas",
        );
      } finally {
        setLoadingCompanies(false);
      }
    }, [isRoot]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const selectedReport =
    useMemo(
      () =>
        REPORT_TYPES.find(
          (report) =>
            report.value ===
            filters.type,
        ) ||
        REPORT_TYPES[0],
      [filters.type],
    );

  const visibleColumns =
    useMemo(
      () =>
        Object.values(
          COLUMN_LABELS[
            filters.type
          ] || {},
        ),
      [filters.type],
    );

  const updateFilter = (
    field,
    value,
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));

    setLastResult(null);
    setError("");
  };

  const validateFilters = () => {
    if (
      isRoot &&
      !filters.companyId
    ) {
      return "Selecciona una empresa.";
    }

    if (
      !filters.startDate ||
      !filters.endDate
    ) {
      return "Selecciona el rango de fechas.";
    }

    if (
      filters.startDate >
      filters.endDate
    ) {
      return "La fecha de inicio no puede ser posterior a la fecha de término.";
    }

    return "";
  };

  const handleDownload =
    async () => {
      const validationMessage =
        validateFilters();

      if (validationMessage) {
        toast.error(
          validationMessage,
        );
        return;
      }

      setLoading(true);
      setError("");
      setLastResult(null);

      try {
        const reportType =
          filters.type ===
          "visitas"
            ? "asistencia"
            : filters.type;

        const response =
          await api.get(
            "/reports/data",
            {
              params: {
                type: reportType,
                company_id:
                  filters.companyId,
                startDate:
                  filters.startDate,
                endDate:
                  filters.endDate,
                _t: Date.now(),
              },
            },
          );

        let data =
          getResponseData(
            response,
            [],
          );

        if (
          !Array.isArray(data)
        ) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        if (
          filters.type ===
          "visitas"
        ) {
          data = data.map(
            (row) => ({
              ...row,
              duracion_min:
                row.hora_ingreso &&
                row.hora_salida
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(
                          row.hora_salida,
                        ).getTime() -
                          new Date(
                            row.hora_ingreso,
                          ).getTime()) /
                          60000,
                      ),
                    )
                  : null,
            }),
          );
        }

        if (data.length === 0) {
          setLastResult({
            count: 0,
            fileName: null,
          });
          return;
        }

        const rows =
          buildRows(
            data,
            filters.type,
          );

        const worksheet =
          XLSX.utils.json_to_sheet(
            rows,
          );

        worksheet["!cols"] =
          Object.keys(
            rows[0] || {},
          ).map((column) => ({
            wch: Math.max(
              18,
              Math.min(
                35,
                column.length + 5,
              ),
            ),
          }));

        const workbook =
          XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          selectedReport.label.slice(
            0,
            31,
          ),
        );

        const fileName =
          `Informe_${filters.type}_${filters.startDate}_${filters.endDate}.xlsx`;

        XLSX.writeFile(
          workbook,
          fileName,
        );

        setLastResult({
          count: data.length,
          fileName,
        });

        toast.success(
          "Informe generado correctamente",
        );
      } catch (requestError) {
        console.error(
          "Error generando informe:",
          requestError,
        );

        const message =
          requestError?.response?.data
            ?.message ||
          requestError?.message ||
          "No se pudo generar el informe.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiFileText size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Centro de informes
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Gestión de datos operativos
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_TYPES.map(
            (report) => {
              const active =
                filters.type ===
                report.value;

              const Icon =
                report.icon;

              return (
                <button
                  key={report.value}
                  type="button"
                  onClick={() =>
                    updateFilter(
                      "type",
                      report.value,
                    )
                  }
                  className={`flex items-center sm:items-start sm:flex-col gap-3 sm:gap-2 p-4 rounded-2xl border transition-all text-left ${
                    active
                      ? "bg-gray-900 border-gray-900 text-white shadow-lg"
                      : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={
                      active
                        ? "text-[#87be00]"
                        : "text-gray-400"
                    }
                  >
                    <Icon size={17} />
                  </span>

                  <span>
                    <span className="text-[11px] font-black uppercase tracking-wider block">
                      {report.label}
                    </span>

                    <span
                      className={`text-[9px] font-bold block mt-0.5 ${
                        active
                          ? "text-gray-300"
                          : "text-gray-400"
                      }`}
                    >
                      {
                        report.description
                      }
                    </span>
                  </span>
                </button>
              );
            },
          )}
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
          {isRoot && (
            <Field label="Empresa">
              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={
                    filters.companyId
                  }
                  onChange={(event) =>
                    updateFilter(
                      "companyId",
                      event.target.value,
                    )
                  }
                  disabled={
                    loadingCompanies ||
                    loading
                  }
                  className={`${inputClass} pl-11`}
                >
                  <option value="">
                    Seleccionar empresa
                  </option>

                  {companies.map(
                    (company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name ||
                          company.nombre ||
                          "Empresa"}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {loadingCompanies && (
                <p className="text-[10px] text-gray-400 mt-2">
                  Cargando empresas...
                </p>
              )}
            </Field>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fecha de inicio">
              <input
                type="date"
                value={
                  filters.startDate
                }
                onChange={(event) =>
                  updateFilter(
                    "startDate",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Fecha de término">
              <input
                type="date"
                value={
                  filters.endDate
                }
                onChange={(event) =>
                  updateFilter(
                    "endDate",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-3">
              Columnas incluidas
            </p>

            <div className="flex flex-wrap gap-2">
              {visibleColumns.map(
                (column) => (
                  <span
                    key={column}
                    className="text-[8px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#87be00]/10 text-[#6a9400] rounded-full border border-[#87be00]/10"
                  >
                    {column}
                  </span>
                ),
              )}
            </div>
          </div>

          {lastResult?.count ===
            0 && (
            <InformationMessage
              title="Sin información disponible"
              description="No existen registros para la empresa, tipo de informe y rango de fechas seleccionados."
            />
          )}

          {lastResult?.count >
            0 && (
            <InformationMessage
              title="Informe generado"
              description={`${lastResult.count} registro${
                lastResult.count === 1
                  ? ""
                  : "s"
              } exportado${
                lastResult.count === 1
                  ? ""
                  : "s"
              } correctamente.`}
              tone="success"
            />
          )}

          {error && (
            <InformationMessage
              title="No se pudo generar el informe"
              description={error}
              tone="danger"
            />
          )}

          <Button
            type="button"
            variant="dark"
            size="lg"
            fullWidth
            loading={loading}
            loadingText="Procesando..."
            leftIcon={
              loading ? (
                <FiLoader
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <FiDownload
                  size={15}
                />
              )
            }
            onClick={handleDownload}
          >
            Descargar informe
          </Button>
        </section>

        <section className="flex items-start gap-3 p-4 bg-[#87be00]/5 rounded-2xl border border-[#87be00]/10">
          <FiFileText
            className="text-[#87be00] shrink-0 mt-0.5"
            size={16}
          />

          <p className="text-[10px] font-semibold text-gray-600 leading-relaxed">
            Los informes se exportan en
            formato XLSX. Verifica la
            empresa, el tipo de informe y
            el rango de fechas antes de
            generar la descarga.
          </p>
        </section>
      </main>
    </div>
  );
};

const Field = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 ml-1 mb-2 block">
      {label}
    </span>

    {children}
  </label>
);

const InformationMessage = ({
  title,
  description,
  tone = "neutral",
}) => {
  const styles = {
    neutral:
      "bg-gray-50 border-gray-200 text-gray-700",
    success:
      "bg-green-50 border-green-200 text-green-700",
    danger:
      "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        styles[tone] ||
        styles.neutral
      }`}
    >
      <p className="text-xs font-black">
        {title}
      </p>

      {description && (
        <p className="text-[10px] mt-1 opacity-80">
          {description}
        </p>
      )}
    </div>
  );
};

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-xs font-bold text-gray-700
  outline-none transition-all
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
  disabled:cursor-not-allowed
  disabled:opacity-60
`;

export default ReportsPage;