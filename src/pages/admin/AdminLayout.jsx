import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    // 'flex' aquí es seguro, pero el aside hijo controlará su visibilidad
    <div className="h-screen flex bg-[#F8FAFC] font-[Outfit] overflow-hidden">
      
      {/* SIDEBAR WRAPPER */}
      {/* md:block hace que en móvil no ocupe espacio físico, evitando el gap */}
      <aside className={`hidden md:block bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </aside>

      {/* RENDERIZADO MÓVIL: El Sidebar también debe renderizarse fuera del aside para el modo mobile drawer */}
      <div className="md:hidden">
         <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <main className="flex-1 w-full min-w-0 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-[1600px] mx-auto">
           <Outlet /> 
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;