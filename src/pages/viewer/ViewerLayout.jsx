import { useState } from "react";
import { Outlet } from "react-router-dom";

import ViewerSidebar from "./ViewerSidebar";

const ViewerLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] font-[Outfit]">
      <ViewerSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
        <Outlet />
      </main>
    </div>
  );
};

export default ViewerLayout;
