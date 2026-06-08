import { useState } from "react";
import { Outlet } from "react-router-dom";
import ViewerSidebar from "./ViewerSidebar";

const ViewerLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-[Outfit]">
      {/* SIDEBAR FIJO - Ahora responde al estado del layout */}
      <aside 
        className={`bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}
      >        
        {/* Pasamos el estado al sidebar */}
        <ViewerSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <Outlet /> 
      </main>
    </div>
  );
};

export default ViewerLayout;