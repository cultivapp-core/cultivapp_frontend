import { useState } from "react";
import { Outlet } from "react-router-dom";
import SupervisorSidebar from "./SuperviorSidebar";

const SupervisorLayout = () => {
  const [isCollapsed, setIsCollapsed] =
    useState(() => {
      return (
        localStorage.getItem(
          "supervisorSidebarCollapsed",
        ) === "true"
      );
    });

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;

      localStorage.setItem(
        "supervisorSidebarCollapsed",
        String(next),
      );

      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-[Outfit]">
      <SupervisorSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="custom-scrollbar h-full flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SupervisorLayout;