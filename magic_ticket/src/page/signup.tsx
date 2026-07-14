import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function SignUp() {
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!")
      return
    }

    fetch('http://localhost:5001/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    }).then(response => response.json())
      .then(data => {
        console.log('Success:', data)
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  return (
    /* 1. ปรับพื้นหลังหลักให้รองรับ 2 โหมด */
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-[radial-gradient(circle_at_center,_#f5f3ff_0%,_#ffffff_70%)] dark:bg-[radial-gradient(circle_at_center,_#241442_0%,_#0f0c1b_70%)] px-4 py-12 relative overflow-hidden transition-colors duration-500">
      
      {/* วงแสงเวทมนตร์เรืองแสงด้านหลัง */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-400/20 dark:bg-pink-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* 2. การ์ดกระจกโปร่งแสง สลับสีตามธีม */}
      <div className="w-full max-w-md bg-white/70 dark:bg-[#0f0c1b]/60 backdrop-blur-xl border border-purple-200/60 dark:border-[#31255c]/60 rounded-2xl p-8 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-500">
        
        {/* หัวข้อ */}
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">✨🧙‍♂️</div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            สร้างบัญชีเวทมนตร์
          </h2>
          <p className="text-sm text-purple-900/60 dark:text-[#e0d9f6]/60 mt-2">เข้าร่วมการเดินทางข้ามมิติไปกับเรา</p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ชื่อจริง และ นามสกุล */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">ชื่อจริง</label>
              <input
                type="text"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                placeholder="สมชาย"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">นามสกุล</label>
              <input
                type="text"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                placeholder="สายเสก"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
                required
              />
            </div>
          </div>

          {/* อีเมล */}
          <div>
            <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">อีเมล (Email)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
              required
            />
          </div>

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
              required
            />
          </div>

          {/* ยืนยันรหัสผ่าน */}
          <div>
            <label className="block text-xs font-medium text-purple-900 dark:text-[#e0d9f6] mb-1">ยืนยันรหัสผ่าน (Confirm Password)</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f0c1b]/80 border border-purple-200 dark:border-[#31255c] focus:border-purple-500 rounded-xl text-purple-900 dark:text-white placeholder-purple-300 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm shadow-sm dark:shadow-none"
              required
            />
          </div>

          {/* ปุ่มสมัครสมาชิก */}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 dark:shadow-purple-900/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide"
          >
            ร่ายมนตร์สมัครสมาชิก 🔮
          </button>
        </form>

        {/* ลิงก์สลับไปหน้า Login */}
        <div className="text-center mt-6 text-xs text-purple-900/60 dark:text-[#e0d9f6]/60">
          มีบัญชีอยู่แล้วใช่ไหม?{' '}
          <Link to="/signin" className="text-purple-600 dark:text-purple-400 hover:text-pink-600 dark:hover:text-pink-400 font-medium transition-colors underline underline-offset-4">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>

      </div>
    </div>
  )
}