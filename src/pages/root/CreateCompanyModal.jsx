import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBarChart2,
  FiBriefcase,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const INITIAL_STATE = {
  rut: "",
  name: "",
  address: "",
  max_supervisors: 2,
  max_users: 10,
  max_view: 1,
  admin_name: "",
  admin_email: "",
  admin_phone: "",
  admin_position: "",
  admin_password: "",
};

const cleanRut = (rut = "") =>
  String(rut)
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\s/g, "")
    .toUpperCase();

const formatRut = (rut = "") => {
  const clean = cleanRut(rut)
    .replace(/[^0-9K]/g, "")
    .slice(0, 9);

  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  const formattedBody = body.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );

  return `${formattedBody}-${dv}`;
};

const validateRut = (rut = "") => {
  const clean = cleanRut(rut);

  if (!/^\d{7,8}[0-9K]$/.test(clean)) {
    return false;
  }

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (
    let index = body.length - 1;
    index >= 0;
    index -= 1
  ) {
    sum +=
      multiplier *
      Number.parseInt(body[index], 10);

    multiplier =
      multiplier === 7
        ? 2
        : multiplier + 1;
  }

  const expected = 11 - (sum % 11);

  const calculatedDv =
    expected === 11
      ? "0"
      : expected === 10
        ? "K"
        : String(expected);

  return calculatedDv === dv;
};

const normalizePositiveInteger = (
  value,
) => {
  const parsed = Number.parseInt(value, 10);

  if (
    Number.isNaN(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return parsed;
};

const CreateCompanyModal = ({
  isOpen,
  onClose,
  onCreated,
  editingCompany,
}) => {
  const { user } = useAuth();

  const isRoot = user?.role === "ROOT";

  const isCultivaAdmin =
    user?.role === "ADMIN_CLIENTE" &&
    user?.company_id ===
      CULTIVA_COMPANY_ID;

  const hasFullAccess =
    isRoot || isCultivaAdmin;

  const isEditing =
    Boolean(editingCompany);

  const [form, setForm] =
    useState(INITIAL_STATE);
  const [loading, setLoading] =
    useState(false);
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [fieldErrors, setFieldErrors] =
    useState({});

  useEffect(() => {
    if (!isOpen) return;

    setFieldErrors({});
    setShowPassword(false);

    if (editingCompany) {
      setForm({
        ...INITIAL_STATE,
        ...editingCompany,
        rut: formatRut(
          editingCompany.rut || "",
        ),
        max_supervisors:
          editingCompany.max_supervisors ??
          INITIAL_STATE.max_supervisors,
        max_users:
          editingCompany.max_users ??
          INITIAL_STATE.max_users,
        max_view:
          editingCompany.max_view ??
          INITIAL_STATE.max_view,
        admin_password: "",
      });
    } else {
      setForm(INITIAL_STATE);
    }
  }, [editingCompany, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, loading, onClose]);

  const title = isEditing
    ? "Editar suscripción"
    : "Nueva empresa";

  const subtitle = isEditing
    ? `Cliente: ${
        editingCompany?.name ||
        editingCompany?.nombre ||
        "Empresa"
      }`
    : "Configuración de cliente";

  const planTotal = useMemo(
    () =>
      normalizePositiveInteger(
        form.max_supervisors,
      ) +
      normalizePositiveInteger(
        form.max_users,
      ) +
      normalizePositiveInteger(
        form.max_view,
      ),
    [
      form.max_supervisors,
      form.max_users,
      form.max_view,
    ],
  );

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    const nextValue =
      name === "rut"
        ? formatRut(value)
        : value;

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({
        ...current,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!isEditing) {
      if (!form.rut.trim()) {
        errors.rut =
          "Ingresa el RUT de la empresa.";
      } else if (!validateRut(form.rut)) {
        errors.rut =
          "El RUT ingresado no es válido.";
      }

      if (!form.name.trim()) {
        errors.name =
          "Ingresa el nombre de la empresa.";
      }

      if (!form.address.trim()) {
        errors.address =
          "Ingresa la dirección principal.";
      }

      if (!form.admin_name.trim()) {
        errors.admin_name =
          "Ingresa el nombre del administrador.";
      }

      if (!form.admin_email.trim()) {
        errors.admin_email =
          "Ingresa el correo del administrador.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.admin_email.trim(),
        )
      ) {
        errors.admin_email =
          "Ingresa un correo válido.";
      }

      if (
        !form.admin_password ||
        form.admin_password.length < 8
      ) {
        errors.admin_password =
          "La contraseña debe tener al menos 8 caracteres.";
      }
    }

    [
      "max_supervisors",
      "max_users",
      "max_view",
    ].forEach((field) => {
      const parsed = Number.parseInt(
        form[field],
        10,
      );

      if (
        Number.isNaN(parsed) ||
        parsed < 0
      ) {
        errors[field] =
          "Debe ser 0 o mayor.";
      }
    });

    setFieldErrors(errors);

    return (
      Object.keys(errors).length === 0
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasFullAccess) {
      toast.error(
        "No tienes permisos para realizar esta acción.",
      );
      return;
    }

    if (!validateForm()) {
      toast.error(
        "Revisa los campos marcados.",
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        rut: cleanRut(form.rut),
        name: form.name.trim(),
        address: form.address.trim(),
        admin_name:
          form.admin_name.trim(),
        admin_email:
          form.admin_email
            .trim()
            .toLowerCase(),
        admin_phone:
          form.admin_phone.trim(),
        admin_position:
          form.admin_position.trim(),
        max_supervisors:
          normalizePositiveInteger(
            form.max_supervisors,
          ),
        max_users:
          normalizePositiveInteger(
            form.max_users,
          ),
        max_view:
          normalizePositiveInteger(
            form.max_view,
          ),
      };

      if (isEditing) {
        await api.patch(
          `/companies/${editingCompany.id}`,
          {
            max_supervisors:
              payload.max_supervisors,
            max_users:
              payload.max_users,
            max_view:
              payload.max_view,
          },
        );

        toast.success(
          "Suscripción actualizada correctamente",
        );
      } else {
        await api.post(
          "/companies/with-admin",
          payload,
        );

        toast.success(
          "Empresa creada correctamente",
        );
      }

      await onCreated?.();
      onClose();
    } catch (requestError) {
      console.error(
        "Error procesando empresa:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          requestError?.message ||
          "No se pudo procesar la empresa.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-gray-900/65 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center font-[Outfit]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-modal-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white w-full sm:max-w-3xl h-[94vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-200">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-5 sm:px-7 md:px-9">
          <div className="flex justify-between items-start gap-4 pr-12">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                {isEditing ? (
                  <FiShield size={20} />
                ) : (
                  <FiBriefcase size={20} />
                )}
              </div>

              <div className="min-w-0">
                <h2
                  id="company-modal-title"
                  className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight"
                >
                  {title}
                </h2>

                <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.18em] mt-1 truncate">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          <IconButton
            label="Cerrar formulario"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5"
          >
            <FiX size={18} />
          </IconButton>
        </header>

        <form
          onSubmit={handleSubmit}
          className="h-[calc(94vh-86px)] sm:h-auto overflow-y-auto custom-scrollbar"
        >
          <div className="p-5 sm:p-7 md:p-9 space-y-7 pb-32 sm:pb-8">
            <section
              className={
                isEditing
                  ? "opacity-60"
                  : ""
              }
            >
              <SectionHeader
                icon={
                  <FiBriefcase size={15} />
                }
                title="Información legal"
                description="Identificación principal de la empresa."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field
                  label="RUT de la empresa"
                  error={fieldErrors.rut}
                >
                  <input
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    placeholder="76.123.456-7"
                    required={!isEditing}
                    disabled={isEditing}
                    autoComplete="off"
                    className={inputClass(
                      fieldErrors.rut,
                    )}
                  />
                </Field>

                <Field
                  label="Nombre de fantasía"
                  error={fieldErrors.name}
                >
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Empresa SpA"
                    required={!isEditing}
                    disabled={isEditing}
                    className={inputClass(
                      fieldErrors.name,
                    )}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field
                    label="Dirección de la casa matriz"
                    error={
                      fieldErrors.address
                    }
                  >
                    <div className="relative">
                      <FiMapPin
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Av. Vitacura 123"
                        required={!isEditing}
                        disabled={isEditing}
                        className={`${inputClass(
                          fieldErrors.address,
                        )} pl-11`}
                      />
                    </div>
                  </Field>
                </div>
              </div>
            </section>

            <section className="bg-gray-50 p-5 sm:p-6 rounded-[2rem] border border-gray-100">
              <SectionHeader
                icon={
                  <FiBarChart2
                    size={15}
                  />
                }
                title="Capacidad del plan"
                description={`${planTotal} cupos configurados en total.`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                <PlanField
                  label="Supervisores"
                  name="max_supervisors"
                  value={
                    form.max_supervisors
                  }
                  error={
                    fieldErrors.max_supervisors
                  }
                  onChange={handleChange}
                />

                <PlanField
                  label="Mercaderistas"
                  name="max_users"
                  value={form.max_users}
                  error={
                    fieldErrors.max_users
                  }
                  onChange={handleChange}
                />

                <PlanField
                  label="Visualizadores"
                  name="max_view"
                  value={form.max_view}
                  error={
                    fieldErrors.max_view
                  }
                  onChange={handleChange}
                />
              </div>
            </section>

            {!isEditing && (
              <section>
                <SectionHeader
                  icon={
                    <FiUser size={15} />
                  }
                  title="Administrador inicial"
                  description="Usuario responsable de administrar esta empresa."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Field
                    label="Nombre completo"
                    error={
                      fieldErrors.admin_name
                    }
                  >
                    <div className="relative">
                      <FiUser
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="admin_name"
                        value={form.admin_name}
                        onChange={handleChange}
                        placeholder="Nombre y apellido"
                        required
                        autoComplete="name"
                        className={`${inputClass(
                          fieldErrors.admin_name,
                        )} pl-11`}
                      />
                    </div>
                  </Field>

                  <Field label="Cargo">
                    <input
                      name="admin_position"
                      value={
                        form.admin_position
                      }
                      onChange={handleChange}
                      placeholder="Administrador"
                      className={inputClass()}
                    />
                  </Field>

                  <Field
                    label="Correo"
                    error={
                      fieldErrors.admin_email
                    }
                  >
                    <div className="relative">
                      <FiMail
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="email"
                        name="admin_email"
                        value={form.admin_email}
                        onChange={handleChange}
                        placeholder="admin@empresa.cl"
                        required
                        autoComplete="email"
                        className={`${inputClass(
                          fieldErrors.admin_email,
                        )} pl-11`}
                      />
                    </div>
                  </Field>

                  <Field label="Teléfono">
                    <div className="relative">
                      <FiPhone
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="tel"
                        name="admin_phone"
                        value={form.admin_phone}
                        onChange={handleChange}
                        placeholder="+56 9 1234 5678"
                        autoComplete="tel"
                        className={`${inputClass()} pl-11`}
                      />
                    </div>
                  </Field>

                  <div className="md:col-span-2">
                    <Field
                      label="Contraseña temporal"
                      error={
                        fieldErrors.admin_password
                      }
                      hint="Debe tener al menos 8 caracteres."
                    >
                      <div className="relative">
                        <FiLock
                          size={15}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          name="admin_password"
                          value={
                            form.admin_password
                          }
                          onChange={handleChange}
                          placeholder="Mínimo 8 caracteres"
                          required
                          autoComplete="new-password"
                          className={`${inputClass(
                            fieldErrors.admin_password,
                          )} pl-11 pr-12`}
                        />

                        <button
                          type="button"
                          aria-label={
                            showPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                          onClick={() =>
                            setShowPassword(
                              (current) =>
                                !current,
                            )
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {showPassword ? (
                            <FiEyeOff
                              size={17}
                            />
                          ) : (
                            <FiEye
                              size={17}
                            />
                          )}
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>
              </section>
            )}
          </div>

          <footer className="fixed sm:sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 sm:px-7 md:px-9 z-20">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 max-w-3xl mx-auto">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={loading}
                onClick={onClose}
                className="sm:min-w-[130px]"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="dark"
                size="lg"
                fullWidth
                loading={loading}
                loadingText={
                  isEditing
                    ? "Guardando..."
                    : "Creando..."
                }
                leftIcon={
                  isEditing ? (
                    <FiSave size={16} />
                  ) : (
                    <FiBriefcase
                      size={16}
                    />
                  )
                }
              >
                {isEditing
                  ? "Guardar cambios"
                  : "Crear empresa"}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

const SectionHeader = ({
  icon,
  title,
  description,
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 text-[#87be00]">
      {icon}
    </div>

    <div>
      <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-wider">
        {title}
      </h3>

      {description && (
        <p className="text-[10px] text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
  </div>
);

const Field = ({
  label,
  error,
  hint,
  children,
}) => (
  <label className="block">
    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider ml-1 mb-1.5 block">
      {label}
    </span>

    {children}

    {error ? (
      <span className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 block">
        {error}
      </span>
    ) : hint ? (
      <span className="text-[10px] text-gray-400 mt-1.5 ml-1 block">
        {hint}
      </span>
    ) : null}
  </label>
);

const PlanField = ({
  label,
  name,
  value,
  error,
  onChange,
}) => (
  <Field
    label={label}
    error={error}
  >
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min="0"
      step="1"
      inputMode="numeric"
      className={`
        w-full h-14 px-4 rounded-2xl
        bg-white border text-center
        text-xl font-black text-gray-800
        outline-none transition-all
        focus:ring-4 focus:ring-[#87be00]/10
        ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-gray-100 focus:border-[#87be00]/50"
        }
      `}
    />
  </Field>
);

const inputClass = (error) => `
  w-full h-12 px-4
  bg-gray-50 border rounded-2xl
  text-sm font-semibold text-gray-700
  outline-none transition-all
  placeholder:text-gray-300
  focus:bg-white
  focus:ring-4 focus:ring-[#87be00]/10
  disabled:cursor-not-allowed
  disabled:text-gray-400
  ${
    error
      ? "border-red-300 focus:border-red-400"
      : "border-gray-100 focus:border-[#87be00]/50"
  }
`;

export default CreateCompanyModal;