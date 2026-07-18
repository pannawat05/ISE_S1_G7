import React from 'react'



function Home() {
  return (
    /* ปรับ min-h-screen และสีพื้นหลังหลักให้สลับโหมดได้สมบูรณ์ */
    <div className="min-h-screen bg-[#f5f3ff] text-purple-950 dark:bg-[#0f0c1b] dark:text-[#e0d9f6] font-sans selection:bg-purple-500 selection:text-white transition-colors duration-500">
      
      {/* Hero Section */}
      <header className="relative overflow-hidden py-24 text-center bg-[radial-gradient(circle_at_center,_#f5f3ff_0%,_#ffffff_70%)] dark:bg-[radial-gradient(circle_at_center,_#241442_0%,_#0f0c1b_70%)] transition-colors duration-500">
        {/* เอฟเฟกต์แสงเรืองรอบๆ */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="text-4xl mb-4 animate-bounce">✨🧙‍♂️✨</div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 dark:from-purple-400 dark:via-indigo-400 dark:to-purple-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            Magic Ticket
          </h1>
          <p className="mt-4 text-lg md:text-xl text-purple-900/60 dark:text-slate-400 max-w-xl mx-auto">
            ปลดล็อคประตูสู่การเดินทางและความบันเทิงสุดมหัศจรรย์ ทะลุมิติไปกับเรา
          </p>
          <button className="mt-8 px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-600 dark:to-indigo-600 rounded-full shadow-lg shadow-purple-500/30 dark:shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:shadow-xl dark:hover:shadow-[0_6px_25px_rgba(168,85,247,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
            สำรวจตั๋วเวทมนตร์
          </button>
          <a href="/organize-regis">
          <button className="mt-8 ml-4 px-8 py-3 font-semibold text-purple-600 dark:text-purple-400 bg-white/80 dark:bg-[#1e1b4b]/60 border border-purple-300 dark:border-purple-500/50 rounded-full shadow-lg shadow-purple-500/10 dark:shadow-[0_4px_20px_rgba(168,85,247,0.2)] hover:shadow-xl dark:hover:shadow-[0_6px_25px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white">
            สมัครเป็น Organizer
          </button>
          </a>
        </div>
      </header>

      {/* Featured Section */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 text-purple-900 dark:text-white">
          <span>🎟️</span> ตั๋วยอดนิยมประจำสัปดาห์
        </h2>

        {/* Grid แสดงการ์ดตั๋ว */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* การ์ดตั๋วที่ 1 */}
          <div className="group bg-white/80 dark:bg-[#1e1b4b]/60 backdrop-blur-md border border-purple-100 dark:border-[#31255c] hover:border-purple-500 dark:hover:border-purple-500 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-md dark:shadow-lg">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 text-3xl flex items-center justify-center rounded-full mx-auto mb-4 shadow-[0_0_15px_rgba(168,85,247,0.15)] dark:shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform">
              🔮
            </div>
            <h3 className="text-xl font-semibold text-center text-purple-950 dark:text-white mb-2">บัตรเข้าชมปราสาทลอยฟ้า</h3>
            <p className="text-purple-900/60 dark:text-slate-400 text-sm text-center h-12 mb-6">
              สัมผัสประสบการณ์เหนือจินตนาการบนหมู่เมฆและร่วมงานเลี้ยงจิบชากับพ่อมด
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">99 Gold <span className="text-xs text-purple-900/40 dark:text-slate-400 font-normal">/ ใบ</span></span>
              <button className="px-5 py-2 font-medium text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-500/50 rounded-xl hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all">
                จองตั๋ว
              </button>
            </div>
          </div>

          {/* การ์ดตั๋วที่ 2 */}
          <div className="group bg-white/80 dark:bg-[#1e1b4b]/60 backdrop-blur-md border border-purple-100 dark:border-[#31255c] hover:border-purple-500 dark:hover:border-purple-500 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-md dark:shadow-lg">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-3xl flex items-center justify-center rounded-full mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">
              🐉
            </div>
            <h3 className="text-xl font-semibold text-center text-purple-950 dark:text-white mb-2">ตั๋วรถด่วนสายเอ็กซ์เพรส</h3>
            <p className="text-purple-900/60 dark:text-slate-400 text-sm text-center h-12 mb-6">
              เดินทางข้ามมิติด้วยความเร็วแสง ปลอดภัยไร้กังวล ทะลุผ่านม่านหมอกโบราณ
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">150 Gold <span className="text-xs text-purple-900/40 dark:text-slate-400 font-normal">/ ใบ</span></span>
              <button className="px-5 py-2 font-medium text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-500/50 rounded-xl hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all">
                จองตั๋ว
              </button>
            </div>
          </div>

          {/* การ์ดตั๋วที่ 3 */}
          <div className="group bg-white/80 dark:bg-[#1e1b4b]/60 backdrop-blur-md border border-purple-100 dark:border-[#31255c] hover:border-purple-500 dark:hover:border-purple-500 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-md dark:shadow-lg">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-3xl flex items-center justify-center rounded-full mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform">
              🧜‍♀️
            </div>
            <h3 className="text-xl font-semibold text-center text-purple-950 dark:text-white mb-2">ทัวร์มหาสมุทรแอตแลนติส</h3>
            <p className="text-purple-900/60 dark:text-slate-400 text-sm text-center h-12 mb-6">
              ดำดิ่งสู่เมืองใต้บาดาลลึกลับ ชมความงามของเงือกและปะการังเรืองแสง
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">220 Gold <span className="text-xs text-purple-900/40 dark:text-slate-400 font-normal">/ ใบ</span></span>
              <button className="px-5 py-2 font-medium text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-500/50 rounded-xl hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all">
                จองตั๋ว
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Home