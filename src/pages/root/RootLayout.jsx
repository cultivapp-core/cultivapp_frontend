import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const RootLayout = () => {
  const [isCollapsed, setIsCollapsed] =
    useState(false);

  return (
    <div className="h-screen flex bg-[#F8FAFC] font-[Outfit] overflow-hidden">
      <aside
        className={`hidden md:block bg-white border-r border-gray-100 shrink-0 transition-[width] duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </aside>

      <div className="md:hidden">
        <Sidebar
          isCollapsed={false}
          setIsCollapsed={setIsCollapsed}
        />
      </div>

      <main className="flex-1 w-full min-w-0 overflow-y-auto custom-scrollbar">
        <div className="min-h-full pt-20 md:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default RootLayout;