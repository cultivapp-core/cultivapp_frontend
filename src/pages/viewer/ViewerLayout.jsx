import { Outlet } from "react-router-dom";
import ViewerSidebar from "./ViewerSidebar"; // Asegúrate que esta ruta sea correcta

const ViewerLayout = () => {
  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-[Outfit]">
      {/* SIDEBAR FIJO */}
      <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-8">
           <h2 className="text-2xl font-black text-[#87be00] tracking-tighter italic">
             Cultiva<span className="text-gray-900">App</span>
           </h2>
           <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mt-1">Viewer Panel</span>
        </div>
        <ViewerSidebar />
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <Outlet /> 
      </main>
    </div>
  );
};

export default ViewerLayout;