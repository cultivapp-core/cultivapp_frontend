import {
  useEffect,
  useState,
} from "react";
import { Outlet } from "react-router-dom";

import ViewerSidebar from "./ViewerSidebar";

const COLLAPSE_STORAGE_KEY =
  "cultivapp-viewer-sidebar-collapsed";

const ViewerLayout = () => {
  const [
    isCollapsed,
    setIsCollapsed,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return false;
    }

    return (
      window.localStorage.getItem(
        COLLAPSE_STORAGE_KEY,
      ) === "true"
    );
  });

  useEffect(() => {
    window.localStorage.setItem(
      COLLAPSE_STORAGE_KEY,
      String(isCollapsed),
    );
  }, [isCollapsed]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 font-[Outfit] text-slate-900">
      <ViewerSidebar
        isCollapsed={
          isCollapsed
        }
        setIsCollapsed={
          setIsCollapsed
        }
      />

      <main
        id="viewer-main-content"
        className="custom-scrollbar relative h-dvh min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default ViewerLayout;