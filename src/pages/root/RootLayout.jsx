import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar"; // Verifica tu ruta

const RootLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/50 font-[Outfit]">
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      {/* Se eliminó el padding (p-8) y el mx-auto para que la cabecera se una al menú */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col">
        <Outlet />
      </main>
      
    </div>
  );
};

export default RootLayout;