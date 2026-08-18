import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiX, FiCheck, FiSearch, FiUsers, FiMapPin, FiLoader, FiMinusCircle } from 'react-icons/fi';
import api from '../../api/apiClient';
import toast from 'react-hot-toast';

// 🚩 Se adapta el prop para recibir cualquier usuario gestor (VIEW o SUPERVISOR)
const AssignUsersModal = ({ targetUser, viewUser, onClose, onRefresh }) => {
  // Mantenemos compatibilidad por si el padre aún manda 'viewUser'
  const managerUser = targetUser || viewUser;

  const [allUsers, setAllUsers] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [allLocales, setAllLocales] = useState([]);
  const [assignedLocaleIds, setAssignedLocaleIds] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🚩 LÓGICA DE JERARQUÍA: Determinar qué rol vamos a buscar según el rol del gestor
  const isViewer = managerUser.role === 'VIEW' || managerUser.role === 'VIEWER';
  const isSupervisor = managerUser.role === 'SUPERVISOR';
  const isRegionalAdmin = managerUser.role === 'ADMIN_REGIONAL';
  
  // ADMIN_REGIONAL gestiona exclusivamente MERCADERISTA_REGIONAL.
  const targetRoles = useMemo(() => (
    isViewer
      ? ['SUPERVISOR']
      : isRegionalAdmin
        ? ['MERCADERISTA_REGIONAL']
        : ['USUARIO']
  ), [isViewer, isRegionalAdmin]);
  const targetLabel = isViewer
    ? 'Supervisores'
    : isRegionalAdmin
      ? 'Usuarios regionales'
      : 'Usuarios';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Los ADMIN_REGIONAL reciben además la cobertura de locales.
      const requests = [
        api.get('/users'),
        isRegionalAdmin
          ? api.get(`/regional-admins/${managerUser.id}/users`)
          : api.get(`/users/${managerUser.id}/assigned-users`),
      ];

      if (isRegionalAdmin) {
        requests.push(
          api.get('/locales'),
          api.get(`/regional-admins/${managerUser.id}/locales`),
        );
      }

      const results = await Promise.allSettled(requests);
      if (results[0].status === 'rejected') throw results[0].reason;

      const usersRes = results[0].value;
      const onlyUsers = Array.isArray(usersRes)
        ? usersRes.filter(u => 
            targetRoles.includes(String(u.role || '').toUpperCase()) &&
            u.is_active && 
            u.id !== managerUser.id // Evita que el gestor se asigne a sí mismo
          )
        : [];

      const currentRes = results[1].status === 'fulfilled' ? results[1].value : [];
      const currentIds = Array.isArray(currentRes) ? currentRes.map(u => u.id) : [];

      setAllUsers(onlyUsers);
      setAssignedIds(currentIds);

      if (isRegionalAdmin) {
        const localesRes = results[2].status === 'fulfilled' ? results[2].value : [];
        const currentLocalesRes = results[3].status === 'fulfilled' ? results[3].value : [];
        setAllLocales(Array.isArray(localesRes) ? localesRes : (localesRes?.data || []));
        setAssignedLocaleIds(
          Array.isArray(currentLocalesRes) ? currentLocalesRes.map(local => local.id) : []
        );
      }
    } catch (error) {
      console.error('Error al cargar asignaciones:', error);
      toast.error(`Error al cargar la lista de ${targetLabel.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [managerUser?.id, isRegionalAdmin, targetLabel, targetRoles]);

  const toggleUser = (id) => {
    setAssignedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (managerUser?.id) {
      fetchData();
    }
  }, [managerUser?.id, fetchData]);

  const toggleLocale = (id) => {
    setAssignedLocaleIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const requests = [
        isRegionalAdmin
          ? api.put(`/regional-admins/${managerUser.id}/users`, { userIds: assignedIds })
          : api.post(`/users/${managerUser.id}/assign-users`, { userIds: assignedIds }),
      ];

      if (isRegionalAdmin) {
        requests.push(
          api.put(`/regional-admins/${managerUser.id}/locales`, {
            localeIds: assignedLocaleIds,
          })
        );
      }

      await Promise.all(requests);
      toast.success(
        isRegionalAdmin
          ? 'Usuarios y locales asignados con éxito'
          : `${targetLabel} asignados al ${managerUser.role} con éxito`
      );
      await onRefresh?.();
      onClose?.();
    } catch (error) {
      console.error('Error al guardar asignaciones:', error);
      toast.error("Error al guardar la asignación");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return allUsers
      .filter(u => {
        const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
        const email = (u.email || "").toLowerCase();
        return fullName.includes(search) || email.includes(search);
      })
      .sort((a, b) => {
        const aSelected = assignedIds.includes(a.id);
        const bSelected = assignedIds.includes(b.id);
        return bSelected - aSelected;
      });
  }, [allUsers, assignedIds, searchTerm]);

  const filteredLocales = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return allLocales
      .filter(local => {
        const text = `${local.cadena || ''} ${local.nombre_local || ''} ${local.direccion || ''} ${local.codigo_local || ''} ${local.comuna_name || local.comuna || ''}`.toLowerCase();
        return text.includes(search);
      })
      .sort((a, b) => {
        const aSelected = assignedLocaleIds.includes(a.id);
        const bSelected = assignedLocaleIds.includes(b.id);
        return bSelected - aSelected;
      });
  }, [allLocales, assignedLocaleIds, searchTerm]);

  const isLocalesTab = isRegionalAdmin && activeTab === 'locales';
  const assignedCount = isLocalesTab ? assignedLocaleIds.length : assignedIds.length;

  // Color dinámico según el rol del gestor
  const isGreenTheme = isSupervisor || isRegionalAdmin;
  const themeColor = isGreenTheme ? 'text-[#87be00]' : 'text-blue-400';
  const themeBg = isGreenTheme ? 'bg-[#87be00]' : 'bg-blue-500';
  const themeHoverBg = isGreenTheme ? 'hover:bg-[#75a600]' : 'hover:bg-blue-600';
  const themeRing = isGreenTheme ? 'ring-[#87be00]/30' : 'ring-blue-200';
  const themeBorder = isGreenTheme ? 'border-[#87be00]' : 'border-blue-400';
  const themeLightBg = isGreenTheme ? 'bg-[#87be00]/5' : 'bg-blue-50/50';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">

        {/* HEADER */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-900 text-white">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest italic mb-1 ${themeColor}`}>
              {isRegionalAdmin
                ? 'Asignación regional de usuarios y locales'
                : `Asignación de ${targetLabel}`} • Perfil {managerUser.role || 'Gestor'}
            </p>
            <h2 className="text-2xl font-black italic uppercase leading-none">
              {managerUser.first_name} {managerUser.last_name}
            </h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-colors group">
            <FiX size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* PESTAÑAS EXCLUSIVAS PARA ADMIN_REGIONAL */}
        {isRegionalAdmin && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-b border-gray-100">
            <button
              type="button"
              onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'users'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-400 hover:text-gray-700'
              }`}
            >
              <FiUsers size={15} /> Usuarios ({assignedIds.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('locales'); setSearchTerm(''); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'locales'
                  ? 'bg-[#87be00] text-white shadow-md'
                  : 'bg-white text-gray-400 hover:text-gray-700'
              }`}
            >
              <FiMapPin size={15} /> Locales ({assignedLocaleIds.length})
            </button>
          </div>
        )}

        {/* BUSCADOR */}
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={
                isLocalesTab
                  ? 'Buscar local, dirección, comuna o código...'
                  : `Buscar ${targetLabel.toLowerCase()}...`
              }
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#87be00]/30 text-sm font-bold shadow-inner outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-right shrink-0 w-full sm:w-auto flex justify-between sm:block px-2 sm:px-0">
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none sm:mb-1">Asignados</p>
            <p className={`text-xl font-black italic leading-none ${themeColor}`}>{assignedCount}</p>
          </div>
        </div>

        {/* LISTADO */}
        <div className="max-h-[400px] overflow-y-auto p-6 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center opacity-20">
              <FiLoader className="animate-spin mb-2" size={30} />
              <p className="text-[10px] font-black uppercase tracking-widest">Cargando {targetLabel.toLowerCase()}...</p>
            </div>
          ) : isLocalesTab && filteredLocales.length === 0 ? (
            <div className="col-span-full py-16 text-center opacity-40">
              <FiMapPin size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="italic text-sm font-bold uppercase tracking-tighter">No se encontraron locales</p>
            </div>
          ) : !isLocalesTab && filteredUsers.length === 0 ? (
            <div className="col-span-full py-16 text-center opacity-40">
              <FiUsers size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="italic text-sm font-bold uppercase tracking-tighter">No se encontraron {targetLabel.toLowerCase()}</p>
            </div>
          ) : isLocalesTab ? (
            filteredLocales.map(local => {
              const isAssigned = assignedLocaleIds.includes(local.id);
              const comuna = local.comuna_name || local.comuna;
              return (
                <button
                  key={local.id}
                  type="button"
                  onClick={() => toggleLocale(local.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    isAssigned
                      ? 'border-[#87be00] bg-[#87be00]/5 shadow-sm ring-1 ring-[#87be00]/30'
                      : 'border-gray-100 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isAssigned ? 'bg-[#87be00] text-white shadow-md' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FiMapPin size={17} />
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase leading-none mb-1 italic text-gray-800 truncate">
                      {local.cadena || local.nombre_local || 'Local'}
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 truncate">
                      {local.direccion || 'Sin dirección'}{comuna ? `, ${comuna}` : ''}
                    </p>
                    <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                      Código: {local.codigo_local || 'S/N'}
                    </p>
                  </div>
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                    isAssigned ? 'bg-[#87be00] border-[#87be00]' : 'border-gray-200'
                  }`}>
                    {isAssigned
                      ? <FiCheck className="text-white" size={14} />
                      : <div className="w-1 h-1 bg-gray-200 rounded-full" />}
                  </div>
                </button>
              );
            })
          ) : (
            filteredUsers.map(user => {
              const isAssigned = assignedIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    isAssigned
                      ? `${themeBorder} ${themeLightBg} shadow-sm ring-1 ${themeRing}`
                      : 'border-gray-100 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar inicial */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                    isAssigned ? `${themeBg} text-white shadow-md shadow-black/10` : 'bg-gray-100 text-gray-400'
                  }`}>
                    {user.first_name?.charAt(0)}
                  </div>

                  <div className="overflow-hidden flex-1">
                    <p className={`text-[11px] font-black uppercase leading-none mb-1 italic ${isAssigned ? 'text-gray-900' : 'text-gray-600'}`}>
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 truncate">{user.email}</p>
                  </div>

                  {/* Checkbox visual */}
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                    isAssigned ? `${themeBg} ${themeBorder} scale-110 shadow-md` : 'border-gray-200'
                  }`}>
                    {isAssigned
                      ? <FiCheck className="text-white" size={14} />
                      : <div className="w-1 h-1 bg-gray-200 rounded-full" />
                    }
                  </div>

                  {/* Indicador hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-6">
                    {isAssigned ? (
                      <FiMinusCircle className="text-red-400" size={16} />
                    ) : (
                      <FiCheck className={themeColor} size={16} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-white hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 ${themeBg} text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${themeHoverBg} transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiCheck size={16} />}
            Guardar Asignación
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignUsersModal;
