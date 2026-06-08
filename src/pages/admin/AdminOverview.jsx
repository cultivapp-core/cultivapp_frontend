import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import api from "../../api/apiClient" 
import { FiUsers, FiLayers, FiActivity, FiCheckCircle, FiMapPin } from "react-icons/fi"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import LocalesMap from "../../components/LocalesMap"

const AdminOverview = () => {
  const [stats, setStats] = useState(null)
  const [locales, setLocales] = useState([])
  const [selectedLocalId, setSelectedLocalId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const user = JSON.parse(localStorage.getItem("user"))
      const companyId = user?.company_id

      if (!companyId) throw new Error("Empresa no definida")

      // Aseguramos que siempre retornen algo, incluso si falla la API
      const [statsData, localesData] = await Promise.all([
        api.get(`users/company/${companyId}/stats`).catch(() => null),
        api.get(`/locales?company_id=${companyId}`).catch(() => [])
      ])

      setStats(statsData)
      setLocales(Array.isArray(localesData) ? localesData : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const selectedLocal = useMemo(() => {
    return locales?.find(l => l.id === selectedLocalId) ?? null
  }, [selectedLocalId, locales])

  const chartData = useMemo(() => {
    if (!locales || locales.length === 0) return [];
    const counts = locales.reduce((acc, local) => {
      const label = local.cadena?.split("-")[0]?.trim() || "Puntos"
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})
    return Object.keys(counts).map(name => ({ name, locales: counts[name] }))
  }, [locales])

  // --- SAFE CALCULATIONS ---
  const safeNumber = (value) => parseInt(value ?? 0)
  
  const statsCounts = stats?.counts ?? {};
  const statsLimits = stats?.limits ?? {};

  const usedSupervisors = safeNumber(statsCounts.SUPERVISOR)
  const usedUsers = safeNumber(statsCounts.USUARIO)
  const usedView = safeNumber(statsCounts.VIEW)

  const maxSupervisors = safeNumber(statsLimits.max_supervisors)
  const maxUsers = safeNumber(statsLimits.max_users)
  const maxView = safeNumber(statsLimits.max_view)
  
  // Total de locales seguro
  const totalLocales = locales?.length ?? 0;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 font-[Outfit]">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse italic">
          Sincronizando Métricas...
        </p>
      </div>
    )
  }

  if (error) return <p className="p-8 text-red-500 font-black font-[Outfit] uppercase text-xs tracking-widest">{error}</p>

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-[Outfit]">
      
      <div className="px-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]">
            <FiLayers size={20} />
          </div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">
            Resumen Empresa
          </h2>
        </div>
        <p className="text-[10px] font-bold text-[#87be00] uppercase tracking-[0.3em] ml-12">
          Uso actual de cuentas y locales configurados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        <StatCard 
          label="Supervisores" 
          used={usedSupervisors}
          max={maxSupervisors}
          icon={<FiUsers size={24} />} 
          trend={usedSupervisors >= maxSupervisors && maxSupervisors > 0 ? "LÍMITE" : "DISPONIBLE"}
          color={usedSupervisors >= maxSupervisors && maxSupervisors > 0 ? "text-red-500" : "text-gray-800"}
        />

        <StatCard 
          label="Mercaderistas" 
          used={usedUsers}
          max={maxUsers}
          icon={<FiUsers size={24} />} 
          trend={usedUsers >= maxUsers && maxUsers > 0 ? "CRÍTICO" : "EN RUTA"}
          color={usedUsers >= maxUsers && maxUsers > 0 ? "text-red-500" : "text-gray-800"}
        />

        <StatCard 
          label="Solo Vista" 
          used={usedView}
          max={maxView}
          icon={<FiCheckCircle size={24} />} 
          trend="AUDITORÍA"
          color="text-gray-800"
        />

        <StatCard 
          label="Total Locales" 
          value={totalLocales}
          icon={<FiMapPin size={24} />} 
          trend="SALAS"
          color="text-[#87be00]"
          isGlobalCard={true}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 px-2">
        <div className="xl:col-span-2 bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-200/40 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Volumen por Canal</h3>
            <FiActivity className="text-[#87be00]" />
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '25px', border: 'none', fontFamily: 'Outfit', fontSize: '11px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="locales" fill="#87be00" radius={[10, 10, 10, 10]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-3 bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-200/40">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Ubicación de Puntos de Venta</h3>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 max-h-[380px] overflow-y-auto pr-4 custom-scrollbar space-y-3">
              {locales.map(local => (
                <button
                  key={local.id}
                  onClick={() => setSelectedLocalId(local.id)}
                  className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all ${
                    selectedLocalId === local.id ? "bg-gray-900 border-gray-900 shadow-2xl scale-[0.99]" : "bg-white border-gray-50 hover:border-gray-200"
                  }`}
                >
                  <p className={`text-xs font-black uppercase tracking-tighter ${selectedLocalId === local.id ? "text-[#87be00]" : "text-gray-800"}`}>
                    {local.cadena}
                  </p>
                  <p className="text-[10px] font-bold mt-1 text-gray-400 truncate">{local.direccion}</p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-7 h-[380px] rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
              <LocalesMap locales={locales} selectedLocal={selectedLocal} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ label, used, max, value, icon, trend, color, isGlobalCard = false }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-50 flex flex-col justify-between group hover:shadow-2xl transition-all h-full min-h-[240px]">
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">{icon}</div>
      <span className={`text-[9px] font-black uppercase tracking-widest italic ${trend === 'LÍMITE' || trend === 'CRÍTICO' ? 'text-red-500 animate-pulse font-extrabold' : 'text-gray-400'}`}>{trend}</span>
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-5xl font-black tracking-tighter italic leading-none ${color}`}>
        {isGlobalCard ? value : <>{used}<span className="text-xl font-normal text-gray-300 not-italic mx-1">/</span><span className="text-3xl text-gray-400 font-bold">{max}</span></>}
      </p>
    </div>
    <div className="mt-6 h-1 w-12 bg-gray-100 rounded-full" />
  </div>
)

export default AdminOverview;