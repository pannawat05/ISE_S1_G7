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
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-[radial-gradient(circle_at_center,_#241442_0%,_#0f0c1b_70%)] px-4 py-12 relative overflow-hidden">
      
      {/* วงแสงเวทมนตร์เรืองแสงด้านหลัง */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* การ์ดลงทะเบียนแบบกระจกโปร่งแสง */}
      <div className="w-full max-w-md bg-[#1e1b4b]/40 backdrop-blur-xl border border-[#31255c] rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* หัวข้อ */}
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">✨🧙‍♂️</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            สร้างบัญชีเวทมนตร์
          </h2>
          <p className="text-sm text-slate-400 mt-2">เข้าร่วมการเดินทางข้ามมิติไปกับเรา</p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* ชื่อจริง */}
         <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">ชื่อจริง (Firstname)</label>
            <input
              type="text"
              name="fname"
              value={formData.fname}
              onChange ={handleChange}
              placeholder="เช่น wizard_pan"
              className="w-full px-4 py-2.5 bg-[#0f0c1b]/60 border border-[#31255c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              required
            />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">นามสกุล (Lastname)</label>
            <input
              type="text"
              name="lname"
              value={formData.lname}
              onChange ={handleChange}
              placeholder="เช่น wizard_pan"
              className="w-full px-4 py-2.5 bg-[#0f0c1b]/60 border border-[#31255c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              required
            />
          </div>

          {/* อีเมล */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">อีเมล (Email)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              className="w-full px-4 py-2.5 bg-[#0f0c1b]/60 border border-[#31255c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              required
            />
          </div>

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#0f0c1b]/60 border border-[#31255c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              required
            />
          </div>

          {/* ยืนยันรหัสผ่าน */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">ยืนยันรหัสผ่าน (Confirm Password)</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#0f0c1b]/60 border border-[#31255c] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              required
            />
          </div>

          {/* ปุ่มสมัครสมาชิก */}
          <button
            type="submit"
            className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-900/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            ร่ายมนตร์สมัครสมาชิก 🔮
          </button>
        </form>

        {/* ลิงก์สลับไปหน้า Login */}
        <div className="text-center mt-6 text-xs text-slate-400">
          มีบัญชีอยู่แล้วใช่ไหม?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>

      </div>
    </div>
  )
}
