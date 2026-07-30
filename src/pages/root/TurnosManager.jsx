import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit3,
  FiLayers,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const DAYS = [
  {
    label: "D",
    name: "Domingo",
    id: 0,
  },
  {
    label: "L",
    name: "Lunes",
    id: 1,
  },
  {
    label: "M",
    name: "Martes",
    id: 2,
  },
  {
    label: "X",
    name: "Miércoles",
    id: 3,
  },
  {
    label: "J",
    name: "Jueves",
    id: 4,
  },
  {
    label: "V",
    name: "Viernes",
    id: 5,
  },
  {
    label: "S",
    name: "Sábado",
    id: 6,
  },
];

const SCHEDULE_MODES = [
  {
    value: "GENERAL",
    label: "Horario general",
    description:
      "Aplica la misma entrada y salida a todos los días seleccionados.",
  },
  {
    value: "POR_DIA",
    label: "Horario por día",
    description:
      "Permite definir una entrada y salida diferente para cada día.",
  },
];

const SCHEDULE_PRESETS = [
  {
    value: "MERCADERISTA_FULL",
    label: "Mercaderista Full",
    entrada: "07:30",
    salida: "15:30",
  },
  {
    value: "OFICINA",
    label: "Jornada oficina",
    entrada: "09:00",
    salida: "18:00",
  },
  {
    value: "MANANA",
    label: "Turno mañana",
    entrada: "08:00",
    salida: "14:00",
  },
  {
    value: "TARDE",
    label: "Turno tarde",
    entrada: "14:00",
    salida: "20:00",
  },
  {
    value: "NOCHE",
    label: "Turno noche",
    entrada: "22:00",
    salida: "06:00",
  },
  {
    value: "PERSONALIZADO",
    label: "Horario personalizado",
    entrada: null,
    salida: null,
  },
];

const getPresetByValue = (
  presetValue,
) =>
  SCHEDULE_PRESETS.find(
    (preset) =>
      preset.value ===
      presetValue,
  ) ||
  SCHEDULE_PRESETS[
    SCHEDULE_PRESETS.length - 1
  ];

const inferPresetValue = (
  entrada,
  salida,
) =>
  SCHEDULE_PRESETS.find(
    (preset) =>
      preset.entrada ===
        normalizeTime(
          entrada,
        ) &&
      preset.salida ===
        normalizeTime(
          salida,
        ),
  )?.value ||
  "PERSONALIZADO";

const createDaySchedule = (
  entrada = "07:30",
  salida = "15:30",
  presetValue,
) => ({
  entrada:
    normalizeTime(
      entrada,
    ) ||
    "07:30",
  salida:
    normalizeTime(
      salida,
    ) ||
    "15:30",
  preset:
    presetValue ||
    inferPresetValue(
      entrada,
      salida,
    ),
});

const INITIAL_FORM = {
  nombre_turno: "",
  categoria_rol:
    "Mercaderista Full",
  days: [],
  tipo_horario:
    "GENERAL",
  plantilla_horario:
    "MERCADERISTA_FULL",
  entrada: "07:30",
  salida: "15:30",
  day_schedules: {},
  company_id: "",
};

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const normalizeTime = (value) =>
  String(value || "")
    .trim()
    .slice(0, 5);

const parseMetadata = (
  value,
) => {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  if (
    typeof value !==
    "string" ||
    !value.trim()
  ) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(value);

    return (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
        ? parsed
        : {}
    );
  } catch {
    return {};
  }
};

const normalizeScheduleMode = (
  value,
) => {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

  return [
    "POR_DIA",
    "POR_DÍA",
    "BY_DAY",
    "DAILY",
  ].includes(normalized)
    ? "POR_DIA"
    : "GENERAL";
};

const getScheduleMetadata = (
  row,
) => {
  const metadata =
    parseMetadata(
      row?.metadata,
    );

  return {
    tipo_horario:
      normalizeScheduleMode(
        row?.tipo_horario ||
        row?.schedule_type ||
        row?.schedule_mode ||
        row?.horario_tipo ||
        metadata.tipo_horario ||
        metadata.schedule_type ||
        metadata.schedule_mode,
      ),
    plantilla_horario:
      String(
        row?.plantilla_horario ||
        row?.schedule_preset ||
        row?.preset ||
        metadata.plantilla_horario ||
        metadata.schedule_preset ||
        metadata.preset ||
        "",
      )
        .trim()
        .toUpperCase() ||
      inferPresetValue(
        row?.entrada,
        row?.salida,
      ),
  };
};

const TurnosManager = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [turnos, setTurnos] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState("");
  const [showForm, setShowForm] =
    useState(false);
  const [
    submitting,
    setSubmitting,
  ] = useState(false);
  const [
    editingKey,
    setEditingKey,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState({
    ...INITIAL_FORM,
    company_id:
      isRoot
        ? ""
        : user?.company_id || "",
  });

  useEffect(() => {
    if (
      !isRoot &&
      user?.company_id
    ) {
      setForm((current) => ({
        ...current,
        company_id:
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
      }
    }, [isRoot]);

  const fetchTurnos =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          isRoot &&
          selectedCompany
            ? {
                company_id:
                  selectedCompany,
              }
            : undefined;

        const response =
          await api.get(
            "/turnos-config",
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

        setTurnos(data);
      } catch (requestError) {
        console.error(
          "Error cargando turnos:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudieron cargar los turnos.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      isRoot,
      selectedCompany,
    ]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  const groupedShifts = useMemo(() => {
    const groups = turnos.reduce(
      (accumulator, current) => {
        const companyId =
          current.company_id || "";

        const shiftName =
          String(
            current.nombre_turno ||
              "",
          )
            .trim()
            .toUpperCase();

        const role =
          String(
            current.categoria_rol ||
              "",
          ).trim();

        const key = [
          companyId,
          shiftName,
          role,
        ].join("|");

        const scheduleMetadata =
          getScheduleMetadata(
            current,
          );

        if (!accumulator[key]) {
          accumulator[key] = {
            ...current,
            key,
            dias: [],
            ids: [],
            day_schedules: {},
            explicit_schedule_modes:
              new Set(),
          };
        }

        accumulator[
          key
        ].explicit_schedule_modes.add(
          scheduleMetadata.tipo_horario,
        );

        const day =
          Number(
            current.day_of_week,
          );

        if (
          Number.isInteger(day) &&
          !accumulator[
            key
          ].dias.includes(day)
        ) {
          accumulator[
            key
          ].dias.push(day);
        }

        if (
          Number.isInteger(day)
        ) {
          accumulator[
            key
          ].day_schedules[
            day
          ] = createDaySchedule(
            current.entrada,
            current.salida,
            scheduleMetadata
              .plantilla_horario,
          );
        }

        accumulator[key].ids.push(
          current.id,
        );

        return accumulator;
      },
      {},
    );

    return Object.values(groups)
      .map((group) => {
        const dias =
          [...group.dias].sort(
            (a, b) => a - b,
          );

        const schedules =
          dias.map(
            (day) =>
              group.day_schedules[
                day
              ] ||
              createDaySchedule(),
          );

        const signatures =
          new Set(
            schedules.map(
              (schedule) =>
                `${schedule.entrada}|${schedule.salida}`,
            ),
          );

        const firstSchedule =
          schedules[0] ||
          createDaySchedule();

        const explicitModes =
          Array.from(
            group
              .explicit_schedule_modes ||
            [],
          );

        const tipoHorario =
          signatures.size > 1 ||
          explicitModes.includes(
            "POR_DIA",
          )
            ? "POR_DIA"
            : "GENERAL";

        const {
          explicit_schedule_modes,
          ...publicGroup
        } = group;

        return {
          ...publicGroup,
          dias,
          tipo_horario:
            tipoHorario,
          plantilla_horario:
            tipoHorario ===
            "GENERAL"
              ? inferPresetValue(
                  firstSchedule.entrada,
                  firstSchedule.salida,
                )
              : "PERSONALIZADO",
          entrada:
            firstSchedule.entrada,
          salida:
            firstSchedule.salida,
        };
      })
      .sort((a, b) => {
        const companyCompare =
          String(
            a.company_name || "",
          ).localeCompare(
            String(
              b.company_name || "",
            ),
            "es",
          );

        if (companyCompare !== 0) {
          return companyCompare;
        }

        return String(
          a.nombre_turno || "",
        ).localeCompare(
          String(
            b.nombre_turno || "",
          ),
          "es",
        );
      });
  }, [turnos]);

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      company_id:
        isRoot
          ? selectedCompany || ""
          : user?.company_id || "",
    });
    setEditingKey(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setForm({
      ...INITIAL_FORM,
      company_id:
        isRoot
          ? selectedCompany || ""
          : user?.company_id || "",
    });
    setEditingKey(null);
    setShowForm(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleEdit = (group) => {
    setForm({
      nombre_turno:
        group.nombre_turno || "",
      categoria_rol:
        group.categoria_rol ||
        "Mercaderista Full",
      days:
        group.dias || [],
      tipo_horario:
        group.tipo_horario ||
        "GENERAL",
      plantilla_horario:
        group.plantilla_horario ||
        inferPresetValue(
          group.entrada,
          group.salida,
        ),
      entrada:
        normalizeTime(
          group.entrada,
        ) || "07:30",
      salida:
        normalizeTime(
          group.salida,
        ) || "15:30",
      day_schedules:
        group.day_schedules ||
        {},
      company_id:
        group.company_id || "",
    });

    setEditingKey({
      name:
        group.nombre_turno,
      companyId:
        group.company_id,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleDay = (
    dayIndex,
  ) => {
    setForm((current) => {
      const isSelected =
        current.days.includes(
          dayIndex,
        );

      const nextDays =
        isSelected
          ? current.days.filter(
              (day) =>
                day !== dayIndex,
            )
          : [
              ...current.days,
              dayIndex,
            ].sort(
              (a, b) => a - b,
            );

      const nextSchedules = {
        ...current.day_schedules,
      };

      if (isSelected) {
        delete nextSchedules[
          dayIndex
        ];
      } else {
        nextSchedules[
          dayIndex
        ] = createDaySchedule(
          current.entrada,
          current.salida,
          current.plantilla_horario,
        );
      }

      return {
        ...current,
        days:
          nextDays,
        day_schedules:
          nextSchedules,
      };
    });
  };

  const handleScheduleModeChange =
    (
      nextMode,
    ) => {
      setForm((current) => {
        if (
          nextMode ===
          current.tipo_horario
        ) {
          return current;
        }

        if (
          nextMode ===
          "POR_DIA"
        ) {
          const nextSchedules = {
            ...current.day_schedules,
          };

          current.days.forEach(
            (day) => {
              if (
                !nextSchedules[
                  day
                ]
              ) {
                nextSchedules[
                  day
                ] =
                  createDaySchedule(
                    current.entrada,
                    current.salida,
                    current.plantilla_horario,
                  );
              }
            },
          );

          return {
            ...current,
            tipo_horario:
              nextMode,
            day_schedules:
              nextSchedules,
          };
        }

        const firstDay =
          current.days[0];

        const firstSchedule =
          current.day_schedules[
            firstDay
          ] ||
          createDaySchedule(
            current.entrada,
            current.salida,
            current.plantilla_horario,
          );

        return {
          ...current,
          tipo_horario:
            "GENERAL",
          entrada:
            firstSchedule.entrada,
          salida:
            firstSchedule.salida,
          plantilla_horario:
            inferPresetValue(
              firstSchedule.entrada,
              firstSchedule.salida,
            ),
        };
      });
    };

  const handleGeneralPresetChange =
    (
      presetValue,
    ) => {
      const preset =
        getPresetByValue(
          presetValue,
        );

      setForm((current) => {
        const nextForm = {
          ...current,
          plantilla_horario:
            presetValue,
        };

        if (
          preset.entrada &&
          preset.salida
        ) {
          nextForm.entrada =
            preset.entrada;

          nextForm.salida =
            preset.salida;
        }

        return nextForm;
      });
    };

  const handleGeneralTimeChange =
    (
      field,
      value,
    ) => {
      setForm((current) => {
        const nextForm = {
          ...current,
          [field]:
            value,
        };

        nextForm.plantilla_horario =
          inferPresetValue(
            field === "entrada"
              ? value
              : current.entrada,
            field === "salida"
              ? value
              : current.salida,
          );

        return nextForm;
      });
    };

  const handleDayPresetChange =
    (
      day,
      presetValue,
    ) => {
      const preset =
        getPresetByValue(
          presetValue,
        );

      setForm((current) => {
        const previous =
          current.day_schedules[
            day
          ] ||
          createDaySchedule(
            current.entrada,
            current.salida,
          );

        return {
          ...current,
          day_schedules: {
            ...current.day_schedules,
            [day]: {
              entrada:
                preset.entrada ||
                previous.entrada,
              salida:
                preset.salida ||
                previous.salida,
              preset:
                presetValue,
            },
          },
        };
      });
    };

  const handleDayTimeChange =
    (
      day,
      field,
      value,
    ) => {
      setForm((current) => {
        const previous =
          current.day_schedules[
            day
          ] ||
          createDaySchedule(
            current.entrada,
            current.salida,
          );

        const nextSchedule = {
          ...previous,
          [field]:
            value,
        };

        nextSchedule.preset =
          inferPresetValue(
            nextSchedule.entrada,
            nextSchedule.salida,
          );

        return {
          ...current,
          day_schedules: {
            ...current.day_schedules,
            [day]:
              nextSchedule,
          },
        };
      });
    };

  const validateForm = () => {
    if (
      isRoot &&
      !form.company_id
    ) {
      return "Selecciona una empresa.";
    }

    if (
      !form.nombre_turno.trim()
    ) {
      return "Ingresa un nombre para el turno.";
    }

    if (
      form.days.length === 0
    ) {
      return "Selecciona al menos un día.";
    }

    if (
      form.tipo_horario ===
      "GENERAL"
    ) {
      if (
        !form.entrada ||
        !form.salida
      ) {
        return "Completa el horario de entrada y salida.";
      }

      if (
        form.entrada ===
        form.salida
      ) {
        return "La hora de entrada y salida no pueden ser iguales.";
      }
    } else {
      for (
        const day of form.days
      ) {
        const schedule =
          form.day_schedules[
            day
          ];

        const dayName =
          DAYS.find(
            (item) =>
              item.id === day,
          )?.name ||
          "el día seleccionado";

        if (
          !schedule?.entrada ||
          !schedule?.salida
        ) {
          return `Completa el horario de ${dayName}.`;
        }

        if (
          schedule.entrada ===
          schedule.salida
        ) {
          return `La entrada y salida de ${dayName} no pueden ser iguales.`;
        }
      }
    }

    const duplicate =
      groupedShifts.some(
        (group) => {
          const sameCompany =
            String(
              group.company_id || "",
            ) ===
            String(
              form.company_id || "",
            );

          const sameName =
            String(
              group.nombre_turno || "",
            )
              .trim()
              .toUpperCase() ===
            form.nombre_turno
              .trim()
              .toUpperCase();

          const sameCurrent =
            editingKey &&
            sameCompany &&
            String(
              group.nombre_turno || "",
            )
              .trim()
              .toUpperCase() ===
              String(
                editingKey.name ||
                  "",
              )
                .trim()
                .toUpperCase();

          return (
            sameCompany &&
            sameName &&
            !sameCurrent
          );
        },
      );

    if (duplicate) {
      return "Ya existe un turno con ese nombre para la empresa seleccionada.";
    }

    return "";
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    const validation =
      validateForm();

    if (validation) {
      toast.error(validation);
      return;
    }

    setSubmitting(true);

    const normalizedDays =
      [...form.days].sort(
        (a, b) => a - b,
      );

    const normalizedSchedules =
      normalizedDays.map(
        (day) => {
          const schedule =
            form.tipo_horario ===
            "POR_DIA"
              ? form.day_schedules[
                  day
                ]
              : createDaySchedule(
                  form.entrada,
                  form.salida,
                  form.plantilla_horario,
                );

          return {
            day_of_week:
              day,
            entrada:
              normalizeTime(
                schedule?.entrada,
              ),
            salida:
              normalizeTime(
                schedule?.salida,
              ),
            plantilla_horario:
              schedule?.preset ||
              inferPresetValue(
                schedule?.entrada,
                schedule?.salida,
              ),
          };
        },
      );

    const firstSchedule =
      normalizedSchedules[0] ||
      createDaySchedule(
        form.entrada,
        form.salida,
        form.plantilla_horario,
      );

    const resolvedMode =
      normalizeScheduleMode(
        form.tipo_horario,
      );

    const schedulesToSave =
      normalizedSchedules.map(
        (schedule) => ({
          ...schedule,
          day:
            schedule.day_of_week,
          start_time:
            schedule.entrada,
          end_time:
            schedule.salida,
          preset:
            schedule.plantilla_horario,
          tipo_horario:
            resolvedMode,
          metadata: {
            tipo_horario:
              resolvedMode,
            plantilla_horario:
              schedule.plantilla_horario,
          },
        }),
      );

    const payload = {
      ...form,
      nombre_turno:
        form.nombre_turno
          .trim()
          .toUpperCase(),
      days:
        normalizedDays,
      selectedDays:
        normalizedDays,
      tipo_horario:
        resolvedMode,
      schedule_type:
        resolvedMode,
      plantilla_horario:
        resolvedMode ===
        "POR_DIA"
          ? "PERSONALIZADO"
          : form.plantilla_horario,
      entrada:
        firstSchedule.entrada,
      salida:
        firstSchedule.salida,
      start_time:
        firstSchedule.entrada,
      end_time:
        firstSchedule.salida,
      day_schedules:
        schedulesToSave,
      schedules:
        schedulesToSave,
      horarios_por_dia:
        schedulesToSave,
      metadata: {
        tipo_horario:
          resolvedMode,
        plantilla_horario:
          resolvedMode ===
          "POR_DIA"
            ? "PERSONALIZADO"
            : form.plantilla_horario,
      },
    };

    try {
      if (editingKey) {
        await api.put(
          `/turnos-config/bulk/${encodeURIComponent(
            editingKey.name,
          )}`,
          payload,
        );

        toast.success(
          "Turno actualizado",
        );
      } else {
        await api.post(
          "/turnos-config/bulk",
          payload,
        );

        toast.success(
          "Configuración guardada",
        );
      }

      resetForm();
      await fetchTurnos();
    } catch (requestError) {
      console.error(
        "Error procesando turno:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "Error al procesar la solicitud",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGroup = async (
    group,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el turno "${group.nombre_turno}" completo?\n\nSe eliminarán ${group.ids.length} configuración(es) asociadas.`,
      );

    if (!confirmed) return;

    try {
      await Promise.all(
        group.ids.map((id) =>
          api.delete(
            `/turnos-config/${id}`,
          ),
        ),
      );

      toast.success(
        "Turno eliminado",
      );

      await fetchTurnos();
    } catch (requestError) {
      console.error(
        "Error eliminando turno:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "Error al eliminar",
      );
    }
  };

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isRoot
                  ? "bg-blue-50 text-blue-600"
                  : "bg-[#87be00]/10 text-[#87be00]"
              }`}
            >
              {isRoot ? (
                <FiShield size={20} />
              ) : (
                <FiLayers size={20} />
              )}
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Gestión de turnos
              </h1>

              <p
                className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 ${
                  isRoot
                    ? "text-blue-600"
                    : "text-[#87be00]"
                }`}
              >
                {isRoot
                  ? "Configuración multiempresa"
                  : "Horarios operativos"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={
              showForm
                ? "secondary"
                : "dark"
            }
            size="lg"
            leftIcon={
              showForm ? (
                <FiX size={16} />
              ) : (
                <FiPlus size={16} />
              )
            }
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                openCreateForm();
              }
            }}
            className="w-full md:w-auto"
          >
            {showForm
              ? "Cancelar"
              : "Crear turno"}
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        {isRoot && (
          <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 ml-1 mb-2 block">
                Filtrar por empresa
              </span>

              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={
                    selectedCompany
                  }
                  onChange={(event) => {
                    setSelectedCompany(
                      event.target.value,
                    );

                    if (!editingKey) {
                      setForm(
                        (current) => ({
                          ...current,
                          company_id:
                            event.target
                              .value,
                        }),
                      );
                    }
                  }}
                  className={`${inputClass} pl-11`}
                >
                  <option value="">
                    Todas las empresas
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
            </label>
          </section>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-5 sm:p-7 md:p-9 rounded-[2rem] border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {editingKey
                    ? "Editar turno"
                    : "Nuevo turno"}
                </h2>

                <p className="text-[10px] text-gray-400 mt-1">
                  Configura rol, días y horarios automáticos.
                </p>
              </div>

              {editingKey && (
                <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-wider">
                  Edición
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-4 space-y-4">
                {isRoot && (
                  <Field label="Empresa">
                    <select
                      required
                      disabled={
                        Boolean(
                          editingKey,
                        )
                      }
                      value={
                        form.company_id
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            company_id:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Seleccionar empresa
                      </option>

                      {companies.map(
                        (company) => (
                          <option
                            key={
                              company.id
                            }
                            value={
                              company.id
                            }
                          >
                            {company.name ||
                              company.nombre ||
                              "Empresa"}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                )}

                <Field label="Rol operativo">
                  <select
                    value={
                      form.categoria_rol
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          categoria_rol:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={inputClass}
                  >
                    <option value="Mercaderista Full">
                      Mercaderista Full
                    </option>
                    <option value="Mercaderista PT">
                      Mercaderista PT
                    </option>
                    <option value="Supervisor">
                      Supervisor
                    </option>
                  </select>
                </Field>

                <Field label="Nombre del turno">
                  <input
                    type="text"
                    required
                    readOnly={
                      Boolean(
                        editingKey,
                      )
                    }
                    value={
                      form.nombre_turno
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          nombre_turno:
                            event.target
                              .value.toUpperCase(),
                        }),
                      )
                    }
                    placeholder="Ej: Turno A"
                    maxLength={80}
                    className={`${inputClass} uppercase ${
                      editingKey
                        ? "bg-gray-100 text-gray-400"
                        : ""
                    }`}
                  />
                </Field>

                <Field label="Tipo de horario">
                  <div className="relative">
                    <FiCalendar
                      size={15}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                    />

                    <select
                      value={
                        form.tipo_horario
                      }
                      onChange={(event) =>
                        handleScheduleModeChange(
                          event.target.value,
                        )
                      }
                      className={`${inputClass} appearance-none pl-11 pr-11`}
                    >
                      {SCHEDULE_MODES.map(
                        (mode) => (
                          <option
                            key={mode.value}
                            value={mode.value}
                          >
                            {mode.label}
                          </option>
                        ),
                      )}
                    </select>

                    <FiChevronDown
                      size={15}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>

                  <p className="ml-1 mt-2 text-[9px] font-semibold leading-relaxed text-gray-400">
                    {
                      SCHEDULE_MODES.find(
                        (mode) =>
                          mode.value ===
                          form.tipo_horario,
                      )?.description
                    }
                  </p>
                </Field>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <Field label="Días de la semana">
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DAYS.map((day) => {
                      const selected =
                        form.days.includes(
                          day.id,
                        );

                      return (
                        <button
                          key={day.id}
                          type="button"
                          title={day.name}
                          onClick={() =>
                            toggleDay(
                              day.id,
                            )
                          }
                          className={`h-14 rounded-2xl text-[10px] font-black transition-all border-2 flex flex-col items-center justify-center ${
                            selected
                              ? "bg-[#87be00] border-[#87be00] text-white shadow-sm"
                              : "bg-gray-50 border-gray-100 text-gray-400 hover:border-[#87be00]/30"
                          }`}
                        >
                          {day.label}

                          {selected && (
                            <FiCheck
                              size={10}
                              className="mt-1"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {form.tipo_horario ===
                "GENERAL" ? (
                  <div className="space-y-4 rounded-[1.5rem] border border-[#87be00]/15 bg-[#87be00]/5 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/15 text-[#87be00]">
                        <FiZap size={17} />
                      </span>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#679300]">
                          Automatización del horario
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-gray-500">
                          Selecciona una plantilla o configura las horas manualmente.
                        </p>
                      </div>
                    </div>

                    <Field label="Plantilla de horario">
                      <div className="relative">
                        <FiClock
                          size={15}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                        />
                        <select
                          value={form.plantilla_horario}
                          onChange={(event) =>
                            handleGeneralPresetChange(
                              event.target.value,
                            )
                          }
                          className={`${inputClass} appearance-none pl-11 pr-11`}
                        >
                          {SCHEDULE_PRESETS.map(
                            (preset) => (
                              <option
                                key={preset.value}
                                value={preset.value}
                              >
                                {preset.label}
                                {preset.entrada && preset.salida
                                  ? ` · ${preset.entrada} — ${preset.salida}`
                                  : ""}
                              </option>
                            ),
                          )}
                        </select>
                        <FiChevronDown
                          size={15}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Hora de entrada">
                        <input
                          type="time"
                          value={form.entrada}
                          onChange={(event) =>
                            handleGeneralTimeChange(
                              "entrada",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Hora de salida">
                        <input
                          type="time"
                          value={form.salida}
                          onChange={(event) =>
                            handleGeneralTimeChange(
                              "salida",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-700">
                        Horario individual por día
                      </p>
                      <p className="mt-1 text-[10px] font-semibold leading-relaxed text-blue-600/80">
                        Cada día seleccionado puede utilizar una plantilla y horas diferentes.
                      </p>
                    </div>

                    {form.days.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
                        <FiCalendar size={22} className="mx-auto text-gray-300" />
                        <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Selecciona al menos un día
                        </p>
                      </div>
                    ) : (
                      form.days.map((dayId) => {
                        const day = DAYS.find((item) => item.id === dayId);
                        const schedule =
                          form.day_schedules[dayId] ||
                          createDaySchedule(
                            form.entrada,
                            form.salida,
                            form.plantilla_horario,
                          );

                        return (
                          <div
                            key={dayId}
                            className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#87be00] text-[11px] font-black text-white">
                                  {day?.label}
                                </span>
                                <div>
                                  <p className="text-xs font-black text-gray-900">
                                    {day?.name}
                                  </p>
                                  <p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-gray-400">
                                    Configuración diaria
                                  </p>
                                </div>
                              </div>
                              <span className="rounded-full border border-[#87be00]/20 bg-[#87be00]/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-[#679300]">
                                {schedule.entrada} — {schedule.salida}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <Field label="Tipo de horario">
                                <select
                                  value={
                                    schedule.preset ||
                                    inferPresetValue(
                                      schedule.entrada,
                                      schedule.salida,
                                    )
                                  }
                                  onChange={(event) =>
                                    handleDayPresetChange(
                                      dayId,
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                >
                                  {SCHEDULE_PRESETS.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                      {preset.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>

                              <Field label="Entrada">
                                <input
                                  type="time"
                                  value={schedule.entrada}
                                  onChange={(event) =>
                                    handleDayTimeChange(
                                      dayId,
                                      "entrada",
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                />
                              </Field>

                              <Field label="Salida">
                                <input
                                  type="time"
                                  value={schedule.salida}
                                  onChange={(event) =>
                                    handleDayTimeChange(
                                      dayId,
                                      "salida",
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                />
                              </Field>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  variant={
                    isRoot
                      ? "primary"
                      : "dark"
                  }
                  size="lg"
                  fullWidth
                  loading={submitting}
                  loadingText="Guardando..."
                >
                  {editingKey
                    ? "Actualizar turno"
                    : "Crear configuración"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
            <FiLoader
              size={30}
              className="animate-spin text-[#87be00]"
            />

            <p className="text-[10px] font-black uppercase tracking-wider">
              Cargando turnos...
            </p>
          </div>
        ) : error ? (
          <InformationMessage
            title="No se pudieron cargar los turnos"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={14}
                  />
                }
                onClick={fetchTurnos}
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : groupedShifts.length ===
          0 ? (
          <InformationMessage
            title="Sin información disponible"
            description="No existen turnos configurados para la empresa seleccionada."
          />
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groupedShifts.map(
              (shift) => (
                <article
                  key={shift.key}
                  className="bg-white rounded-[2rem] p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {isRoot && (
                    <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-[8px] font-black text-center py-1.5 uppercase tracking-wider">
                      {shift.company_name ||
                        companies.find(
                          (company) =>
                            company.id ===
                            shift.company_id,
                        )?.name ||
                        "Empresa sin identificar"}
                    </div>
                  )}

                  <div
                    className={`flex items-start justify-between gap-4 ${
                      isRoot
                        ? "mt-4"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[8px] font-black uppercase text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#87be00]" />
                          {shift.categoria_rol}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-wider ${
                            shift.tipo_horario === "POR_DIA"
                              ? "border-blue-100 bg-blue-50 text-blue-700"
                              : "border-[#87be00]/20 bg-[#87be00]/10 text-[#679300]"
                          }`}
                        >
                          {shift.tipo_horario === "POR_DIA" ? (
                            <FiCalendar size={10} />
                          ) : (
                            <FiClock size={10} />
                          )}
                          {shift.tipo_horario === "POR_DIA" ? "Por día" : "General"}
                        </span>
                      </div>

                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight truncate mt-4">
                        {
                          shift.nombre_turno
                        }
                      </h2>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <IconButton
                        label="Editar turno"
                        size="sm"
                        onClick={() =>
                          handleEdit(
                            shift,
                          )
                        }
                      >
                        <FiEdit3
                          size={14}
                        />
                      </IconButton>

                      <IconButton
                        label="Eliminar turno"
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          deleteGroup(
                            shift,
                          )
                        }
                      >
                        <FiTrash2
                          size={14}
                        />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-5 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS.map((day) => {
                        const selected =
                          shift.dias.includes(
                            day.id,
                          );

                        return (
                          <div
                            key={day.id}
                            title={day.name}
                            className={`h-9 flex items-center justify-center rounded-xl text-[9px] font-black ${
                              selected
                                ? "bg-[#87be00] text-white"
                                : "bg-white text-gray-300 border border-gray-100"
                            }`}
                          >
                            {day.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {shift.tipo_horario === "POR_DIA" ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                        Horario por día
                      </p>
                      {shift.dias.map((dayId) => {
                        const day = DAYS.find((item) => item.id === dayId);
                        const schedule =
                          shift.day_schedules[dayId] || createDaySchedule();

                        return (
                          <div
                            key={dayId}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                              {day?.name}
                            </span>
                            <span className="text-[11px] font-black text-gray-900">
                              {schedule.entrada} — {schedule.salida}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center gap-3">
                      <div className="w-11 h-11 bg-[#87be00]/10 rounded-xl text-[#87be00] flex items-center justify-center shrink-0">
                        <FiClock size={18} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                          Horario de jornada
                        </p>
                        <p className="text-lg font-black text-gray-900 mt-1">
                          {normalizeTime(shift.entrada)} — {normalizeTime(shift.salida)}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ),
            )}
          </section>
        )}
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
  action,
}) => (
  <section className="bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 py-12 text-center shadow-sm">
    <FiLayers
      size={26}
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
  disabled:cursor-not-allowed
  disabled:opacity-60
`;

export default TurnosManager;