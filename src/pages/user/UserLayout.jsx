import { Outlet } from "react-router-dom";
import UserSidebar from "../..UserSidebar";
import Topbar from "../Topbar"; // ⚠️ Ajusta esta ruta de importación según dónde esté tu archivo Topbar.jsx

const UserLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/50 font-[Outfit]">
      
      {/* SIDEBAR DE MERCADERISTA AUTOMÁTICO */}
      <UserSidebar />

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col">
        
        {/* BARRA SUPERIOR (TOPBAR) */}
        <Topbar />

        {/* CONTENIDO DE LAS PÁGINAS (OUTLET) */}
        <div className="flex-1 flex flex-col relative">
          <Outlet />
        </div>
        
      </main>
      
    </div>
  );
};

export default UserLayout;