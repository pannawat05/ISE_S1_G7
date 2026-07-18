import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Cookies from 'js-cookie'

function Signin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetch('http://localhost:5001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message)
        if (data.token) {
          Cookies.set('authToken', data.token, { path: '/' }) // เก็บ Token ไว้ใน Cookie
          window.location.href = '/' // เปลี่ยนเส้นทางไปหน้า Home หลังจากเข้าสู่ระบบสำเร็จ
        }
      })
      .catch((error) => {
        console.error('Error:', error)
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      })
  }

  return (
    /* 1. ปรับพื้นหลังหลักให้สลับระหว่างสว่าง (ม่วงอ่อนไปขาว) และมืด (อวกาศ) */
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-[radial-gradient(circle_at_center,_#f5f3ff_0%,_#ffffff_70%)] dark:bg-[radial-gradient(circle_at_center,_#241442_0%,_#0f0c1b_70%)] px-4 py-12 relative overflow-hidden transition-colors duration-500">
      
      {/* วงแสงเวทมนตร์เรืองแสงด้านหลัง (ปรับความเข้มข้นให้เข้ากับแต่ละโหมด) */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-400/20 dark:bg-pink-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* 2. การ์ดกระจกโปร่งแสง สลับสีตามธีม (ขาวใสในโหมดสว่าง / ดำใสในโหมดมืด) */}
      <div className="w-full max-w-md bg-white/70 dark:bg-[#0f0c1b]/60 backdrop-blur-xl border border-purple-200/60 dark:border-[#31255c]/60 rounded-2xl p-8 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-500">
        
        {/* หัวข้อ */}
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🔮✨</div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            ยินดีต้อนรับกลับมา
          </h2>
          <p className="text-sm text-purple-900/60 dark:text-[#e0d9f6]/60 mt-2">กรุณาเข้าสู่ระบบเพื่อใช้งานบัญชีเวทมนตร์ของคุณ</p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* อีเมล */}
          <div>
            <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">อีเมล (Email)</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              /* 3. กล่อง Input สลับระหว่างขาวนวล และ ดำใส */
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
            />
          </div>

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
            />
          </div>

          {/* จดจำฉันไว้ & ลืมรหัสผ่าน */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                /* 4. ปรับสี Checkbox ให้เนียนไปกับแต่ละธีม */
                className="h-4 w-4 bg-white dark:bg-[#0f0c1b] border-purple-300 dark:border-[#31255c] text-purple-600 focus:ring-purple-500/50 focus:ring-offset-0 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-purple-900/80 dark:text-[#e0d9f6]/80">
                จดจำฉันไว้
              </label>
            </div>

            <div>
              <a href="#" className="font-medium text-purple-600 dark:text-purple-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                ลืมรหัสผ่าน?
              </a>
            </div>
          </div>

          {/* ปุ่มเข้าสู่ระบบ */}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 dark:shadow-purple-900/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide"
          >
            เปิดประตูมิติเข้าสู่ระบบ 🔮
          </button>
        </form>

        {/* ลิงก์สลับไปหน้าสมัครสมาชิก */}
        <div className="text-center mt-6 text-xs text-purple-900/60 dark:text-[#e0d9f6]/60">
          ยังไม่มีบัญชีใช่ไหม?{' '}
          <Link to="/signup" className="text-purple-600 dark:text-purple-400 hover:text-pink-600 dark:hover:text-pink-400 font-medium transition-colors underline underline-offset-4">
            สมัครสมาชิกใหม่ที่นี่
          </Link>
        </div>

      </div>
    </div>
  )
}

export default Signin