import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiList,
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import api from "../../api/apiClient";

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN;

const POLL_INTERVAL = 15000;
const PLANNING_ENDPOINT =
  "/planning/data";
const CHILE_TIME_ZONE =
  "America/Santiago";

const getTodayDateKey = () => {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          CHILE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

  return `${values.year}-${values.month}-${values.day}`;
};

const formatPlanningDate = (
  dateKey,
) => {
  if (!dateKey) {
    return "Fecha no disponible";
  }

  const [year, month, day] =
    dateKey
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  return new Intl.DateTimeFormat(
    "es-CL",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
};

mapboxgl.accessToken =
  MAPBOX_TOKEN;

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    color: "#ef4444",
    badge:
      "border-red-100 bg-red-50 text-red-500",
    dot: "bg-red-500",
  },
  IN_PROGRESS: {
    label: "En proceso",
    color: "#87be00",
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
  COMPLETED: {
    label: "Completada",
    color: "#2563eb",
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-600",
  },
};

const getStatusConfig = (
  status,
) =>
  STATUS_CONFIG[status] ?? {
    label: "Sin estado",
    color: "#94a3b8",
    badge:
      "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
  };

const getRouteDateKey = (
  route,
) => {
  const rawDate =
    route?.visit_date ??
    route?.fecha;

  if (!rawDate) {
    return null;
  }

  /*
   * Evita el desfase UTC de `new Date("YYYY-MM-DD")`.
   * Para filtrar solo necesitamos una clave calendario YYYY-MM-DD.
   */
  if (typeof rawDate === "string") {
    const match =
      rawDate.match(
        /^(\d{4})-(\d{2})-(\d{2})/,
      );

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = new Date(rawDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const year =
    date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatRouteDate = (
  route,
) => {
  const dateKey =
    getRouteDateKey(route);

  if (!dateKey) {
    return "Sin fecha";
  }

  const [
    year,
    month,
    day,
  ] = dateKey.split("-");

  return `${day}-${month}-${year}`;
};

const formatTime = (value) =>
  value
    ? String(value).slice(0, 5)
    : "N/A";

const getRouteId = (
  route,
  fallback = "",
) => {
  const baseId =
    route?.id ??
    route?.route_id ??
    route?.visit_number ??
    `${route?.user_id ?? "user"}-${route?.local_id ?? "local"}`;

  const dateKey =
    getRouteDateKey(route) ??
    fallback;

  return `${baseId}-${dateKey}`;
};

const getCoordinates = (
  route,
) => {
  const latitude =
    Number.parseFloat(
      route?.lat ??
        route?.latitude ??
        route?.local_lat,
    );

  const longitude =
    Number.parseFloat(
      route?.lng ??
        route?.longitude ??
        route?.local_lng,
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

const createPopupContent = (
  route,
) => {
  const wrapper =
    document.createElement("div");

  wrapper.style.cssText =
    "font-family:'Outfit',sans-serif;padding:10px 6px;min-width:210px;";

  const title =
    document.createElement("p");

  title.textContent =
    route?.local_nombre ??
    route?.cadena ??
    "Local sin nombre";

  title.style.cssText =
    "font-weight:900;margin:0 0 8px;font-size:12px;color:#0f172a;text-transform:uppercase;letter-spacing:-0.02em;";

  wrapper.appendChild(title);

  const details =
    document.createElement("div");

  details.style.cssText =
    "font-size:10px;font-weight:700;color:#334155;line-height:1.8;";

  const appendDetail = (
    label,
    value,
  ) => {
    const row =
      document.createElement("div");
    const labelNode =
      document.createElement("span");

    labelNode.textContent = label;
    labelNode.style.cssText =
      "color:#94a3b8;text-transform:uppercase;font-size:8px;letter-spacing:0.05em;";

    const valueNode =
      document.createElement("div");

    valueNode.textContent =
      value || "Sin información";

    row.appendChild(labelNode);
    row.appendChild(valueNode);
    details.appendChild(row);
  };

  appendDetail(
    "Código del local",
    route?.codigo_local ?? "S/N",
  );
  appendDetail(
    "Dirección",
    route?.direccion ??
      route?.comuna ??
      "Sin dirección",
  );
  appendDetail(
    "Mercaderista",
    route?.usuario_nombre ??
      "Sin asignar",
  );
  appendDetail(
    "Fecha",
    formatRouteDate(route),
  );

  wrapper.appendChild(details);

  const status =
    getStatusConfig(
      route?.status,
    );

  const badge =
    document.createElement("span");

  badge.textContent = status.label;
  badge.style.cssText = `
    display:inline-block;
    margin-top:9px;
    border-radius:8px;
    padding:4px 8px;
    background:${status.color};
    color:white;
    font-size:8px;
    font-weight:900;
    text-transform:uppercase;
    letter-spacing:0.05em;
  `;

  wrapper.appendChild(badge);

  return wrapper;
};

const RoutePlanningMap = () => {
  const mapContainer =
    useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const didInitialFit =
    useRef(false);
  const lastErrorToastAt =
    useRef(0);

  const [routes, setRoutes] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState(null);
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  const [
    planningDate,
    setPlanningDate,
  ] = useState(() =>
    getTodayDateKey(),
  );

  const [panelOpen, setPanelOpen] =
    useState(true);
  const [
    selectedRouteId,
    setSelectedRouteId,
  ] = useState(null);
  const [
    selectedSupervisor,
    setSelectedSupervisor,
  ] = useState(null);

  const [
    expandedSupervisors,
    setExpandedSupervisors,
  ] = useState({});
  const [
    expandedLocales,
    setExpandedLocales,
  ] = useState({});

  const fetchRoutes =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          /*
           * Se mantiene exactamente el flujo funcional confirmado:
           * el frontend consulta /planning/data sin filtros de calendario.
           * El backend entrega la planificación correspondiente al día actual.
           */
          const apiResponse =
            await api.get(
              PLANNING_ENDPOINT,
            );

          /*
           * Compatible con:
           * - apiClient que retorna directamente el JSON.
           * - Axios, que retorna la información dentro de response.data.
           * - Respuestas con estructura { data: [...] }.
           */
          const rawData =
            apiResponse?.data ??
            apiResponse;

          const nextRoutes =
            Array.isArray(rawData)
              ? rawData
              : Array.isArray(
                    rawData?.data,
                  )
                ? rawData.data
                : Array.isArray(
                      rawData?.routes,
                    )
                  ? rawData.routes
                  : [];

          const currentDate =
            getTodayDateKey();

          setPlanningDate(
            currentDate,
          );
          setRoutes(nextRoutes);
          setLastUpdated(
            new Date(),
          );

          console.log(
            "📅 Planificación actual recibida:",
            {
              endpoint:
                PLANNING_ENDPOINT,
              fechaVisual:
                currentDate,
              total:
                nextRoutes.length,
              primeraRuta:
                nextRoutes[0] ??
                null,
            },
          );

          if (!silent) {
            const supervisors =
              [
                ...new Set(
                  nextRoutes.map(
                    (route) =>
                      route.supervisor_nombre ??
                      "Sin supervisor",
                  ),
                ),
              ];

            setExpandedSupervisors(
              supervisors.reduce(
                (
                  accumulator,
                  supervisor,
                ) => ({
                  ...accumulator,
                  [supervisor]: true,
                }),
                {},
              ),
            );
          }
        } catch (requestError) {
          console.error(
            "❌ Error cargando planificación:",
            requestError?.data ??
              requestError?.response
                ?.data ??
              requestError?.message ??
              requestError,
          );

          const message =
            requestError?.data
              ?.message ??
            requestError?.response
              ?.data?.message ??
            requestError?.message ??
            "No fue posible cargar la planificación del día actual.";

          setError(message);

          const now = Date.now();

          if (
            !silent ||
            now -
              lastErrorToastAt.current >
              60000
          ) {
            lastErrorToastAt.current =
              now;
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    fetchRoutes();

    const interval =
      window.setInterval(
        () =>
          fetchRoutes({
            silent: true,
          }),
        POLL_INTERVAL,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [fetchRoutes]);

  const filteredRoutes =
    useMemo(
      () => routes,
      [routes],
    );

  const stats = useMemo(
    () => ({
      total:
        filteredRoutes.length,
      pending:
        filteredRoutes.filter(
          (route) =>
            route.status ===
            "PENDING",
        ).length,
      inProgress:
        filteredRoutes.filter(
          (route) =>
            route.status ===
            "IN_PROGRESS",
        ).length,
      completed:
        filteredRoutes.filter(
          (route) =>
            route.status ===
            "COMPLETED",
        ).length,
    }),
    [filteredRoutes],
  );

  const groupedData =
    useMemo(() => {
      return filteredRoutes.reduce(
        (
          accumulator,
          route,
        ) => {
          const supervisor =
            route.supervisor_nombre ??
            "Sin supervisor";

          if (
            !accumulator[
              supervisor
            ]
          ) {
            accumulator[
              supervisor
            ] = {
              localesMap: {},
              usuariosMap: {},
            };
          }

          const visibleLocal =
            route.local_nombre ??
            route.cadena ??
            "Local sin nombre";

          const routeOrigin =
            route.origen ??
            route.origin;

          if (
            routeOrigin ===
            "LOCAL"
          ) {
            const localKey =
              route.local_id ??
              route.codigo_local ??
              route.local_nombre ??
              "SIN_LOCAL";

            if (
              !accumulator[
                supervisor
              ].localesMap[
                localKey
              ]
            ) {
              accumulator[
                supervisor
              ].localesMap[
                localKey
              ] = {
                nombre_mostrar:
                  visibleLocal,
                codigo:
                  route.codigo_local,
                comuna:
                  route.comuna,
                routesByUser: {},
              };
            }

            const userKey =
              route.usuario_nombre ??
              "Sin usuario";

            const local =
              accumulator[
                supervisor
              ].localesMap[
                localKey
              ];

            if (
              !local.routesByUser[
                userKey
              ]
            ) {
              local.routesByUser[
                userKey
              ] = [];
            }

            local.routesByUser[
              userKey
            ].push(route);
          } else {
            const userKey =
              route.usuario_nombre ??
              "Sin usuario";

            if (
              !accumulator[
                supervisor
              ].usuariosMap[
                userKey
              ]
            ) {
              accumulator[
                supervisor
              ].usuariosMap[
                userKey
              ] = [];
            }

            accumulator[
              supervisor
            ].usuariosMap[
              userKey
            ].push(route);
          }

          return accumulator;
        },
        {},
      );
    }, [filteredRoutes]);

  const filteredTableRoutes =
    useMemo(() => {
      if (!selectedSupervisor) {
        return [];
      }

      return filteredRoutes.filter(
        (route) =>
          (route.supervisor_nombre ??
            "Sin supervisor") ===
          selectedSupervisor,
      );
    }, [
      filteredRoutes,
      selectedSupervisor,
    ]);

  useEffect(() => {
    if (
      selectedSupervisor &&
      !Object.prototype.hasOwnProperty.call(
        groupedData,
        selectedSupervisor,
      )
    ) {
      setSelectedSupervisor(
        null,
      );
    }
  }, [
    groupedData,
    selectedSupervisor,
  ]);

  useEffect(() => {
    didInitialFit.current =
      false;
  }, [planningDate]);

  useEffect(() => {
    let cancelled = false;
    let initializationTimer = null;
    let resizeTimer = null;
    let mapInstance = null;

    const initializeMap = () => {
      const container =
        mapContainer.current;

      if (
        cancelled ||
        map.current ||
        !container
      ) {
        return;
      }

      if (!MAPBOX_TOKEN) {
        setError(
          "Falta configurar VITE_MAPBOX_TOKEN",
        );
        return;
      }

      /*
       * Mapbox necesita que el contenedor tenga dimensiones reales.
       * Cuando el layout todavía se está acomodando, esperamos unos
       * milisegundos antes de crear el mapa.
       */
      const {
        width,
        height,
      } =
        container.getBoundingClientRect();

      if (
        width <= 0 ||
        height <= 0
      ) {
        initializationTimer =
          window.setTimeout(
            initializeMap,
            100,
          );
        return;
      }

      container.innerHTML = "";

      mapInstance =
        new mapboxgl.Map({
          container,
          style:
            "mapbox://styles/mapbox/light-v11",
          center: [
            -70.6483,
            -33.4569,
          ],
          zoom: 10,
          attributionControl: true,
        });

      map.current =
        mapInstance;

      mapInstance.addControl(
        new mapboxgl.NavigationControl(),
        "top-right",
      );

      const resizeMap = () => {
        window.requestAnimationFrame(
          () => {
            if (
              !cancelled &&
              map.current ===
                mapInstance
            ) {
              mapInstance.resize();
            }
          },
        );
      };

      const handleLoad = () => {
        resizeMap();

        resizeTimer =
          window.setTimeout(
            resizeMap,
            250,
          );
      };

      const handleMapError = (
        event,
      ) => {
        console.error(
          "❌ Error de Mapbox:",
          event?.error ??
            event,
        );
      };

      mapInstance.on(
        "load",
        handleLoad,
      );

      mapInstance.on(
        "error",
        handleMapError,
      );

      /*
       * Fuerza un primer ajuste después de que Tailwind termine
       * de aplicar las dimensiones responsivas.
       */
      resizeTimer =
        window.setTimeout(
          resizeMap,
          150,
        );
    };

    const frameId =
      window.requestAnimationFrame(
        initializeMap,
      );

    return () => {
      cancelled = true;

      window.cancelAnimationFrame(
        frameId,
      );

      if (
        initializationTimer
      ) {
        window.clearTimeout(
          initializationTimer,
        );
      }

      if (resizeTimer) {
        window.clearTimeout(
          resizeTimer,
        );
      }

      markers.current.forEach(
        (marker) =>
          marker.remove(),
      );
      markers.current = [];

      if (mapInstance) {
        mapInstance.remove();
      }

      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () =>
          map.current?.resize(),
        350,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [panelOpen]);

  useEffect(() => {
    if (
      !mapContainer.current
    ) {
      return undefined;
    }

    const resizeMap = () => {
      window.requestAnimationFrame(
        () =>
          map.current?.resize(),
      );
    };

    const observer =
      new ResizeObserver(
        resizeMap,
      );

    observer.observe(
      mapContainer.current,
    );

    window.addEventListener(
      "resize",
      resizeMap,
    );

    window.addEventListener(
      "orientationchange",
      resizeMap,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        resizeMap,
      );

      window.removeEventListener(
        "orientationchange",
        resizeMap,
      );
    };
  }, []);

  useEffect(() => {
    if (!map.current) {
      return undefined;
    }

    const paintMarkers = () => {
      markers.current.forEach(
        (marker) =>
          marker.remove(),
      );
      markers.current = [];

      const bounds =
        new mapboxgl.LngLatBounds();

      let coordinateCount = 0;

      filteredRoutes.forEach(
        (route, index) => {
          const coordinates =
            getCoordinates(route);

          if (!coordinates) {
            return;
          }

          coordinateCount += 1;

          const {
            latitude,
            longitude,
          } = coordinates;

          const wrapper =
            document.createElement(
              "button",
            );

          wrapper.type =
            "button";
          wrapper.setAttribute(
            "aria-label",
            `Ver ${
              route.local_nombre ??
              route.cadena ??
              "ruta"
            }`,
          );

          wrapper.style.cssText =
            "width:28px;height:28px;padding:0;border:0;background:transparent;cursor:pointer;";

          const dot =
            document.createElement(
              "span",
            );

          dot.style.cssText = `
            display:block;
            width:24px;
            height:24px;
            margin:2px;
            border-radius:9999px;
            border:3px solid white;
            background:${getStatusConfig(route.status).color};
            box-shadow:0 4px 10px rgba(15,23,42,.28);
            transition:transform .2s ease, box-shadow .2s ease;
          `;

          wrapper.appendChild(
            dot,
          );

          const popup =
            new mapboxgl.Popup({
              offset: 16,
              closeButton: false,
              closeOnClick: false,
            }).setDOMContent(
              createPopupContent(
                route,
              ),
            );

          const marker =
            new mapboxgl.Marker({
              element: wrapper,
              anchor: "center",
            })
              .setLngLat([
                longitude,
                latitude,
              ])
              .addTo(
                map.current,
              );

          const routeId =
            getRouteId(
              route,
              index,
            );

          const showPopup = () => {
            dot.style.transform =
              "scale(1.35)";
            dot.style.boxShadow =
              "0 8px 18px rgba(15,23,42,.35)";

            popup
              .setLngLat([
                longitude,
                latitude,
              ])
              .addTo(
                map.current,
              );
          };

          const hidePopup = () => {
            dot.style.transform =
              "scale(1)";
            dot.style.boxShadow =
              "0 4px 10px rgba(15,23,42,.28)";
            popup.remove();
          };

          wrapper.addEventListener(
            "mouseenter",
            showPopup,
          );
          wrapper.addEventListener(
            "mouseleave",
            hidePopup,
          );
          wrapper.addEventListener(
            "focus",
            showPopup,
          );
          wrapper.addEventListener(
            "blur",
            hidePopup,
          );
          wrapper.addEventListener(
            "click",
            () => {
              setSelectedRouteId(
                routeId,
              );

              map.current?.flyTo({
                center: [
                  longitude,
                  latitude,
                ],
                zoom: 14,
                duration: 1000,
                essential: true,
              });
            },
          );

          markers.current.push(
            marker,
          );

          bounds.extend([
            longitude,
            latitude,
          ]);
        },
      );

      if (
        coordinateCount > 0 &&
        !didInitialFit.current
      ) {
        if (
          coordinateCount === 1
        ) {
          map.current.flyTo({
            center:
              bounds.getCenter(),
            zoom: 14,
            duration: 850,
          });
        } else {
          map.current.fitBounds(
            bounds,
            {
              padding: 70,
              maxZoom: 14,
              duration: 850,
            },
          );
        }

        didInitialFit.current =
          true;
      }
    };

    if (
      map.current.isStyleLoaded()
    ) {
      paintMarkers();
    } else {
      map.current.once(
        "style.load",
        paintMarkers,
      );
    }

    return () => {
      markers.current.forEach(
        (marker) =>
          marker.remove(),
      );
      markers.current = [];
    };
  }, [filteredRoutes]);

  const flyToRoute = (
    route,
    fallbackKey = "",
  ) => {
    const coordinates =
      getCoordinates(route);

    setSelectedRouteId(
      getRouteId(
        route,
        fallbackKey,
      ),
    );

    if (
      !map.current ||
      !coordinates
    ) {
      return;
    }

    map.current.flyTo({
      center: [
        coordinates.longitude,
        coordinates.latitude,
      ],
      zoom: 14,
      duration: 1000,
      essential: true,
    });

    if (
      window.innerWidth < 1024
    ) {
      setPanelOpen(false);
    }
  };

  const toggleSupervisor = (
    supervisor,
  ) => {
    setExpandedSupervisors(
      (current) => ({
        ...current,
        [supervisor]:
          !current[supervisor],
      }),
    );

    setSelectedSupervisor(
      (current) =>
        current === supervisor
          ? null
          : supervisor,
    );
  };

  const toggleLocal = (
    key,
  ) => {
    setExpandedLocales(
      (current) => ({
        ...current,
        [key]:
          !current[key],
      }),
    );
  };

  const formatLastUpdated = (
    date,
  ) =>
    date
      ? date.toLocaleTimeString(
          "es-CL",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
        )
      : "Sin actualizar";

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-10 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiNavigation
                size={22}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Monitoreo GPS
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Planificación del día actual y seguimiento en tiempo real
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {Object.entries(
                STATUS_CONFIG,
              ).map(
                ([
                  key,
                  config,
                ]) => (
                  <span
                    key={key}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          config.color,
                      }}
                    />
                    {config.label}
                  </span>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                fetchRoutes({
                  silent: true,
                })
              }
              disabled={refreshing}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Actualizando"
                : `Act. ${formatLastUpdated(lastUpdated)}`}
            </button>
          </div>
        </header>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                <FiCalendar
                  size={18}
                />
              </div>

              <div>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  Planificación de hoy
                </h2>

                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {formatPlanningDate(
                    planningDate,
                  )}
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded-xl border border-[#87be00]/20 bg-[#87be00]/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#6f9d00]">
              {planningDate}
            </span>
          </div>
        </section>

        {error && (
          <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <FiAlertTriangle
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  Error de sincronización
                </p>

                <p className="mt-1 text-sm font-medium text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchRoutes()
              }
              className="rounded-xl bg-red-500 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-red-600"
            >
              Reintentar
            </button>
          </section>
        )}

        <section className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm custom-scrollbar">
          <div className="flex min-w-[720px] items-center gap-8">
            <div className="flex shrink-0 items-center gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Total rutas
                </p>

                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  {stats.total}
                </p>
              </div>

              {refreshing && (
                <FiRefreshCw
                  size={14}
                  className="animate-spin text-[#87be00]"
                />
              )}
            </div>

            <div className="h-10 w-px shrink-0 bg-slate-200" />

            <div className="grid flex-1 grid-cols-3 gap-6">
              {[
                {
                  key: "PENDING",
                  count:
                    stats.pending,
                },
                {
                  key:
                    "IN_PROGRESS",
                  count:
                    stats.inProgress,
                },
                {
                  key:
                    "COMPLETED",
                  count:
                    stats.completed,
                },
              ].map(
                ({
                  key,
                  count,
                }) => {
                  const config =
                    getStatusConfig(
                      key,
                    );

                  const percentage =
                    stats.total
                      ? (count /
                          stats.total) *
                        100
                      : 0;

                  return (
                    <div
                      key={key}
                      className="min-w-[150px]"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              config.color,
                          }}
                        />

                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          {config.label}
                        </span>

                        <strong className="ml-auto text-sm font-black text-slate-900">
                          {count}
                        </strong>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              config.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-6 lg:h-[720px] lg:flex-row">
          <div className="relative isolate h-[55vh] min-h-[420px] w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:flex-[2] xl:flex-[3]">
            <div
              ref={mapContainer}
              className="absolute inset-0 h-full min-h-[420px] w-full"
              style={{
                width: "100%",
                height: "100%",
                minHeight: "420px",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setPanelOpen(
                  (current) =>
                    !current,
                )
              }
              className="absolute left-5 top-5 z-10 flex h-12 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-white shadow-xl transition hover:bg-slate-800 active:scale-95"
            >
              <FiList size={18} />

              <span className="hidden text-[9px] font-black uppercase tracking-wider sm:block">
                {panelOpen
                  ? "Ocultar"
                  : "Jerarquía"}
              </span>
            </button>

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              </div>
            )}

            {!loading &&
              filteredRoutes.length ===
                0 && (
                <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:inset-x-auto sm:left-5 sm:max-w-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <FiAlertCircle
                      size={21}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Planificación de hoy
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      No hay rutas planificadas para el día actual.
                    </p>
                  </div>
                </div>
              )}
          </div>

          <div
            className={`
              min-h-0 shrink-0 overflow-hidden
              transition-all duration-300

              ${
                panelOpen
                  ? "h-[620px] w-full opacity-100 lg:h-full lg:w-[360px] xl:w-[410px]"
                  : "h-0 w-full opacity-0 lg:h-full lg:w-0"
              }
            `}
          >
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Organización
                  </p>

                  <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                    Despliegue jerárquico
                  </h2>
                </div>

                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-500">
                  {
                    Object.keys(
                      groupedData,
                    ).length
                  }
                </span>
              </div>

              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {Object.keys(
                  groupedData,
                ).length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <FiMapPin
                      size={22}
                      className="text-slate-300"
                    />

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Sin asignaciones
                    </p>
                  </div>
                ) : (
                  Object.entries(
                    groupedData,
                  ).map(
                    ([
                      supervisor,
                      supervisorData,
                    ]) => {
                      const isExpanded =
                        Boolean(
                          expandedSupervisors[
                            supervisor
                          ],
                        );

                      const hasLocales =
                        Object.keys(
                          supervisorData.localesMap,
                        ).length > 0;

                      const hasUsers =
                        Object.keys(
                          supervisorData.usuariosMap,
                        ).length > 0;

                      return (
                        <article
                          key={
                            supervisor
                          }
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleSupervisor(
                                supervisor,
                              )
                            }
                            className={`flex w-full items-center gap-3 p-4 text-left transition ${
                              selectedSupervisor ===
                              supervisor
                                ? "border-b border-[#87be00]/20 bg-[#87be00]/10"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                              {supervisor
                                .charAt(
                                  0,
                                )
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                                <FiUserCheck
                                  size={11}
                                />
                                Supervisor
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-slate-900">
                                {supervisor}
                              </p>
                            </div>

                            <FiChevronRight
                              size={17}
                              className={`shrink-0 text-slate-300 transition ${
                                isExpanded
                                  ? "rotate-90 text-[#87be00]"
                                  : ""
                              }`}
                            />
                          </button>

                          <div
                            className={`overflow-hidden transition-all duration-300 ${
                              isExpanded
                                ? "max-h-[2400px] opacity-100"
                                : "max-h-0 opacity-0"
                            }`}
                          >
                            <div className="space-y-2 bg-slate-50/70 p-2">
                              {!hasLocales &&
                                !hasUsers && (
                                  <p className="px-3 py-5 text-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Supervisor sin asignaciones
                                  </p>
                                )}

                              {Object.entries(
                                supervisorData.localesMap,
                              ).map(
                                ([
                                  localKey,
                                  localData,
                                ]) => {
                                  const uniqueKey = `${supervisor}-${localKey}`;
                                  const localExpanded =
                                    Boolean(
                                      expandedLocales[
                                        uniqueKey
                                      ],
                                    );

                                  return (
                                    <div
                                      key={
                                        uniqueKey
                                      }
                                      className="pl-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleLocal(
                                            uniqueKey,
                                          )
                                        }
                                        className="flex w-full items-center gap-2 rounded-xl p-2.5 text-left transition hover:bg-white"
                                      >
                                        <FiMapPin
                                          size={14}
                                          className="shrink-0 text-[#87be00]"
                                        />

                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-[10px] font-black uppercase text-slate-700">
                                            {
                                              localData.nombre_mostrar
                                            }
                                          </p>

                                          <p className="mt-0.5 truncate text-[8px] font-bold text-slate-400">
                                            {localData.codigo ||
                                              localData.comuna ||
                                              "Sin código"}
                                          </p>
                                        </div>

                                        <FiChevronRight
                                          size={14}
                                          className={`text-slate-300 transition ${
                                            localExpanded
                                              ? "rotate-90"
                                              : ""
                                          }`}
                                        />
                                      </button>

                                      <div
                                        className={`overflow-hidden transition-all duration-300 ${
                                          localExpanded
                                            ? "max-h-[1400px] opacity-100"
                                            : "max-h-0 opacity-0"
                                        }`}
                                      >
                                        <div className="ml-4 space-y-1 border-l-2 border-slate-200 py-1 pl-3">
                                          {Object.entries(
                                            localData.routesByUser,
                                          ).flatMap(
                                            ([
                                              userName,
                                              userRoutes,
                                            ]) =>
                                              userRoutes.map(
                                                (
                                                  route,
                                                  index,
                                                ) => {
                                                  const routeId =
                                                    getRouteId(
                                                      route,
                                                      `${uniqueKey}-${userName}-${index}`,
                                                    );

                                                  const status =
                                                    getStatusConfig(
                                                      route.status,
                                                    );

                                                  return (
                                                    <button
                                                      type="button"
                                                      key={
                                                        routeId
                                                      }
                                                      onClick={() =>
                                                        flyToRoute(
                                                          route,
                                                          routeId,
                                                        )
                                                      }
                                                      className={`flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition ${
                                                        selectedRouteId ===
                                                        routeId
                                                          ? "bg-white ring-1 ring-[#87be00]/30 shadow-sm"
                                                          : "hover:bg-white/80"
                                                      }`}
                                                    >
                                                      <span
                                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                                        style={{
                                                          backgroundColor:
                                                            status.color,
                                                        }}
                                                      />

                                                      <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[9px] font-black uppercase text-slate-700">
                                                          {
                                                            userName
                                                          }
                                                        </p>

                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] font-bold text-slate-400">
                                                          <span className="flex items-center gap-1">
                                                            <FiCalendar
                                                              size={10}
                                                              className="shrink-0 text-[#87be00]"
                                                            />
                                                            {formatRouteDate(
                                                              route,
                                                            )}
                                                          </span>

                                                          <span className="flex items-center gap-1">
                                                            <FiClock
                                                              size={10}
                                                              className="shrink-0 text-slate-400"
                                                            />
                                                            Inicio{" "}
                                                            {formatTime(
                                                              route.start_time,
                                                            )}
                                                          </span>

                                                          <span className="flex items-center gap-1">
                                                            <FiClock
                                                              size={10}
                                                              className="shrink-0 text-slate-400"
                                                            />
                                                            Término{" "}
                                                            {formatTime(
                                                              route.end_time,
                                                            )}
                                                          </span>
                                                        </div>
                                                      </div>

                                                      <span
                                                        className={`shrink-0 rounded-lg border px-1.5 py-1 text-[7px] font-black uppercase ${status.badge}`}
                                                      >
                                                        {
                                                          status.label
                                                        }
                                                      </span>
                                                    </button>
                                                  );
                                                },
                                              ),
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                },
                              )}

                              {Object.entries(
                                supervisorData.usuariosMap,
                              ).map(
                                ([
                                  userName,
                                  userRoutes,
                                ]) => (
                                  <div
                                    key={`${supervisor}-${userName}`}
                                    className="pl-1"
                                  >
                                    <div className="flex items-center gap-2 rounded-xl p-2.5">
                                      <FiUsers
                                        size={14}
                                        className="shrink-0 text-blue-500"
                                      />

                                      <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase text-slate-700">
                                        {
                                          userName
                                        }
                                      </p>
                                    </div>

                                    <div className="ml-4 space-y-1 border-l-2 border-blue-100 py-1 pl-3">
                                      {userRoutes.map(
                                        (
                                          route,
                                          index,
                                        ) => {
                                          const routeId =
                                            getRouteId(
                                              route,
                                              `${supervisor}-${userName}-${index}`,
                                            );

                                          const status =
                                            getStatusConfig(
                                              route.status,
                                            );

                                          return (
                                            <button
                                              type="button"
                                              key={
                                                routeId
                                              }
                                              onClick={() =>
                                                flyToRoute(
                                                  route,
                                                  routeId,
                                                )
                                              }
                                              className={`flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition ${
                                                selectedRouteId ===
                                                routeId
                                                  ? "bg-white ring-1 ring-[#87be00]/30 shadow-sm"
                                                  : "hover:bg-white/80"
                                              }`}
                                            >
                                              <span
                                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    status.color,
                                                }}
                                              />

                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-[9px] font-black uppercase text-slate-700">
                                                  {route.cadena ??
                                                    route.local_nombre ??
                                                    "Sin local"}
                                                </p>

                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] font-bold text-slate-400">
                                                  <span className="flex items-center gap-1">
                                                    <FiCalendar
                                                      size={10}
                                                      className="shrink-0 text-[#87be00]"
                                                    />
                                                    {formatRouteDate(
                                                      route,
                                                    )}
                                                  </span>

                                                  <span className="flex items-center gap-1">
                                                    <FiClock
                                                      size={10}
                                                      className="shrink-0 text-slate-400"
                                                    />
                                                    Inicio{" "}
                                                    {formatTime(
                                                      route.start_time,
                                                    )}
                                                  </span>

                                                  <span className="flex items-center gap-1">
                                                    <FiClock
                                                      size={10}
                                                      className="shrink-0 text-slate-400"
                                                    />
                                                    Término{" "}
                                                    {formatTime(
                                                      route.end_time,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>

                                              <span
                                                className={`shrink-0 rounded-lg border px-1.5 py-1 text-[7px] font-black uppercase ${status.badge}`}
                                              >
                                                {
                                                  status.label
                                                }
                                              </span>
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    },
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {selectedSupervisor && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Detalle de rutas
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {selectedSupervisor}
                </h2>
              </div>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {
                  filteredTableRoutes.length
                }{" "}
                rutas
              </span>
            </div>

            {filteredTableRoutes.length >
            0 ? (
              <div className="custom-scrollbar max-h-[360px] overflow-auto rounded-2xl border border-slate-200">
                <table className="min-w-[900px] w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {[
                        "Supervisor",
                        "Mercaderista",
                        "Fecha",
                        "Cadena",
                        "Código",
                        "Estado",
                      ].map(
                        (header) => (
                          <th
                            key={
                              header
                            }
                            className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400"
                          >
                            {header}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTableRoutes.map(
                      (
                        route,
                        index,
                      ) => {
                        const routeId =
                          getRouteId(
                            route,
                            `table-${index}`,
                          );

                        const status =
                          getStatusConfig(
                            route.status,
                          );

                        return (
                          <tr
                            key={
                              routeId
                            }
                            onClick={() =>
                              flyToRoute(
                                route,
                                routeId,
                              )
                            }
                            className={`cursor-pointer border-b border-slate-100 transition ${
                              selectedRouteId ===
                              routeId
                                ? "bg-[#87be00]/10"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                              {route.supervisor_nombre ??
                                "N/A"}
                            </td>

                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                              {route.usuario_nombre ??
                                "Sin asignar"}
                            </td>

                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                              <div>
                                <p>
                                  {formatRouteDate(
                                    route,
                                  )}
                                </p>

                                <p className="mt-1 text-[9px] font-medium text-slate-400">
                                  {formatTime(
                                    route.start_time,
                                  )}{" "}
                                  —{" "}
                                  {formatTime(
                                    route.end_time,
                                  )}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                              {route.cadena ??
                                route.local_nombre ??
                                "Sin cadena"}
                            </td>

                            <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                              {route.codigo_local ??
                                "S/N"}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${status.badge}`}
                              >
                                {
                                  status.label
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                <FiAlertCircle
                  size={26}
                  className="text-slate-300"
                />

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  El supervisor no tiene rutas planificadas para hoy
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default RoutePlanningMap;