import { useState, useEffect, useMemo } from "react"
import { useNavigate, Outlet, useLocation } from "react-router-dom"
import { FiMenu, FiLogOut, FiActivity } from "react-icons/fi"
import LocalesMap from "../../components/LocalesMap"
import api from "../../api/apiClient"

// 🔔 CONTEXTOS
import Notifications from "../../components/Notifications"
import { useAuth } from "../../context/AuthContext"
import { useNotificationContext } from "../../context/NotificationContext" // ✅ Importación clave

import { Building2, Store, Users, MapPin, Globe } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const RootDashboard = () => {
  const { user } = useAuth() 
  
  // 🛰️ CONSUMO DEL CONTEXTO GLOBAL (Realtime vive aquí)
  const { 
    notifications, 
    unreadCount, 
    onMarkRead, 
    loading: loadingNotifs 
  } = useNotificationContext()

  const [locales, setLocales] = useState([])
  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedLocalId, setSelectedLocalId] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()

  const isDashboard = location.pathname.endsWith("/root/analytics")
  const isLocales = location.pathname.endsWith("/root/locales")

  /* =========================================
     CARGA DE DATOS (EXCEPTO NOTIFICACIONES)
  ========================================= */
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Ya no pedimos /notifications aquí porque el Contexto lo hace por nosotros
      const [localesData, companiesData, usersData] = await Promise.all([
        api.get("/locales").catch(err => { console.error("Error Locales:", err); return []; }),
        api.get("/companies").catch(err => { console.error("Error Companies:", err); return []; }),
        api.get("/users").catch(err => { console.error("Error Users:", err); return []; })
      ])
      
      setLocales(localesData || [])
      setCompanies(companiesData || [])
      setUsers(usersData || [])
    } catch (error) {
      const errorMsg = error?.message || "Error de conexión";
      console.error("❌ Error General Dashboard:", errorMsg);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  /* =========================================
     FILTROS Y LÓGICA DE NEGOCIO
  ========================================= */
  const filteredLocales = useMemo(() => {
    return selectedCompany
      ? locales.filter(l => String(l.company_id) === String(selectedCompany))
      : locales
  }, [selectedCompany, locales])

  const filteredUsers = useMemo(() => {
    return selectedCompany
      ? users.filter(u => String(u.company_id) === String(selectedCompany))
      : users
  }, [selectedCompany, users])

  const selectedLocal = useMemo(() => {
    return filteredLocales.find(l => l.id === selectedLocalId)
  }, [selectedLocalId, filteredLocales])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/")
  }

  const stats = [
    { label: "Empresas", value: selectedCompany ? 1 : companies.length, icon: <Building2 size={20}/>, color: "text-blue-600" },
    { label: "Total Locales", value: filteredLocales.length, icon: <Store size={20}/>, color: "text-[#87be00]" },
    { label: "Usuarios", value: filteredUsers.length, icon: <Users size={20}/>, color: "text-purple-600" },
    { label: "Activos Ahora", value: filteredLocales.filter(l => l.is_active).length, icon: <MapPin size={20}/>, color: "text-orange-600" }
  ]

  const chartData = useMemo(() => {
    const counts = filteredLocales.reduce((acc, local) => {
      const region = local.region || "Sin región"
      acc[region] = (acc[region] || 0) + 1
      return acc
    }, {})
    return Object.keys(counts).map(name => ({ name, locales: counts[name] }))
  }, [filteredLocales])

  if (loading && !locales.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-[Outfit]">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
           <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">Sincronizando Red Global...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-[Outfit]">

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOPBAR */}
        <div className="bg-white border-b border-gray-50 px-10 py-6 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-50 rounded-2xl text-gray-800">
                 <Globe size={20} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Panel Central</h1>
                <span className="text-[10px] font-bold text-[#87be00] uppercase tracking-widest mt-1 italic">Infraestructura de Sistema</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* 🔔 AHORA USA LA DATA DEL CONTEXTO GLOBAL */}
            <Notifications 
              notifications={notifications} 
              unreadCount={unreadCount} 
              onMarkAsRead={onMarkRead} 
            />
            
            <div className="hidden md:flex items-center gap-4 pl-8 border-l border-gray-100">
              <div className="text-right">
                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tighter italic leading-none mb-1">{user?.name || 'Root User'}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Super Administrador</p>
              </div>
              <div className="h-12 w-12 rounded-[1.2rem] bg-gray-900 flex items-center justify-center text-white font-black text-xs border-2 border-white shadow-xl shadow-gray-200">
                {user?.name?.substring(0, 2).toUpperCase() || 'RT'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar pb-10">
          
          {(isDashboard || isLocales) && (
            <div className="px-10 pt-10 space-y-10">
              {/* FILTRO SUPERIOR */}
              <div className="bg-white border border-gray-50 rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-gray-200/40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#87be00]/10 rounded-2xl text-[#87be00]">
                        <Building2 size={24}/>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Seleccionar Cliente</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase italic">Aislar datos de empresa específica</p>
                    </div>
                </div>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all min-w-[320px] shadow-inner"
                >
                  <option value="">Todas las empresas de la red</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* STATS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center gap-6 shadow-xl shadow-gray-200/30 hover:-translate-y-1 transition-all group">
                    <div className={`p-5 rounded-[1.5rem] bg-gray-50 ${s.color} transition-all group-hover:bg-white shadow-inner`}>{s.icon}</div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{s.label}</p>
                      <p className="text-3xl font-black text-gray-900 tracking-tighter italic">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* MONITOR MAPA & CHARTS */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
                <div className="xl:col-span-2 bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-200/40">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Densidad Regional</h3>
                    <FiActivity className="text-[#87be00]" />
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" fontSize={8} fontWeight={900} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '25px', border: 'none'}} />
                      <Bar dataKey="locales" fill="#87be00" radius={[10, 10, 10, 10]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="xl:col-span-3 bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-200/40">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Cobertura Real</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar space-y-3">
                      {filteredLocales.map(local => (
                        <button
                          key={local.id}
                          onClick={() => setSelectedLocalId(local.id)}
                          className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all ${
                            selectedLocalId === local.id ? "bg-gray-900 border-gray-900 shadow-2xl" : "bg-white border-gray-50"
                          }`}
                        >
                          <p className={`text-xs font-black uppercase tracking-tighter ${selectedLocalId === local.id ? "text-[#87be00]" : "text-gray-800"}`}>
                            {local.cadena}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">{local.direccion}</p>
                        </button>
                      ))}
                    </div>
                    <div className="lg:col-span-7 h-[450px] rounded-[2.5rem] overflow-hidden bg-gray-50">
                      <LocalesMap locales={filteredLocales} selectedLocal={selectedLocal} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-10 py-5">
            <Outlet context={{ fetchData, companies, users }} />
          </div>
        </div>
      </div>
    </div>
  )
}
export default RootDashboard;