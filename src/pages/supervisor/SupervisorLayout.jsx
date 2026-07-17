import { Outlet } from "react-router-dom";
import SupervisorSidebar from "./SuperviorSidebar"; 

const SupervisorLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/50 font-[Outfit]">
      
      {/* SIDEBAR DE SUPERVISOR AUTOMÁTICO */}
      <SupervisorSidebar />

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col">
        <Outlet />
      </main>
      
    </div>
  );
};

export default SupervisorLayout;