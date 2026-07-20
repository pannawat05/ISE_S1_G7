import { useState } from "react";
import Sidebar from "../components/navigater/sidebar";
import { Menu } from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarComponent = Sidebar as React.ComponentType<SidebarProps>;

function Dashboards() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="mt-dashboard-shell">
      <SidebarComponent isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="mt-dashboard-header">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white focus:outline-none cursor-pointer"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-semibold text-white">
              Organizer Dashboard
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">Somchai Dev</p>
              <p className="text-xs text-gray-500">Event Manager</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold border border-white/10">
              SD
            </div>
          </div>
        </header>

        <main className="mt-dashboard-main">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="mt-stat-card">
              <p className="text-sm text-gray-500 font-medium">Total Events</p>
              <p className="text-3xl font-bold text-white mt-1">12</p>
            </div>
            <div className="mt-stat-card">
              <p className="text-sm text-gray-500 font-medium">Total Tickets Sold</p>
              <p className="text-3xl font-bold text-white mt-1">1,420</p>
            </div>
            <div className="mt-stat-card">
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">฿450,000</p>
            </div>
            <div className="mt-stat-card">
              <p className="text-sm text-gray-500 font-medium">Active Campaigns</p>
              <p className="text-3xl font-bold text-white mt-1">3</p>
            </div>
          </div>

          <div className="mt-surface p-6 h-96 flex items-center justify-center text-gray-500 border-dashed">
            [ Area สำหรับใส่กราฟสถิติ หรือตารางรายชื่อกิจกรรมล่าสุด ]
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboards;
