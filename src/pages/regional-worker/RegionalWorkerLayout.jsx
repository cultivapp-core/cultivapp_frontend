import { Outlet } from "react-router-dom";
import RegionalWorkerSidebar from "./RegionalWorkerSidebar";
import RegionalWorkerTopBar from "./RegionalWorkerTopBar";

const RegionalWorkerLayout = () => {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-100 font-[Outfit] text-slate-900">
      <RegionalWorkerSidebar />

      <main className="relative flex h-dvh min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-slate-50 shadow-[0_0_40px_rgba(15,23,42,0.08)] md:max-w-none md:shadow-none">
          <RegionalWorkerTopBar />

          <div id="regional-worker-main-content" className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            <div className="min-h-full w-full">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegionalWorkerLayout;
