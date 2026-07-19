import React, { useState } from 'react';
import Sidebar from '../components/navigater/sidebar';
import { Menu } from 'lucide-react'; // แก้ไข: นำเข้า Menu icon เพื่อป้องกัน Error

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarComponent = Sidebar as React.ComponentType<SidebarProps>;

function Dashboards() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    // แก้ไข: ใช้ React Fragment (<>) ครอบด้านนอกสุดเพื่อให้มีโครงสร้าง Root เดียวกัน
    <>
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        
        {/* ส่ง State การเปิด-ปิด และฟังก์ชันไปจัดการต่อใน Sidebar */}
        <SidebarComponent isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        {/* --- 2. MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Navbar */}
          <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {/* ปุ่มเปิด Sidebar (เห็นเฉพาะบนมือถือ) */}
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-semibold text-gray-800">Organizer Dashboard</h1>
            </div>
            
            {/* Profile Quick View */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">Somchai Dev</p>
                <p className="text-xs text-gray-500">Event Manager</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                SD
              </div>
            </div>
          </header>

          {/* Main Dashboard Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            
            {/* Cards Grid (Responsive 1 to 4 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Total Events</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">12</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Total Tickets Sold</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">1,420</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">฿450,000</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">3</p>
              </div>
            </div>

            {/* Placeholder สำหรับใส่ตารางหรือกราฟในอนาคต */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-96 flex items-center justify-center text-gray-400 border-dashed border-2">
              [ Area สำหรับใส่กราฟสถิติ หรือตารางรายชื่อกิจกรรมล่าสุด ]
            </div>

          </main>
        </div>
      </div>
    </>
  ); // แก้ไข: ปิดวงเล็บให้สมบูรณ์
}

export default Dashboards;