import { useEffect, useState } from "react"
import api from "../../api/apiClient" 
import { FiUsers, FiActivity, FiGlobe, FiBriefcase } from "react-icons/fi"

const Analytics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0
  })

  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const [users, companies] = await Promise.all([
        api.get("/users"),
        api.get("/companies")
      ])
      const userData = users.data || users;
      const compData = companies.data || companies;

      if (Array.isArray(userData) && Array.isArray(compData)) {
        const activeUsers = userData.filter(u => u.is_active).length
        const activeCompanies = compData.filter(c => c.is_active).length
        setStats({
          totalUsers: userData.length,
          activeUsers,
          totalCompanies: compData.length,
          activeCompanies
        })
      }
    } catch (error) {
      console.error("❌ Error cargando analytics:", error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4 font-[Outfit]">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse italic">Sincronizando métricas...</p>
      </div>
    )
  }

  return (
    // SE ELIMINÓ 'pb-10' y 'space-y-8' global para dar control total a los hijos
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 font-[Outfit]">
      
      {/* HEADER: Alinear con el Sidebar */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 md:px-8 md:py-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]">
            <FiGlobe size={20} />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">
            Dashboard Global
          </h2>
        </div>
        <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] ml-12">
          Monitor de infraestructura Cultivapp
        </p>
      </div>

      {/* CONTENIDO: Padding controlado aquí para que las tarjetas respiren */}
      <div className="p-4 md:p-8 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Empresas" value={stats.totalCompanies} icon={<FiBriefcase size={20} />} trend={`${stats.activeCompanies} activas`} color="text-gray-800" />
          <StatCard label="Usuarios" value={stats.totalUsers} icon={<FiUsers size={20} />} trend={`${stats.activeUsers} activos`} color="text-gray-800" />
          <StatCard label="Actividad Red" value={`${((stats.activeCompanies / stats.totalCompanies) * 100 || 0).toFixed(0)}%`} icon={<FiActivity size={20} />} trend="Operativo" color="text-[#87be00]" />
          <StatCard label="En Terreno" value={stats.activeUsers} icon={<FiActivity size={20} />} trend="Real Time" color="text-[#87be00]" />
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, icon, trend, color }) => (
  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-lg transition-all h-full">
    <div className="flex justify-between items-start mb-6">
      <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
        {icon}
      </div>
      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">{trend}</span>
    </div>
    
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-4xl font-black tracking-tighter italic leading-none ${color}`}>
        {value}
      </p>
    </div>
    <div className="mt-6 h-1 w-10 bg-gray-100 rounded-full" />
  </div>
)

export default Analytics;