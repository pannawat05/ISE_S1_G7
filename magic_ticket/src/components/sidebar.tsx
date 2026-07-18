import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  LogOut 
} from 'lucide-react'; 

// 1. เปลี่ยนชื่อเป็นตัวใหญ่ Sidebar
export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // เมนูของ Sidebar
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, active: true, link: '/dashboard' },
    { name: 'Events', icon: <Calendar size={20} />, active: false, link: '/dashboard/events' },
    { name: 'Attendees', icon: <Users size={20} />, active: false, link: '/dashboard/attendees' },
    { name: 'Analytics', icon: <BarChart3 size={20} />, active: false, link: '/dashboard/analytics' },
    { name: 'Settings', icon: <Settings size={20} />, active: false, link: '/dashboard/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* --- 1. SIDEBAR สำหรับหน้าจอคอม (Desktop) และมือถือ (Mobile Overlay) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Organizer Hub
          </span>
          {/* ปุ่มปิด Sidebar (เห็นเฉพาะบนมือถือ) */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 px-4 space-y-1">
          {menuItems.map((item, index) => (
            // 2. เปลี่ยนเป็น Link component ของ react-router-dom
            <Link
              key={index}
              to={item.link}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                item.active 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button className="flex items-center space-x-3 w-full px-4 py-3 text-gray-400 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors cursor-pointer">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Backdrop สำหรับปิด Sidebar บนมือถือเมื่อกดพื้นที่ว่าง */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ปุ่มเปิด Hamburger สำหรับหน้าจอมือถือ (เผื่อเอาไว้ใช้เรียก Sidebar) */}
      <div className="p-4 md:hidden fixed top-0 left-0 z-30">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-slate-900 text-white rounded-lg shadow-md cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

    </div>
  ); // 3. เติมวงเล็บและปีกนกปิดให้สมบูรณ์
}