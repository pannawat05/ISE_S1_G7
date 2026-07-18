// src/page/dashboard.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar';
import { Menu } from 'lucide-react'; // นำเข้าสำหรับปุ่มแฮมเบอร์เกอร์บน Mobile

// ข้อมูลเริ่มต้นสำหรับทดสอบ (Dummy Data)
const INITIAL_EVENTS = [
  { 
    id: '1', 
    name: '🔮 Magic Gathering 2026', 
    date: '2026-08-15', 
    time: '18:00', 
    location: 'Royal Paragon Hall', 
    ticketsSold: 450, 
    ticketsTotal: 500, 
    price: 1200, 
    status: 'Published', 
    category: 'Concert',
    description: 'งานรวมตัวผู้คลั่งไคล้เวทมนตร์และดนตรีแนวฟิวชั่นครั้งยิ่งใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้'
  },
  { 
    id: '2', 
    name: '🎨 NFT Creator Showcase', 
    date: '2026-09-01', 
    time: '13:00', 
    location: 'Bitkub M-Tower', 
    ticketsSold: 120, 
    ticketsTotal: 150, 
    price: 350, 
    status: 'Draft', 
    category: 'Exhibition',
    description: 'นิทรรศการแสดงผลงานศิลปะดิจิทัลที่คัดสรรจากศิลปินแถวหน้าของเมืองไทย'
  },
  { 
    id: '3', 
    name: '💻 Web3 Developer Summit', 
    date: '2026-10-10', 
    time: '09:00', 
    location: 'True Digital Park', 
    ticketsSold: 300, 
    ticketsTotal: 300, 
    price: 0, 
    status: 'Completed', 
    category: 'Conference',
    description: 'งานสัมมนาเทคโนโลยีบล็อกเชนและสัญญาอัจฉริยะสำหรับนักพัฒนายุคใหม่'
  },
  { 
    id: '4', 
    name: '🎵 EDM Neon Night Night', 
    date: '2026-11-05', 
    time: '21:00', 
    location: 'Bitec Bangna', 
    ticketsSold: 850, 
    ticketsTotal: 1000, 
    price: 2500, 
    status: 'Published', 
    category: 'Concert',
    description: 'เทศกาลดนตรีแนวตื๊ดสะท้อนแสงไฟนีออนที่จะปลุกวิญญาณปาร์ตี้ในตัวคุณ'
  },
];

// โครงสร้างว่างสำหรับสร้างกิจกรรมใหม่
const EMPTY_EVENT = {
  name: '',
  category: 'Concert',
  date: '',
  time: '',
  location: '',
  price: 0,
  ticketsTotal: 100,
  status: 'Draft',
  description: ''
};

export default function Event() {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // ควบคุม Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' หรือ 'edit'
  type FormEventType = typeof EMPTY_EVENT & Partial<{ id: string; ticketsSold: number }>;
  const [formEvent, setFormEvent] = useState<FormEventType>(EMPTY_EVENT);
  
  // แจ้งเตือน (Toast Notification)
  type ToastType = { message: string; type: 'success' | 'error' | string } | null;
  const [toast, setToast] = useState<ToastType>(null);
  
  // การเปิดปิด Sidebar บนอุปกรณ์เคลื่อนที่
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  type SidebarProps = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  };
  const SidebarComponent = Sidebar as React.ComponentType<SidebarProps>;

  const showToast = (message: string, type: 'success' | 'error' | string = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // การกรองข้อมูล
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // จัดการกับการเลือกแถว (Selection)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredEvents.map(event => event.id);
      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมที่เลือกทั้ง ${selectedIds.length} รายการ?`)) {
      setEvents(events.filter(event => !selectedIds.includes(event.id)));
      setSelectedIds([]);
      showToast('ลบรายการที่เลือกเรียบร้อยแล้ว', 'error');
    }
  };

  const handleBulkStatusChange = (newStatus: string) => {
    setEvents(events.map(event => {
      if (selectedIds.includes(event.id)) {
        return { ...event, status: newStatus };
      }
      return event;
    }));
    setSelectedIds([]);
    showToast(`เปลี่ยนสถานะเป็น ${newStatus} แล้ว`, 'success');
  };

  // การลบรายแถว (Single Delete)
  const handleDeleteRow = (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบกิจกรรม "${name}" ใช่หรือไม่?`)) {
      setEvents(events.filter(event => event.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
      showToast('ลบกิจกรรมสำเร็จ', 'error');
    }
  };

  // การเปิด Modal สำหรับเพิ่ม/แก้ไข
  const openAddModal = () => {
    setModalMode('add');
    setFormEvent({
      ...EMPTY_EVENT,
      date: new Date().toISOString().split('T')[0],
      time: '18:00'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: typeof EMPTY_EVENT & { id: string; ticketsSold: number }) => {
    setModalMode('edit');
    setFormEvent(event);
    setIsModalOpen(true);
  };

  // จัดการการส่งฟอร์ม (Form Submission)
  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formEvent.name?.trim() || !formEvent.location?.trim()) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    if (modalMode === 'add') {
      const newEvent = {
        ...EMPTY_EVENT,
        ...formEvent,
        id: Date.now().toString(),
        ticketsSold: 0
      };
      setEvents([newEvent, ...events]);
      showToast('สร้างกิจกรรมใหม่สำเร็จแล้ว!', 'success');
    } else {
      setEvents(events.map(ev => ev.id === formEvent.id ? { ...ev, ...formEvent, ticketsSold: ev.ticketsSold } as typeof INITIAL_EVENTS[0] : ev));
      showToast('แก้ไขข้อมูลกิจกรรมเรียบร้อย!', 'success');
    }
    setIsModalOpen(false);
  };

  return (
    // 💡 ปรับปรุง: เพิ่มครอบ Wrapper นอกสุดเพื่อให้จัดวางคู่ขนานไปกับ Sidebar ได้ถูกต้อง
    <div className="flex h-screen bg-[#f5f3ff] text-purple-950 dark:bg-[#0f0c1b] dark:text-[#e0d9f6] font-sans overflow-hidden">
      
      {/* เรียกใช้ Sidebar ภายนอกและเชื่อม State */}
      <SidebarComponent isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* 💡 ปรับปรุง: ส่วนพื้นที่หน้าจอคอนเทนต์หลักที่อยู่ถัดจาก Sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navbar สำหรับเรียกเปิด Sidebar บนหน้าจอมือถือ */}
        <header className="flex items-center justify-between bg-white dark:bg-[#16122b] px-6 py-4 shadow-sm border-b border-purple-100 dark:border-[#31255c]/30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="md:hidden text-purple-700 dark:text-[#bcb1ea] hover:text-purple-900 focus:outline-none cursor-pointer"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-purple-950 dark:text-purple-100">Organizer Management</h1>
          </div>
        </header>

        {/* ส่วนคอนเทนต์แสดงตารางงานกิจกรรม */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-8">
          {/* Toast Alert */}
          {toast && (
            <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-white font-medium
              ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-amber-500'}`}
            >
              <span>{toast.type === 'success' ? '✨' : toast.type === 'error' ? '🗑️' : '⚠️'}</span>
              {toast.message}
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-purple-950 dark:text-purple-100">
                จัดการงานกิจกรรม
              </h2>
              <p className="text-sm text-purple-700/70 dark:text-[#a89fc9] mt-1">
                สร้าง, แก้ไข และวิเคราะห์ความคืบหน้ากิจกรรมของคุณทั้งหมดได้ในหน้าเดียว
              </p>
            </div>
            
            {/* Create Button */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg hover:shadow-purple-500/30 dark:shadow-[0_0_20px_rgba(168,85,247,0.3)] transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              สร้างกิจกรรมใหม่
            </button>
          </div>

          {/* Control panel: Search, Filters & Bulk Actions */}
          <div className="bg-white dark:bg-[#16122b] p-5 rounded-2xl border border-purple-100 dark:border-[#31255c]/40 shadow-sm transition-all duration-500 mb-6">
            
            {/* ส่วนที่ 1: ค้นหาและฟิลเตอร์สถานะ */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-purple-400 dark:text-[#a89fc9]/60">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกิจกรรม หรือ สถานที่จัดงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-purple-800 dark:text-[#a89fc9]">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
                >
                  <option value="All">ทั้งหมด</option>
                  <option value="Draft">ฉบับร่าง (Draft)</option>
                  <option value="Published">เผยแพร่แล้ว (Published)</option>
                  <option value="Completed">สิ้นสุดแล้ว (Completed)</option>
                </select>
              </div>
            </div>

            {/* ส่วนที่ 2: Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-50 dark:border-[#31255c]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-purple-500/5 dark:bg-purple-500/10 p-3 rounded-xl transition-all duration-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <p className="text-sm font-medium text-purple-900 dark:text-[#dfdaec]">
                    เลือกอยู่ <strong className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedIds.length}</strong> รายการ
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBulkStatusChange('Published')}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
                  >
                    🚀 เปิดเผยแพร่ที่เลือก
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange('Draft')}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
                  >
                    ✏️ ตั้งเป็นฉบับร่างที่เลือก
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
                  >
                    🗑️ ลบทั้งหมดที่เลือก
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ตารางแสดงข้อมูลกิจกรรม (Responsive Table) */}
          <div className="bg-white dark:bg-[#16122b] border border-purple-100 dark:border-[#31255c]/40 rounded-2xl shadow-sm overflow-hidden transition-all duration-500">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-purple-100 dark:divide-[#31255c]/40">
                <thead className="bg-[#fcfbfe] dark:bg-[#0c0918]">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left w-12">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          className="w-4.5 h-4.5 rounded border-purple-300 dark:border-[#31255c]/60 text-purple-600 focus:ring-purple-500 focus:ring-opacity-25 accent-purple-600 cursor-pointer"
                          checked={filteredEvents.length > 0 && selectedIds.length === filteredEvents.length}
                          onChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">กิจกรรม</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">วัน/เวลา</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">สถานที่</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">ราคาตั๋ว</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">ยอดจองตั๋ว</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">สถานะ</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-purple-800 dark:text-[#a89fc9] uppercase tracking-wider">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 dark:divide-[#31255c]/20">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                      const isChecked = selectedIds.includes(event.id);
                      const ticketProgress = (event.ticketsSold / event.ticketsTotal) * 100;
                      return (
                        <tr 
                          key={event.id}
                          className={`hover:bg-purple-50/20 dark:hover:bg-purple-500/5 transition-colors duration-150 ${isChecked ? 'bg-purple-500/5 dark:bg-purple-500/10' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectRow(event.id)}
                                className="w-4.5 h-4.5 rounded border-purple-300 dark:border-[#31255c]/60 text-purple-600 focus:ring-purple-500 focus:ring-opacity-25 accent-purple-600 cursor-pointer"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-purple-950 dark:text-purple-100 text-[15px]">{event.name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-[#bcb1ea] w-max">{event.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-purple-950 dark:text-purple-100 font-medium">{event.date}</div>
                            <div className="text-xs text-purple-500 dark:text-purple-400">⏱️ {event.time} น.</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-900 dark:text-[#bcb1ea]">📍 {event.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-950 dark:text-purple-100">
                            {event.price === 0 ? <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">ฟรี</span> : `฿${event.price.toLocaleString()}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col w-36">
                              <div className="flex justify-between items-center text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                                <span>{event.ticketsSold} / {event.ticketsTotal} ใบ</span>
                                <span>{Math.round(ticketProgress)}%</span>
                              </div>
                              <div className="w-full bg-purple-100 dark:bg-purple-950/40 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(ticketProgress, 100)}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border
                              ${event.status === 'Published' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : event.status === 'Draft' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}
                            >
                              {event.status === 'Published' && '🚀 เผยแพร่แล้ว'}
                              {event.status === 'Draft' && '✏️ ฉบับร่าง'}
                              {event.status === 'Completed' && '🏁 สิ้นสุดแล้ว'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => openEditModal(event)} className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer" title="แก้ไขกิจกรรม">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteRow(event.id, event.name)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="ลบกิจกรรม">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-purple-700/60 dark:text-[#a89fc9]/60">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <span className="text-4xl">🎫</span>
                          <p className="font-semibold text-lg">ไม่พบกิจกรรมที่คุณกำลังค้นหา</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* --- ADD & EDIT MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#16122b] w-full max-w-2xl rounded-2xl border border-purple-100 dark:border-[#31255c]/60 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#fcfbfe] dark:bg-[#0c0918] border-b border-purple-100 dark:border-[#31255c]/40 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-purple-950 dark:text-purple-100">
                {modalMode === 'add' ? '🔮 สร้างกิจกรรมเวทมนตร์ใหม่' : '✏️ แก้ไขข้อมูลกิจกรรม'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-purple-400 hover:text-purple-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">ชื่อกิจกรรม <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formEvent.name || ''} onChange={(e) => setFormEvent({ ...formEvent, name: e.target.value })} placeholder="ใส่ชื่อชื่องานกิจกรรมให้น่าสนใจ..." className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">ประเภทกิจกรรม</label>
                    <select value={formEvent.category || 'Concert'} onChange={(e) => setFormEvent({ ...formEvent, category: e.target.value })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer">
                      <option value="Concert">คอนเสิร์ต (Concert)</option>
                      <option value="Conference">สัมมนา (Conference)</option>
                      <option value="Exhibition">นิทรรศการ (Exhibition)</option>
                      <option value="Party">งานปาร์ตี้ (Party)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">สถานะเริ่มแรก</label>
                    <select value={formEvent.status || 'Draft'} onChange={(e) => setFormEvent({ ...formEvent, status: e.target.value })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer">
                      <option value="Draft">ฉบับร่าง (Draft)</option>
                      <option value="Published">เปิดเผยแพร่ (Published)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">วันที่จัดงาน <span className="text-rose-500">*</span></label>
                    <input type="date" required value={formEvent.date || ''} onChange={(e) => setFormEvent({ ...formEvent, date: e.target.value })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">เวลาจัดงาน <span className="text-rose-500">*</span></label>
                    <input type="time" required value={formEvent.time || ''} onChange={(e) => setFormEvent({ ...formEvent, time: e.target.value })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">สถานที่จัดงาน <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formEvent.location || ''} onChange={(e) => setFormEvent({ ...formEvent, location: e.target.value })} placeholder="ชื่อสถานที่ ห้องจัดงาน หรือพิกัดออนไลน์..." className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">ราคาบัตรเข้าชม (บาท)</label>
                    <input type="number" min="0" value={formEvent.price ?? 0} onChange={(e) => setFormEvent({ ...formEvent, price: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">จำนวนบัตรทั้งหมดที่มีขาย (ใบ)</label>
                    <input type="number" min="1" required value={formEvent.ticketsTotal ?? 100} onChange={(e) => setFormEvent({ ...formEvent, ticketsTotal: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-purple-900 dark:text-[#bcb1ea] mb-1">รายละเอียดกิจกรรมเพิ่มเติม</label>
                  <textarea rows={3} value={formEvent.description || ''} onChange={(e) => setFormEvent({ ...formEvent, description: e.target.value })} placeholder="เขียนอธิบายความน่าสนใจของกิจกรรมเพื่อดึงดูดใจผู้คน..." className="w-full px-4 py-2.5 bg-[#fcfbfe] dark:bg-[#0c0918] text-purple-950 dark:text-[#e0d9f6] rounded-xl border border-purple-100 dark:border-[#31255c]/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors resize-none"></textarea>
                </div>
              </div>

              <div className="px-6 py-4 bg-[#fcfbfe] dark:bg-[#0c0918] border-t border-purple-100 dark:border-[#31255c]/40 flex justify-end items-center gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-medium rounded-xl transition-all duration-200 cursor-pointer">ยกเลิก</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">{modalMode === 'add' ? '✨ บันทึกสร้างกิจกรรม' : '💾 บันทึกการแก้ไข'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}