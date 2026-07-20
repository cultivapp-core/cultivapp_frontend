import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-[#F8FAFC] font-[Outfit] overflow-hidden">
      {/* Sidebar de escritorio */}
      <aside
        className={`hidden md:block bg-white border-r border-gray-100 shrink-0 transition-[width] duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <AdminSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </aside>

      {/* Sidebar móvil tipo drawer */}
      <div className="md:hidden">
        <AdminSidebar
          isCollapsed={false}
          setIsCollapsed={setIsCollapsed}
        />
      </div>

      {/* Contenido principal */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto p-4 pt-20 sm:p-6 sm:pt-20 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;