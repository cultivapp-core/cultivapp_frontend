import { Outlet } from "react-router-dom";
import RegionalAdminSidebar from "./RegionalAdminSidebar";

const RegionalAdminLayout = () => {
  return (
    <div className="h-screen flex bg-[#F8FAFC] font-[Outfit] overflow-hidden">
      <RegionalAdminSidebar />

      {/* Contenido principal */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto p-4 pt-20 sm:p-6 sm:pt-20 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default RegionalAdminLayout;
