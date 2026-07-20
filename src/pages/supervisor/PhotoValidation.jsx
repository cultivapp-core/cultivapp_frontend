import {
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiDownload,
  FiDownloadCloud,
  FiExternalLink,
  FiHash,
  FiImage,
  FiLoader,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const getLocalISODate = (
  offsetDays = 0,
) => {
  const date = new Date();
  date.setDate(
    date.getDate() + offsetDays,
  );

  const timezoneOffset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .split("T")[0];
};

const safeFileName = (
  text,
  fallback = "sin_dato",
) => {
  if (!text) return fallback;

  return String(text)
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "_",
    )
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const INITIAL_FILTERS = {
  startDate: getLocalISODate(-30),
  endDate: getLocalISODate(),
  localCode: "",
  workerName: "",
  searchTerm: "",
  company_id: "",
};

const PhotoValidation = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [companies, setCompanies] =
    useState([]);

  const [inputs, setInputs] =
    useState({
      ...INITIAL_FILTERS,
      company_id:
        isRoot
          ? ""
          : user?.company_id || "",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    ...INITIAL_FILTERS,
    search: "",
    company_id:
      isRoot
        ? ""
        : user?.company_id || "",
  });

  const [
    filterError,
    setFilterError,
  ] = useState("");
  const [
    zippingVisitId,
    setZippingVisitId,
  ] = useState(null);
  const [
    zippingAll,
    setZippingAll,
  ] = useState(false);

  const {
    data: photos = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "audit-photos",
      appliedFilters,
    ],
    queryFn: async () => {
      const params = {
        company_id:
          appliedFilters.company_id ||
          undefined,
        startDate:
          appliedFilters.startDate,
        endDate:
          appliedFilters.endDate,
        localCode:
          appliedFilters.localCode.trim(),
        workerName:
          appliedFilters.workerName.trim(),
        search:
          appliedFilters.search.trim(),
      };

      const response =
        await api.get(
          "/routes/evidence-report",
          {
            params,
          },
        );

      const data =
        getResponseData(
          response,
          [],
        );

      if (!Array.isArray(data)) {
        throw new Error(
          "La API devolvió un formato inesperado.",
        );
      }

      if (import.meta.env.DEV) {
        console.log(
          "Primera evidencia recibida:",
          data[0] || null,
        );
      }

      return data;
    },
    enabled:
      isRoot ||
      Boolean(user?.company_id),
  });

  useQuery({
    queryKey: [
      "photo-validation-companies",
    ],
    queryFn: async () => {
      if (!isRoot) return [];

      const response =
        await api.get("/companies");

      const data =
        getResponseData(
          response,
          [],
        );

      const list =
        Array.isArray(data)
          ? data.filter(
              (company) =>
                company?.is_active !==
                false,
            )
          : [];

      setCompanies(list);
      return list;
    },
    enabled: isRoot,
    staleTime: 5 * 60 * 1000,
  });

  const visitGroups = useMemo(() => {
    const map = new Map();

    photos.forEach((item) => {
      const key =
        item.visit_id ||
        [
          item.user_id,
          item.local_codigo,
          item.created_at,
        ].join("-");

      if (!map.has(key)) {
        const localName =
          item.local_nombre ||
          item.local_name ||
          item.cadena ||
          item.nombre_local ||
          null;

        const localCode =
          item.local_codigo ||
          item.local_code ||
          item.codigo_local ||
          item.codigo ||
          null;

        const localAddress =
          item.local_direccion ||
          item.local_address ||
          item.direccion ||
          null;

        const workerName =
          item.user_name ||
          item.worker_name ||
          item.mercaderista ||
          [
            item.first_name,
            item.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          null;

        map.set(key, {
          visit_id:
            item.visit_id,
          visit_number:
            item.visit_number ||
            null,
          local_id:
            item.local_id ||
            null,
          local_codigo:
            localCode,
          local_nombre:
            localName,
          local_direccion:
            localAddress,
          user_name:
            workerName,
          user_rut:
            item.user_rut ||
            item.worker_rut ||
            item.rut ||
            null,
          company_name:
            item.empresa_nombre ||
            item.company_name ||
            null,
          company_id:
            item.company_id ||
            null,
          created_at:
            item.created_at,
          photos: [],
        });
      }

      map.get(key).photos.push({
        ...item,
      });
    });

    const groups =
      Array.from(map.values()).sort(
        (a, b) =>
          String(
            b.created_at || "",
          ).localeCompare(
            String(
              a.created_at || "",
            ),
          ),
      );

    groups.forEach((group) => {
      const productOrder =
        new Map();
      let nextNumber = 1;

      group.photos.forEach(
        (photo) => {
          if (!photo.product_id) {
            photo.product_label =
              null;
            return;
          }

          if (
            !productOrder.has(
              photo.product_id,
            )
          ) {
            productOrder.set(
              photo.product_id,
              nextNumber,
            );
            nextNumber += 1;
          }

          const number =
            productOrder.get(
              photo.product_id,
            );

          const name =
            photo.product_name ||
            "Producto sin nombre";

          photo.product_label =
            `Producto N° ${number} - ${name}`;
        },
      );
    });

    return groups;
  }, [photos]);

  const totalPhotos = photos.length;
  const totalVisits =
    visitGroups.length;

  const handleApply = () => {
    if (
      inputs.startDate &&
      inputs.endDate &&
      inputs.startDate >
        inputs.endDate
    ) {
      setFilterError(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
      return;
    }

    if (
      isRoot &&
      !inputs.company_id
    ) {
      setFilterError(
        "Selecciona una empresa.",
      );
      return;
    }

    setFilterError("");

    setAppliedFilters({
      startDate:
        inputs.startDate,
      endDate: inputs.endDate,
      localCode:
        inputs.localCode,
      workerName:
        inputs.workerName,
      search:
        inputs.searchTerm,
      company_id:
        inputs.company_id,
    });
  };

  const clearFilters = () => {
    const next = {
      ...INITIAL_FILTERS,
      company_id:
        isRoot
          ? ""
          : user?.company_id || "",
    };

    setInputs(next);
    setFilterError("");

    setAppliedFilters({
      ...next,
      search: "",
    });
  };

  const getImageUrl = (item) => {
    const path =
      item.image_url ||
      item.photo_url ||
      "";

    if (!path) return "";

    if (
      path.startsWith("http")
    ) {
      return path;
    }

    const apiUrl =
      import.meta.env
        .VITE_API_URL || "";

    const baseUrl =
      apiUrl.includes("/api")
        ? apiUrl.split("/api")[0]
        : apiUrl.replace(
            /\/$/,
            "",
          );

    let cleanPath = path
      .trim()
      .replace(/\\/g, "/")
      .replace(
        /^uploads\//i,
        "",
      );

    if (
      cleanPath.includes(
        "usuario_desconocido",
      ) ||
      cleanPath.includes(
        "default_tenant",
      )
    ) {
      const slugify = (
        text,
      ) =>
        String(
          text || "desconocido",
        )
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            "",
          )
          .replace(/\s+/g, "_")
          .replace(
            /[^a-z0-9_]/g,
            "",
          );

      const safeCompany =
        slugify(
          item.empresa_nombre,
        );
      const safeUser =
        slugify(item.user_name);
      const fileName =
        cleanPath
          .split("/")
          .pop();

      const mapping = {
        Fachada: "foto_local",
        "Góndola Inicio":
          "foto_gondola",
        "Góndola Final":
          "foto_term_producto",
        Observaciones:
          "foto_observaciones",
      };

      const subFolder =
        mapping[
          item.photo_type
        ] || "otros";

      cleanPath =
        `${safeCompany}/${safeUser}/evidencias/${subFolder}/${fileName}`;
    }

    return `${baseUrl}/uploads/${cleanPath}`;
  };

  const getExtensionFromUrl = (
    url,
    fallback = "jpg",
  ) => {
    try {
      const clean =
        url.split("?")[0];

      const match =
        clean.match(
          /\.([a-zA-Z0-9]+)$/,
        );

      return match
        ? match[1].toLowerCase()
        : fallback;
    } catch {
      return fallback;
    }
  };

  const buildPhotoFileName = (
    item,
    index,
    extension,
  ) => {
    const photoType =
      String(
        item.photo_type || "",
      ).toLowerCase();

    const isStart =
      photoType.startsWith(
        "gondola_inicio",
      );

    const isEnd =
      photoType.startsWith(
        "gondola_fin",
      );

    const suffix = isStart
      ? "_Inicio"
      : isEnd
        ? "_Fin"
        : "";

    const base =
      item.product_label
        ? safeFileName(
            item.product_label,
            "producto",
          )
        : safeFileName(
            item.photo_type,
            "evidencia",
          );

    return `${String(
      index + 1,
    ).padStart(
      2,
      "0",
    )}_${base}${suffix}.${extension}`;
  };

  const downloadBlob = (
    blob,
    fileName,
  ) => {
    const url =
      window.URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(
      link,
    );
    link.click();
    document.body.removeChild(
      link,
    );

    window.URL.revokeObjectURL(
      url,
    );
  };

  const handleDownload = async (
    imageUrl,
    fileName,
  ) => {
    if (!imageUrl) {
      toast.error(
        "La imagen no está disponible.",
      );
      return;
    }

    try {
      const response =
        await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const blob =
        await response.blob();

      const extension =
        getExtensionFromUrl(
          imageUrl,
        );

      downloadBlob(
        blob,
        `${safeFileName(
          fileName,
          "evidencia",
        )}.${extension}`,
      );
    } catch (downloadError) {
      console.error(
        "Error descargando imagen:",
        downloadError,
      );

      window.open(
        imageUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const handleDownloadVisitZip =
    async (group) => {
      if (
        !group.photos ||
        group.photos.length === 0
      ) {
        return;
      }

      setZippingVisitId(
        group.visit_id,
      );

      let addedFiles = 0;

      try {
        const zip = new JSZip();

        const folderName =
          safeFileName(
            `${
              group.local_codigo ||
              "local"
            }_${
              group.visit_number ||
              group.visit_id?.slice(
                0,
                8,
              ) ||
              "visita"
            }`,
          );

        const folder =
          zip.folder(folderName);

        for (
          let index = 0;
          index <
          group.photos.length;
          index += 1
        ) {
          const item =
            group.photos[index];

          const url =
            getImageUrl(item);

          if (!url) continue;

          try {
            const response =
              await fetch(url);

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}`,
              );
            }

            const blob =
              await response.blob();

            const extension =
              getExtensionFromUrl(
                url,
              );

            const fileName =
              buildPhotoFileName(
                item,
                index,
                extension,
              );

            folder.file(
              fileName,
              blob,
            );

            addedFiles += 1;
          } catch (photoError) {
            console.error(
              `No se pudo agregar la foto ${item.id}:`,
              photoError,
            );
          }
        }

        if (addedFiles === 0) {
          throw new Error(
            "No se pudo descargar ninguna imagen.",
          );
        }

        const zipBlob =
          await zip.generateAsync({
            type: "blob",
          });

        downloadBlob(
          zipBlob,
          `${folderName}.zip`,
        );

        toast.success(
          `${addedFiles} evidencia(s) descargadas`,
        );
      } catch (zipError) {
        console.error(
          "Error generando ZIP:",
          zipError,
        );

        toast.error(
          zipError.message ||
            "No se pudo generar el ZIP.",
        );
      } finally {
        setZippingVisitId(null);
      }
    };

  const handleDownloadAllZip =
    async () => {
      if (
        visitGroups.length === 0
      ) {
        toast.error(
          "No hay visitas para descargar.",
        );
        return;
      }

      setZippingAll(true);

      let addedFiles = 0;

      try {
        const zip = new JSZip();

        for (const group of visitGroups) {
          const folderName =
            safeFileName(
              `${
                group.local_codigo ||
                "local"
              }_${
                group.visit_number ||
                group.visit_id?.slice(
                  0,
                  8,
                ) ||
                "visita"
              }`,
            );

          const folder =
            zip.folder(
              folderName,
            );

          for (
            let index = 0;
            index <
            group.photos.length;
            index += 1
          ) {
            const item =
              group.photos[index];

            const url =
              getImageUrl(item);

            if (!url) continue;

            try {
              const response =
                await fetch(url);

              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}`,
                );
              }

              const blob =
                await response.blob();

              const extension =
                getExtensionFromUrl(
                  url,
                );

              const fileName =
                buildPhotoFileName(
                  item,
                  index,
                  extension,
                );

              folder.file(
                fileName,
                blob,
              );

              addedFiles += 1;
            } catch (photoError) {
              console.error(
                `No se pudo agregar la foto ${item.id}:`,
                photoError,
              );
            }
          }
        }

        if (addedFiles === 0) {
          throw new Error(
            "No se pudo descargar ninguna imagen.",
          );
        }

        const zipBlob =
          await zip.generateAsync({
            type: "blob",
          });

        const range =
          `${appliedFilters.startDate}_a_${appliedFilters.endDate}`;

        downloadBlob(
          zipBlob,
          `evidencias_${range}.zip`,
        );

        toast.success(
          `${addedFiles} evidencia(s) descargadas`,
        );
      } catch (zipError) {
        console.error(
          "Error generando ZIP general:",
          zipError,
        );

        toast.error(
          zipError.message ||
            "No se pudo generar el ZIP general.",
        );
      } finally {
        setZippingAll(false);
      }
    };

  const hasFilters =
    inputs.startDate !==
      INITIAL_FILTERS.startDate ||
    inputs.endDate !==
      INITIAL_FILTERS.endDate ||
    Boolean(inputs.localCode) ||
    Boolean(inputs.workerName) ||
    Boolean(inputs.searchTerm) ||
    Boolean(
      isRoot &&
        inputs.company_id,
    );

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiCamera size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Evidencias
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Validación de ejecución
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <div className="px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                Visitas
              </p>

              <p className="text-xl font-black text-gray-900 mt-1">
                {totalVisits}
              </p>
            </div>

            <div className="px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                Fotografías
              </p>

              <p className="text-xl font-black text-gray-900 mt-1">
                {totalPhotos}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
              isRoot
                ? "xl:grid-cols-8"
                : "xl:grid-cols-7"
            }`}
          >
            {isRoot && (
              <FilterField
                label="Empresa"
                icon={FiBriefcase}
              >
                <select
                  value={
                    inputs.company_id
                  }
                  onChange={(event) =>
                    setInputs(
                      (current) => ({
                        ...current,
                        company_id:
                          event.target
                            .value,
                      }),
                    )
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
              </FilterField>
            )}

            <FilterField
              label="Desde"
              icon={FiCalendar}
            >
              <input
                type="date"
                value={
                  inputs.startDate
                }
                onChange={(event) =>
                  setInputs(
                    (current) => ({
                      ...current,
                      startDate:
                        event.target
                          .value,
                    }),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Hasta"
              icon={FiCalendar}
            >
              <input
                type="date"
                min={inputs.startDate}
                value={
                  inputs.endDate
                }
                onChange={(event) =>
                  setInputs(
                    (current) => ({
                      ...current,
                      endDate:
                        event.target
                          .value,
                    }),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Código local"
              icon={FiHash}
            >
              <input
                type="text"
                placeholder="Ej: J04"
                value={
                  inputs.localCode
                }
                onChange={(event) =>
                  setInputs(
                    (current) => ({
                      ...current,
                      localCode:
                        event.target.value.toUpperCase(),
                    }),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Mercaderista"
              icon={FiUser}
            >
              <input
                type="text"
                placeholder="Nombre o apellido"
                value={
                  inputs.workerName
                }
                onChange={(event) =>
                  setInputs(
                    (current) => ({
                      ...current,
                      workerName:
                        event.target
                          .value,
                    }),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Búsqueda"
              icon={FiSearch}
            >
              <input
                type="search"
                placeholder="RUT, email o visita"
                value={
                  inputs.searchTerm
                }
                onChange={(event) =>
                  setInputs(
                    (current) => ({
                      ...current,
                      searchTerm:
                        event.target
                          .value,
                    }),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <div className="flex items-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={
                  <FiCheck size={15} />
                }
                onClick={handleApply}
                loading={isFetching}
                loadingText="Aplicando..."
              >
                Aplicar
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="dark"
                size="lg"
                fullWidth
                leftIcon={
                  zippingAll ? (
                    <FiLoader
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <FiDownloadCloud
                      size={15}
                    />
                  )
                }
                disabled={
                  isLoading ||
                  zippingAll ||
                  visitGroups.length ===
                    0
                }
                onClick={
                  handleDownloadAllZip
                }
              >
                {zippingAll
                  ? "Empaquetando..."
                  : "Descargar todo"}
              </Button>
            </div>
          </div>

          {filterError && (
            <p className="mt-4 text-xs font-bold text-red-600">
              {filterError}
            </p>
          )}

          {hasFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <FiX size={13} />
                }
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <InformationMessage
            title="No se pudieron cargar las evidencias"
            description={
              error?.response?.data
                ?.message ||
              error?.message ||
              "Ocurrió un error al consultar las fotografías."
            }
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={14}
                  />
                }
                onClick={() =>
                  refetch()
                }
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : visitGroups.length ===
          0 ? (
          <InformationMessage
            title="Sin información disponible"
            description="No existen evidencias para el rango de fechas y los filtros seleccionados."
          />
        ) : (
          <section className="space-y-6">
            {visitGroups.map(
              (group) => (
                <VisitEvidenceGroup
                  key={
                    group.visit_id ||
                    `${group.local_codigo}-${group.created_at}`
                  }
                  group={group}
                  getImageUrl={
                    getImageUrl
                  }
                  onDownload={
                    handleDownload
                  }
                  onDownloadZip={
                    handleDownloadVisitZip
                  }
                  zipping={
                    zippingVisitId ===
                    group.visit_id
                  }
                />
              ),
            )}
          </section>
        )}
      </main>
    </div>
  );
};

const VisitEvidenceGroup = ({
  group,
  getImageUrl,
  onDownload,
  onDownloadZip,
  zipping,
}) => (
  <article className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100">
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm md:text-base font-black text-gray-900">
            {group.local_nombre ||
              group.photos?.[0]?.local_nombre ||
              group.photos?.[0]?.local_name ||
              group.photos?.[0]?.cadena ||
              "Local sin nombre"}
          </h2>

          <span className="px-2.5 py-1 rounded-full bg-[#87be00]/10 text-[#6f9d00] text-[8px] font-black uppercase tracking-wider">
            {group.local_codigo ||
              "Sin código"}
          </span>

          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-wider">
            {group.visit_number ||
              "Sin N° visita"}
          </span>
        </div>

        <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">
          {group.user_name ||
            "Sin mercaderista"}{" "}
          · {group.photos.length} foto
          {group.photos.length === 1
            ? ""
            : "s"}
          {group.company_name
            ? ` · ${group.company_name}`
            : ""}
        </p>

        {(group.local_direccion ||
          group.photos?.[0]?.local_direccion ||
          group.photos?.[0]?.direccion) && (
          <p className="text-[9px] font-bold text-gray-400 mt-1">
            {group.local_direccion ||
              group.photos?.[0]?.local_direccion ||
              group.photos?.[0]?.direccion}
          </p>
        )}

        {group.visit_id && (
          <p
            className="font-mono text-[8px] text-gray-400 truncate mt-2 max-w-xl select-all"
            title={group.visit_id}
          >
            ID visita:{" "}
            {group.visit_id}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={
          zipping ? (
            <FiLoader
              size={14}
              className="animate-spin"
            />
          ) : (
            <FiPackage size={14} />
          )
        }
        disabled={zipping}
        onClick={() =>
          onDownloadZip(group)
        }
      >
        {zipping
          ? "Empaquetando..."
          : "Descargar visita"}
      </Button>
    </header>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-5 md:p-6">
      {group.photos.map(
        (item, index) => (
          <EvidenceCard
            key={
              item.id ||
              `${group.visit_id}-${index}`
            }
            item={item}
            imageUrl={
              getImageUrl(item)
            }
            onDownload={
              onDownload
            }
          />
        ),
      )}
    </div>
  </article>
);

const EvidenceCard = ({
  item,
  imageUrl,
  onDownload,
}) => {
  const photoType =
    String(
      item.photo_type || "",
    ).toLowerCase();

  const isStart =
    photoType.startsWith(
      "gondola_inicio",
    );

  const isEnd =
    photoType.startsWith(
      "gondola_fin",
    );

  const stageLabel = isStart
    ? "Inicio"
    : isEnd
      ? "Fin"
      : null;

  const badgeText =
    item.product_label ||
    item.photo_type ||
    "Evidencia";

  return (
    <article className="rounded-[1.5rem] overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={badgeText}
            loading="lazy"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <FiImage size={30} />

            <span className="text-[9px] font-black uppercase mt-2">
              Sin imagen
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 right-3 flex items-start gap-2">
          <span className="max-w-full truncate bg-black/80 text-[#a8db29] text-[8px] font-black px-3 py-1.5 rounded-full uppercase">
            {badgeText}
          </span>

          {stageLabel && (
            <span className="bg-white/90 text-gray-700 text-[8px] font-black px-2.5 py-1.5 rounded-full uppercase shrink-0">
              {stageLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <a
            href={imageUrl || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!imageUrl}
            className={`flex-1 h-10 rounded-xl flex items-center justify-center border transition-colors ${
              imageUrl
                ? "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-900 hover:text-white"
                : "bg-gray-50 text-gray-300 border-gray-100 pointer-events-none"
            }`}
          >
            <FiExternalLink
              size={15}
            />
          </a>

          <button
            type="button"
            disabled={!imageUrl}
            onClick={() =>
              onDownload(
                imageUrl,
                `foto_${
                  item.id ||
                  "evidencia"
                }`,
              )
            }
            className="flex-1 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-100 hover:bg-[#87be00] hover:text-white transition-colors disabled:text-gray-300 disabled:pointer-events-none"
          >
            <FiDownload
              size={15}
            />
          </button>
        </div>

        {item.created_at && (
          <p className="text-[8px] font-bold text-gray-400 mt-3">
            {new Date(
              item.created_at,
            ).toLocaleString(
              "es-CL",
              {
                dateStyle: "short",
                timeStyle: "short",
              },
            )}
          </p>
        )}
      </div>
    </article>
  );
};

const FilterField = ({
  label,
  icon: Icon,
  children,
}) => (
  <label className="block">
    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block ml-1 mb-2">
      {label}
    </span>

    <div className="relative">
      <Icon
        size={14}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />

      {children}
    </div>
  </label>
);

const LoadingState = () => (
  <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
    <FiRefreshCw
      size={30}
      className="animate-spin text-[#87be00]"
    />

    <p className="text-[10px] font-black uppercase tracking-wider">
      Cargando evidencias...
    </p>
  </div>
);

const InformationMessage = ({
  title,
  description,
  action,
}) => (
  <section className="bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 py-14 text-center shadow-sm">
    <FiAlertCircle
      size={28}
      className="mx-auto text-gray-300"
    />

    <h2 className="text-lg font-black text-gray-800 mt-4">
      {title}
    </h2>

    {description && (
      <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
        {description}
      </p>
    )}

    {action && (
      <div className="mt-5">
        {action}
      </div>
    )}
  </section>
);

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-xs font-bold text-gray-700
  outline-none transition-all
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
`;

export default PhotoValidation;