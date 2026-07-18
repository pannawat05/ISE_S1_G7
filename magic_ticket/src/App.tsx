import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './page/home'
import SignUp from './page/signup'
import Signin from './page/signin'
import OTP from './page/otp'
import OrganizeRegis from './page/organize_regis'

// --- Component หลักแอปพลิเคชัน ---
function App() {
  const [isDarkMode, setIsDarkMode] = useState(true); // ตั้งต้นเป็น Dark Mode

  // จัดการเพิ่ม/ลด class "dark" ที่ตัว <html> element
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <Router>
      {/* เพิ่ม transition-colors เพื่อให้เวลาเปลี่ยนธีม สีพื้นหลังจะค่อยๆ คลี่เปลี่ยนอย่างสมูท */}
      <div className="min-h-screen bg-[#f5f3ff] text-purple-950 dark:bg-[#0f0c1b] dark:text-[#e0d9f6] transition-colors duration-500">
        
        {/* Navbar (สลับธีมได้สมบูรณ์แบบ) */}
        <nav className="sticky top-0 z-50 bg-white/75 dark:bg-[#0f0c1b]/75 backdrop-blur-md border-b border-purple-100 dark:border-[#31255c]/50 px-6 py-4 transition-colors duration-500">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:opacity-90 transition-opacity">
              <span>🔮</span> Magic Ticket
            </Link>

            {/* MAIN NAVIGATION (Center/Left) */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="group relative text-purple-900 dark:text-[#e0d9f6] hover:text-purple-600 dark:hover:text-purple-300 transition-colors font-medium text-sm tracking-wide">
                หน้าแรก
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-purple-600 dark:bg-purple-400 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link to="/my-tickets" className="group relative text-purple-900 dark:text-[#e0d9f6] hover:text-purple-600 dark:hover:text-purple-300 transition-colors font-medium text-sm tracking-wide">
                ตั๋วของฉัน
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-purple-600 dark:bg-purple-400 transition-all duration-300 group-hover:w-full"></span>
              </Link>

              {/* ปุ่มสลับโหมดดาร์ก/ไลท์ */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl border border-purple-200 dark:border-[#31255c]/50 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 transition-all duration-300 text-sm shadow-sm flex items-center gap-2"
                aria-label="Toggle Theme"
              >
                {isDarkMode ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}
              </button>
            </div>

            {/* AUTH BUTTONS (Right Side) */}
            <div className="flex items-center gap-4">
              {/* Sign In - Outline Button */}
              <Link 
                to="/signin" 
                className="text-purple-900 dark:text-[#e0d9f6] hover:text-purple-600 dark:hover:text-white border border-purple-300 dark:border-purple-500/30 hover:border-purple-600 dark:hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
              >
                เข้าสู่ระบบ
              </Link>
              
              {/* Sign Up - Solid Gradient Button */}
              <Link 
                to="/signup" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md dark:shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:-translate-y-0.5 transition-all duration-300"
              >
                สมัครสมาชิก
              </Link>
            </div>

          </div>
        </nav>

        {/* ระบบเปลี่ยนหน้า Router */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/otp" element={<OTP />} />
          <Route path="/organize-regis" element={<OrganizeRegis />} />
        </Routes>
        
      </div>
    </Router>
  )
}

export default App