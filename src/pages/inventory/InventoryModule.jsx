import React, { useState, useEffect, useMemo } from 'react';
import { FiLoader, FiAlertTriangle, FiPackage, FiAlertCircle, FiSearch, FiFilter, FiX, FiTrendingDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import SawtoothChart from "./SawtoothChart";

const formatMes = (mes) => {
  if (!mes) return '—';
  const str = String(mes);
  if (str.length !== 6) return mes;
  const year  = str.slice(0, 4);
  const month = str.slice(4, 6);
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const nombre = nombres[parseInt(month, 10) - 1];
  return nombre ? `${nombre} ${year}` : mes;
};

const FilterSelect = ({ label, value, onChange, options, renderOption }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-[10px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#87be00]/30 focus:border-[#87be00] transition-all cursor-pointer min-w-[140px]"
    >
      <option value="">Todos</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {renderOption ? renderOption(opt) : opt}
        </option>
      ))}
    </select>
  </div>
);

const InventoryModule = () => {
  const { user } = useAuth();
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [selectedItem, setSelectedItem]       = useState(null);
  const [sawtoothData, setSawtoothData]       = useState([]);
  const [sawtoothLoading, setSawtoothLoading] = useState(false);

  // Estados de paginación y filtros
  const [currentPage, setCurrentPage]     = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [search, setSearch]               = useState('');
  const [filterRegion, setFilterRegion]   = useState('');
  const [filterComuna, setFilterComuna]   = useState('');
  const [filterCadena, setFilterCadena]   = useState('');
  const [filterMes, setFilterMes]         = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user?.company_id) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/inventory/stockout-alerts", {
          params: { company_id: user.company_id }
        });
        const data = response?.data ?? response;
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error inventario:", err);
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [user?.company_id]);

  // Resetear página al filtrar o buscar
  useEffect(() => { setCurrentPage(1); }, [search, filterRegion, filterComuna, filterCadena, filterMes]);

  const handleSelectItem = async (item) => {
    if (selectedItem?.descripcion_producto === item.descripcion_producto &&
        selectedItem?.local_nombre === item.local_nombre) {
      setSelectedItem(null);
      setSawtoothData([]);
      return;
    }
    setSelectedItem(item);
    setSawtoothData([]);
    try {
      setSawtoothLoading(true);
      const response = await api.get("/inventory/sawtooth", {
        params: {
          company_id: user.company_id,
          producto:   item.descripcion_producto,
          local:      item.local_nombre,
          cadena:     item.cadena,
        }
      });
      const data = response?.data ?? response;
      setSawtoothData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error sawtooth:", err);
      setSawtoothData([]);
    } finally {
      setSawtoothLoading(false);
    }
  };

  const regions = useMemo(() => [...new Set(alerts.map(a => a.region).filter(Boolean))].sort(), [alerts]);
  const comunas = useMemo(() => {
    const base = filterRegion ? alerts.filter(a => a.region === filterRegion) : alerts;
    return [...new Set(base.map(a => a.comuna).filter(Boolean))].sort();
  }, [alerts, filterRegion]);
  const cadenas = useMemo(() => {
    const base = filterRegion ? alerts.filter(a => a.region === filterRegion) : alerts;
    return [...new Set(base.map(a => a.cadena).filter(Boolean))].sort();
  }, [alerts, filterRegion]);
  const meses = useMemo(() =>
    [...new Set(alerts.map(a => a.mes).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
  [alerts]);

  const filtered = useMemo(() => {
    return alerts.filter(item => {
      const matchSearch = !search || [item.descripcion_producto, item.marca, item.ean]
                           .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchRegion = !filterRegion || item.region === filterRegion;
      const matchComuna = !filterComuna || item.comuna === filterComuna;
      const matchCadena = !filterCadena || item.cadena === filterCadena;
      const matchMes    = !filterMes    || String(item.mes) === String(filterMes);
      return matchSearch && matchRegion && matchComuna && matchCadena && matchMes;
    });
  }, [alerts, search, filterRegion, filterComuna, filterCadena, filterMes]);

  const criticalAlerts = useMemo(() => filtered.filter(a => a.stock_percentage < 30), [filtered]);

  // Lógica Paginación
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasFilters = search || filterRegion || filterComuna || filterCadena || filterMes;
  const clearFilters = () => {
    setSearch(''); setFilterRegion(''); setFilterComuna(''); setFilterCadena(''); setFilterMes('');
  };

  useEffect(() => { setFilterComuna(''); }, [filterRegion]);

  return (
    <div className="space-y-5">
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
            <input
              type="text"
              placeholder="Buscar producto, marca o EAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-700 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-[#87be00]/30 focus:border-[#87be00] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <FiX size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <FiFilter size={14} className="text-gray-300 mb-2.5 shrink-0" />
            <FilterSelect label="Región" value={filterRegion} onChange={setFilterRegion} options={regions} />
            <FilterSelect label="Comuna" value={filterComuna} onChange={setFilterComuna} options={comunas} />
            <FilterSelect label="Cadena" value={filterCadena} onChange={setFilterCadena} options={cadenas} />
            <FilterSelect label="Mes" value={filterMes} onChange={setFilterMes} options={meses} renderOption={formatMes} />
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-100 hover:border-red-100 transition-all mb-0.5">
                <FiX size={12} /> Limpiar
              </button>
            )}
            <span className="ml-auto text-[9px] font-black text-gray-300 uppercase tracking-widest self-end mb-1">
              {filtered.length} registros
            </span>
          </div>
        </div>
      </div>

      {/* GRÁFICO DIENTE DE SIERRA */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {!selectedItem ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-200 flex items-center justify-center">
              <FiTrendingDown size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              Seleccioná un producto de la tabla para ver su curva de stock
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="px-8 pt-7 pb-0 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                  <FiTrendingDown size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-gray-900 uppercase tracking-wide leading-none">
                    {selectedItem.descripcion_producto || selectedItem.marca}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {selectedItem.local_nombre} · {selectedItem.cadena} · {selectedItem.region}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Stock actual</p>
                  <p className="text-sm font-black text-gray-900">{Number(selectedItem.inventario_unidades).toLocaleString('es-CL')} uds</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">% Stock</p>
                  <p className={`text-sm font-black ${selectedItem.stock_percentage < 15 ? 'text-red-600' : selectedItem.stock_percentage < 30 ? 'text-orange-500' : 'text-green-600'}`}>
                    {selectedItem.stock_percentage}%
                  </p>
                </div>
                <button onClick={() => { setSelectedItem(null); setSawtoothData([]); }} className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-all">
                  <FiX size={14} />
                </button>
              </div>
            </div>
            {sawtoothLoading ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <FiLoader className="animate-spin text-[#87be00]" size={28} />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando evolución...</p>
              </div>
            ) : sawtoothData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center px-8">Solo hay datos de un día de carga.</p>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <SawtoothChart data={sawtoothData} stockMinimo={Math.max(5, Math.round(selectedItem.unidades_vendidas / 10))} titulo="" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* GRID TABLA + ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1 flex items-center gap-2">
            <FiPackage size={14} className="text-[#87be00]" /> Estado de Inventario
          </h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-6">Clic en una fila para ver curva de stock</p>

          {loading ? (
             <div className="flex justify-center py-10"><FiLoader className="animate-spin text-[#87be00]" size={32} /></div>
          ) : filtered.length === 0 ? (
             <div className="text-center py-12"><p className="text-[10px] font-black text-gray-400 uppercase">Sin resultados</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-100 text-[9px] text-gray-400 uppercase tracking-widest">
                    <th className="py-2 text-left">Producto</th>
                    <th className="py-2 text-left">Local</th>
                    <th className="py-2 text-left">Cadena</th>
                    <th className="py-2 text-right">Stock</th>
                    <th className="py-2 text-right">Vendidas</th>
                    <th className="py-2 text-right">% Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, i) => (
                    <tr key={i} onClick={() => handleSelectItem(item)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                      <td className="py-3 font-bold text-gray-700">{item.descripcion_producto || item.marca}</td>
                      <td className="py-3 text-gray-500">{item.local_nombre}</td>
                      <td className="py-3 text-gray-500">{item.cadena}</td>
                      <td className="py-3 text-right font-black">{Number(item.inventario_unidades).toLocaleString('es-CL')}</td>
                      <td className="py-3 text-right text-gray-500">{Number(item.unidades_vendidas).toLocaleString('es-CL')}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-1 rounded-full font-black ${item.stock_percentage < 15 ? 'bg-red-100 text-red-600' : item.stock_percentage < 30 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                          {item.stock_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Controles de Paginación */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages || 1} ({filtered.length} regs)
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ALERTAS DE QUIEBRE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <FiAlertCircle size={14} className="text-red-500" /> Alertas de Quiebre
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
            {criticalAlerts.map((item, i) => (
              <div key={i} onClick={() => handleSelectItem(item)} className="p-3 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-300 cursor-pointer transition-all">
                <p className="text-[10px] font-black text-gray-800 truncate">{item.descripcion_producto || item.marca}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{item.local_nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModule;