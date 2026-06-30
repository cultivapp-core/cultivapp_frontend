import { useState } from "react";
import { Outlet } from "react-router-dom";
import ViewerSidebar from "./ViewerSidebar";

const ViewerLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    // 🚩 h-screen y flex eliminan los saltos de diseño y mantienen todo en un solo bloque
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] font-[Outfit]">
      
      {/* 🚩 El Sidebar ahora es un hijo directo del flex, NO está envuelto en div adicionales */}
      <ViewerSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* 🚩 El main toma el resto del espacio (flex-1). 
          Al ser flex-1 y tener h-full, se ajustará automáticamente 
          al lado del sidebar sin importar si es desktop o móvil.
      */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col p-4 md:p-10">
        <Outlet /> 
      </main>
      
    </div>
  );
};

export default ViewerLayout;