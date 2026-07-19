import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  IconButton,
  StatusButton,
} from "../../components/ui";
import {
  FiEdit,
  FiGlobe,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import CreateLocalModal from "../root/CreateLocalModal";
import UploadLocalesModal from "../root/UploadLocalesModal";
import EditLocalModal from "../root/EditLocalModal"; // 🚩 CORREGIDO: Ahora importa el modal correcto de locales
import LocalesMap from "../../components/LocalesMap";
import { motion } from "framer-motion";

const AdminLocales = () => {
  const [locales, setLocales] = useState([]);
  const [chains, setChains] = useState([]);
  const [regions, setRegions] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [companies, setCompanies] = useState([]); // <-- NUEVO ESTADO: Para almacenar las empresas

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedComuna, setSelectedComuna] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);

  const fetchLocalesAndCompanies = useCallback(async () => {
    // <-- MODIFICADO: Trae locales y empresas
    try {
      const [localesData, companiesData] = await Promise.all([
        api.get("/locales"),
        api.get("/companies"),
      ]);

      setLocales(localesData || []);
      setCompanies(companiesData || []);

      if (localesData) {
        setChains(
          [...new Set(localesData.map((local) => local.cadena))]
            .filter(Boolean)
            .sort(),
        );

        setRegions(
          [
            ...new Set(
              localesData.map(
                (local) => local.region_name || local.region,
              ),
            ),
          ]
            .filter(Boolean)
            .sort(),
        );
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    }
  }, []);

  useEffect(() => {
    fetchLocalesAndCompanies();
  }, [fetchLocalesAndCompanies]);

  useEffect(() => {
    const filteredComunas = [
      ...new Set(
        locales
          .filter(
            (local) =>
              !selectedRegion ||
              (local.region_name || local.region) === selectedRegion,
          )
          .map((local) => local.comuna_name || local.comuna),
      ),
    ]
      .filter(Boolean)
      .sort();

    setComunas(filteredComunas);
    setSelectedComuna("");
  }, [selectedRegion, locales]);

  const filteredLocales = useMemo(() => {
    return locales.filter((local) => {
      const term = searchTerm.toLowerCase().trim();

      const matchesChain =
        selectedChain === "" || local.cadena === selectedChain;

      const matchesRegion =
        selectedRegion === "" ||
        (local.region_name || local.region) === selectedRegion;

      const matchesComuna =
        selectedComuna === "" ||
        (local.comuna_name || local.comuna) === selectedComuna;

      const matchesSearch =
        local.cadena?.toLowerCase().includes(term) ||
        local.codigo_local
          ?.toString()
          .toLowerCase()
          .includes(term) ||
        (local.comuna_name || local.comuna)
          ?.toLowerCase()
          .includes(term) ||
        local.direccion?.toLowerCase().includes(term);

      return (
        matchesSearch &&
        matchesChain &&
        matchesRegion &&
        matchesComuna
      );
    });
  }, [
    locales,
    searchTerm,
    selectedChain,
    selectedRegion,
    selectedComuna,
  ]);

  const handleEdit = (local) => {
    setSelectedLocal(local);
    setOpenEdit(true);
  };

  const toggleLocal = async (id) => {
    try {
      await api.patch(`/locales/${id}/toggle`);

      setLocales((prev) =>
        prev.map((local) =>
          local.id === id
            ? { ...local, is_active: !local.is_active }
            : local,
        ),
      );

      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  };

  const deleteLocal = async (local) => {
    const localName =
      local.cadena ||
      local.codigo_local ||
      "seleccionado";

    const confirmed = window.confirm(
      `¿Deseas eliminar el local ${localName}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/locales/${local.id}`);

      setLocales((prev) =>
        prev.filter((item) => item.id !== local.id),
      );

      toast.success("Local eliminado correctamente");
    } catch (error) {
      toast.error("No se pudo eliminar el local");
    }
  };

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4 md:px-0 font-[Outfit]">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-1">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">
            Gestión de Locales
          </h2>

          <p className="text-[10px] md:text-xs font-black text-[#87be00] uppercase tracking-[0.3em] mt-3">
            Administración de puntos y geocercas
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
          <Button
            variant="outline"
            size="lg"
            leftIcon={<FiUpload size={16} />}
            onClick={() => setOpenUpload(true)}
            className="flex-1 lg:flex-none"
          >
            Importar locales
          </Button>

          <Button
            size="lg"
            leftIcon={<FiPlus size={18} />}
            onClick={() => setOpenCreate(true)}
            className="flex-1 lg:flex-none"
          >
            Crear local
          </Button>
        </div>
      </div>

      {/* FILTROS Y MAPA */}
      <div className="bg-white p-5 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <FiGlobe className="absolute left-4 top-4 text-[#87be00]" />

            <select
              value={selectedRegion}
              onChange={(event) =>
                setSelectedRegion(event.target.value)
              }
              className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"
            >
              <option value="">Todas las regiones</option>

              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiMapPin className="absolute left-4 top-4 text-[#87be00]" />

            <select
              value={selectedComuna}
              onChange={(event) =>
                setSelectedComuna(event.target.value)
              }
              className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"
            >
              <option value="">Todas las comunas</option>

              {comunas.map((comuna) => (
                <option key={comuna} value={comuna}>
                  {comuna}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiShoppingCart className="absolute left-4 top-4 text-[#87be00]" />

            <select
              value={selectedChain}
              onChange={(event) =>
                setSelectedChain(event.target.value)
              }
              className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"
            >
              <option value="">Todas las cadenas</option>

              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-4 top-4 text-gray-400" />

            <input
              type="text"
              placeholder="Buscar por local, código, comuna o dirección..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-bold outline-none"
            />
          </div>
        </div>

        <div className="h-[400px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner">
          <LocalesMap locales={filteredLocales} />
        </div>
      </div>

      {/* TABLA DESKTOP */}
      <div className="hidden md:block bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">
                Local
              </th>

              <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">
                Ubicación
              </th>

              <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">
                Dirección
              </th>

              <th className="p-8 text-center font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">
                Estado
              </th>

              <th className="p-8 text-right font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredLocales.length > 0 ? (
              filteredLocales.map((local) => (
                <tr
                  key={local.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="p-8 font-black">
                    {local.cadena} (#{local.codigo_local})
                  </td>

                  <td className="p-8 font-bold">
                    {local.comuna_name ||
                      local.comuna ||
                      "Sin comuna"}
                  </td>

                  <td className="p-8 text-xs">
                    {local.direccion}
                  </td>

                  <td className="p-8 text-center">
                    <StatusButton
                      active={local.is_active}
                      onClick={() => toggleLocal(local.id)}
                    />
                  </td>

                  <td className="p-8">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label={`Editar local ${local.cadena}`}
                        onClick={() => handleEdit(local)}
                      >
                        <FiEdit size={16} />
                      </IconButton>

                      <IconButton
                        label={`Eliminar local ${local.cadena}`}
                        variant="danger"
                        onClick={() => deleteLocal(local)}
                      >
                        <FiTrash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-12 text-center text-sm font-bold text-gray-400"
                >
                  No se encontraron locales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL/TABLET */}
      <div className="md:hidden space-y-4">
        {filteredLocales.length > 0 ? (
          filteredLocales.map((local) => (
            <motion.div
              key={local.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-gray-900 uppercase italic">
                    {local.cadena}
                  </h4>

                  <p className="text-[10px] font-bold text-gray-400">
                    ID: {local.codigo_local}
                  </p>
                </div>

                <StatusButton
                  active={local.is_active}
                  onClick={() => toggleLocal(local.id)}
                />
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <p className="flex items-center gap-2">
                  <FiMapPin className="text-[#87be00]" />

                  {local.comuna_name ||
                    local.comuna ||
                    "Sin comuna"}
                </p>

                <p className="font-bold truncate">
                  {local.direccion}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                <IconButton
                  label={`Editar local ${local.cadena}`}
                  size="lg"
                  onClick={() => handleEdit(local)}
                >
                  <FiEdit size={17} />
                </IconButton>

                <IconButton
                  label={`Eliminar local ${local.cadena}`}
                  variant="danger"
                  size="lg"
                  onClick={() => deleteLocal(local)}
                >
                  <FiTrash2 size={17} />
                </IconButton>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center">
            <p className="text-sm font-bold text-gray-400">
              No se encontraron locales.
            </p>
          </div>
        )}
      </div>

      <CreateLocalModal
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={fetchLocalesAndCompanies}
        companies={companies}
      />

      <UploadLocalesModal
        isOpen={openUpload}
        onClose={() => setOpenUpload(false)}
        onUploaded={fetchLocalesAndCompanies}
        companies={companies}
      />

      {selectedLocal && (
        <EditLocalModal
          isOpen={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedLocal(null);
          }}
          onUpdated={fetchLocalesAndCompanies}
          local={selectedLocal}
          companies={companies}
        />
      )}
    </div>
  );
};

export default AdminLocales;