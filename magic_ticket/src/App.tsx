import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './page/home'
import SignUp from './page/signup'

// --- Component หน้า Home (ธีมเวทมนตร์ด้วย Tailwind) ---


// --- Component หลักแอปพลิเคชัน ---
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f0c1b] text-[#e0d9f6]">
        
        {/* Navbar (Glassmorphism สไตล์ Tailwind) */}
        <nav className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 bg-[#0f0c1b]/80 backdrop-blur-lg border-b border-[#31255c]">
          <div className="text-xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            🔮 Magic Ticket
          </div>
          <div className="flex gap-6">
            <Link to="/" className="text-[#e0d9f6] hover:text-purple-400 transition-colors font-medium">
              หน้าแรก
            </Link>
            <Link to="/my-tickets" className="text-[#e0d9f6] hover:text-purple-400 transition-colors font-medium">
              ตั๋วของฉัน
            </Link>
            <Link to="/signup" className="text-[#e0d9f6] hover:text-purple-400 transition-colors font-medium">
              สมัครสมาชิก
            </Link>
            
          </div>
        </nav>

        {/* ระบบเปลี่ยนหน้า Router */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
        
      </div>
    </Router>
  )
}

export default App