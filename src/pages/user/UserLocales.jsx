import React, { useState, useEffect } from "react";
import {
  FiMapPin, FiPhone, FiSearch, FiNavigation,
  FiCheckCircle, FiClock, FiAlertCircle, FiUser, FiHash
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const UserLocales = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMyLocales = async () => {
  try {
    setLoading(true);

    const response = await api.get("/locales/my-assigned");

    console.log("📍 Respuesta locales asignados:", response);

    const rows =
      Array.isArray(response)
        ? response
        : Array.isArray(response?.locales)
          ? response.locales
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.locales)
              ? response.data.locales
              : [];

    console.log("📍 Locales procesados:", rows);

    setLocales(rows);
  } catch (error) {
    console.error("❌ Error cargando locales:", {
      status: error?.status,
      message: error?.message,
      data: error?.data,
      fullError: error
    });

    setLocales([]);

    toast.error(
      error?.message ||
      "No se pudieron cargar tus locales"
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchMyLocales(); }, []);

 const normalizedSearch = searchTerm
  .trim()
  .toLowerCase();

const filteredLocales = locales.filter((local) => {
  if (!normalizedSearch) return true;

  const cadena = String(
    local?.cadena || ""
  ).toLowerCase();

  const direccion = String(
    local?.direccion || ""
  ).toLowerCase();

  const codigo = String(
    local?.codigo_local || ""
  ).toLowerCase();

  const comuna = String(
    local?.comuna_name || local?.comuna || ""
  ).toLowerCase();

  return (
    cadena.includes(normalizedSearch) ||
    direccion.includes(normalizedSearch) ||
    codigo.includes(normalizedSearch) ||
    comuna.includes(normalizedSearch)
  );
});

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-[#87be00] border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-gray-300 italic uppercase tracking-widest text-[10px]">
        Sincronizando puntos de venta...
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-6 font-[Outfit] animate-in fade-in duration-500 pb-20">

      {/* HEADER */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
              Mis Locales
            </h1>
            <p className="text-[#87be00] text-[10px] font-black uppercase tracking-widest mt-1">
              Ruta de hoy — {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="bg-[#87be00]/10 px-5 py-3 rounded-2xl text-center">
            <p className="text-[#87be00] font-black text-2xl leading-none">{locales.length}</p>
            <p className="text-[#87be00] text-[9px] font-black uppercase tracking-widest mt-0.5">
              {locales.length === 1 ? 'Visita' : 'Visitas'}
            </p>
          </div>
        </div>

        <div className="relative w-full">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cadena, dirección o código..."
            className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-14 pr-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all uppercase italic shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTADO */}
      <div className="space-y-4">
        {filteredLocales.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
            <FiAlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-black uppercase text-[11px] tracking-[0.2em]">
              {searchTerm ? 'Sin resultados para tu búsqueda' : 'No tienes visitas programadas para hoy'}
            </p>
          </div>
        ) : (
          filteredLocales.map((local, index) => (
            <div
              key={
  local.route_id ||
  local.id ||
  `${local.codigo_local}-${index}`
}
              className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Barra superior de estado */}
              <div className={`h-1.5 w-full ${local.status === 'COMPLETED' ? 'bg-[#87be00]' : local.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-100'}`} />

              <div className="p-6 flex flex-col md:flex-row gap-6">

                {/* NÚMERO + AVATAR */}
                <div className="flex items-start gap-4 md:w-1/12">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-gray-300 text-sm shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* IDENTIFICACIÓN */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-black text-gray-900 uppercase italic leading-none">
                      {local.cadena}
                    </h3>
                    {/* Badge estado */}
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      local.status === 'COMPLETED'
                        ? 'bg-[#87be00]/10 text-[#87be00]'
                        : local.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-500'
                        : 'bg-gray-50 text-gray-400'
                    }`}>
                      {local.status === 'COMPLETED'
                        ? '✓ Completado'
                        : local.status === 'IN_PROGRESS'
                        ? '● En curso'
                        : '○ Pendiente'}
                    </span>
                  </div>

                  {/* Grid de datos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Código */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <FiHash size={12} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Código</p>
                        <p className="text-xs font-black text-gray-700 uppercase">
                          {local.codigo_local || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <FiMapPin size={12} className="text-[#87be00]" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Dirección</p>
                        <p className="text-xs font-bold text-gray-700 leading-tight">
                          {local.direccion}
                          {local.comuna_name && (
                            <span className="text-gray-400">, {local.comuna_name}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Contacto nombre */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <FiUser size={12} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Contacto</p>
                        <p className="text-xs font-bold text-gray-700">
                          {local.contacto_nombre && local.contacto_nombre !== 'Sin informacion'
                            ? local.contacto_nombre
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <FiPhone size={12} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Teléfono</p>
                        {local.contacto_telefono && local.contacto_telefono !== 'Sin informacion' ? (
                          <a
                            href={`tel:${local.contacto_telefono}`}
                            className="text-xs font-black text-[#87be00] hover:underline"
                          >
                            {local.contacto_telefono}
                          </a>
                        ) : (
                          <p className="text-xs font-bold text-gray-400">—</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Horario */}
                  {local.start_time && (
                    <div className="flex items-center gap-2 pt-1">
                      <FiClock size={11} className="text-[#87be00]" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">
                        {local.start_time?.slice(0, 5)} HRS
                        {local.end_time && ` — ${local.end_time?.slice(0, 5)} HRS`}
                      </span>
                    </div>
                  )}
                </div>

                {/* ACCIÓN GPS */}
                {local.lat && local.lng && (
                  <div className="flex md:flex-col items-center justify-end gap-3 md:w-auto">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-[#87be00] hover:text-white transition-all shadow-sm active:scale-90"
                      title="Navegar al local"
                    >
                      <FiNavigation size={20} />
                    </a>
                  </div>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserLocales;