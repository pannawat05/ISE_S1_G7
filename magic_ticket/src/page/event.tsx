// src/page/dashboard.tsx
import { useState, useEffect } from 'react';
import Sidebar from '../components/navigater/sidebar';
import { Menu } from 'lucide-react';
import cookie from 'js-cookie';

// ---------- Types ----------
type EventStatus = 'Draft' | 'Published' | 'Completed';

interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  ticketsSold: number;
  ticketsTotal: number;
  price: number;
  status: EventStatus;
  category: string;
  description: string;
}

type EventFormData = Omit<EventItem, 'id' | 'ticketsSold'> & {
  id?: string;
  ticketsSold?: number;
};

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning';
}

const INITIAL_EVENTS: EventItem[] = [
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
  }
];

const EMPTY_EVENT: EventFormData = {
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
  const token = cookie.get('authToken');
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'All'>('All');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formEvent, setFormEvent] = useState<EventFormData>(EMPTY_EVENT);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const SidebarComponent = Sidebar as React.ComponentType<{
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }>;

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredEvents.map((event) => event.id);
      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมที่เลือกทั้ง ${selectedIds.length} รายการ?`)) {
      setEvents(events.filter((event) => !selectedIds.includes(event.id)));
      setSelectedIds([]);
      showToast('ลบรายการที่เลือกเรียบร้อยแล้ว', 'error');
    }
  };

  const handleBulkStatusChange = (newStatus: EventStatus) => {
    setEvents(
      events.map((event) => {
        if (selectedIds.includes(event.id)) {
          return { ...event, status: newStatus };
        }
        return event;
      })
    );
    setSelectedIds([]);
    showToast(`เปลี่ยนสถานะเป็น ${newStatus} แล้ว`, 'success');
  };

  const handleDeleteRow = (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบกิจกรรม "${name}" ใช่หรือไม่?`)) {
      setEvents(events.filter((event) => event.id !== id));
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
      showToast('ลบกิจกรรมสำเร็จ', 'error');
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormEvent({
      ...EMPTY_EVENT,
      date: new Date().toISOString().split('T')[0],
      time: '18:00'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: EventItem) => {
    setModalMode('edit');
    setFormEvent(event);
    setIsModalOpen(true);
  };

  // จัดการการส่งฟอร์ม (ปรับปรุงระบบเชื่อมต่อ API)
  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formEvent.name?.trim() || !formEvent.location?.trim()) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    if (modalMode === 'add') {
      const newEvent: EventItem = {
        ...EMPTY_EVENT,
        ...formEvent,
        id: Date.now().toString(),
        ticketsSold: 0
      };

      // 💡 แก้ไขจุดที่ 1: แปลง Key ของ Object ให้ตรงกับความต้องการของ SQL ใน Express Backend
      const apiBody = {
        name: newEvent.name,
        place: newEvent.location,
        type: newEvent.category,
        start_date: `${newEvent.date} ${newEvent.time}:00`, // รวมเป็น DATETIME string
        description: newEvent.description,
        theme: '', // ปล่อยว่างไว้ตามโครงตารางเดิม หรือใส่ข้อมูลเพิ่มได้
        status: newEvent.status,
        max_seat: newEvent.ticketsTotal,
        is_active: newEvent.status === 'Published' ? 1 : 0
      };

      fetch('http://localhost:5001/organizer/add_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` // ✅ แนบ Token ไปในรูปแบบ Bearer ที่ถูกต้อง
        },
        body: JSON.stringify(apiBody)
      })
        .then(async (response) => {
          // 💡 แก้ไขจุดที่ 2: ดักจับ Error status code จาก Backend เช่น 401 หรือ 500
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Server responded with status ${response.status}`);
          }
          return response.text(); // เปลี่ยนเป็น .text() เนื่องจาก Express ใช้ .send() ส่งข้อความกลับ
        })
        .then(() => {
          // อัปเดต State หน้า UI เมื่อฝั่ง Backend บันทึกสำเร็จแล้ว
          setEvents([newEvent, ...events]);
          showToast('สร้างกิจกรรมใหม่และบันทึกลงระบบสำเร็จแล้ว!', 'success');
          setIsModalOpen(false);
        })
        .catch((error: Error) => {
          console.error('Fetch Error:', error);
          showToast(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
        });
    } else {
      // สำหรับ Mode Edit (ทำแบบเดียวกันหากต้องการต่อ API ในอนาคต)
      setEvents(
        events.map((ev) =>
          ev.id === formEvent.id ? { ...ev, ...formEvent, ticketsSold: ev.ticketsSold } : ev
        )
      );
      showToast('แก้ไขข้อมูลกิจกรรมเรียบร้อย!', 'success');
      setIsModalOpen(false);
    }
  };

  const inputClassName = "mt-input";
  const labelClassName = "block text-sm font-bold text-gray-300 mb-1";

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
            <h1 className="text-xl font-bold text-white">Organizer Management</h1>
          </div>
        </header>

        <main className="mt-dashboard-main">
          {toast && (
            <div
              className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 text-white font-medium border ${
                toast.type === "success"
                  ? "mt-btn-primary border-transparent"
                  : toast.type === "error"
                    ? "bg-elevated border-white/10 text-gray-300"
                    : "bg-purple-600/20 border-purple-500/40 text-purple-400"
              }`}
            >
              <span>{toast.type === "success" ? "✨" : toast.type === "error" ? "🗑️" : "⚠️"}</span>
              {toast.message}
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                จัดการงานกิจกรรม
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                สร้าง, แก้ไข และวิเคราะห์ความคืบหน้ากิจกรรมของคุณทั้งหมดได้ในหน้าเดียว
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 mt-btn-primary px-5 py-3 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              สร้างกิจกรรมใหม่
            </button>
          </div>

          <div className="mt-surface p-5 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-violet-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกิจกรรม หรือ สถานที่จัดงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputClassName} pl-10`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-300">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as EventStatus | "All")}
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="All">ทั้งหมด</option>
                  <option value="Draft">ฉบับร่าง (Draft)</option>
                  <option value="Published">เผยแพร่แล้ว (Published)</option>
                  <option value="Completed">สิ้นสุดแล้ว (Completed)</option>
                </select>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-purple-600/10 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <p className="text-sm font-medium text-gray-300">
                    เลือกอยู่{" "}
                    <strong className="text-violet-400 font-extrabold">{selectedIds.length}</strong>{" "}
                    รายการ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBulkStatusChange("Published")}
                    className="mt-badge mt-badge-success px-3 py-1.5 cursor-pointer hover:bg-violet-400/20"
                  >
                    🚀 เปิดเผยแพร่ที่เลือก
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange("Draft")}
                    className="mt-badge mt-badge-warning px-3 py-1.5 cursor-pointer hover:bg-purple-400/20"
                  >
                    ✏️ ตั้งเป็นฉบับร่างที่เลือก
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="mt-badge mt-badge-muted px-3 py-1.5 cursor-pointer hover:bg-gray-400/20"
                  >
                    🗑️ ลบทั้งหมดที่เลือก
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-elevated">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left w-12">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          className="w-4.5 h-4.5 rounded border-white/10 text-violet-600 focus:ring-purple-500 accent-violet-600 cursor-pointer"
                          checked={filteredEvents.length > 0 && selectedIds.length === filteredEvents.length}
                          onChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">กิจกรรม</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">วัน/เวลา</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">สถานที่</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ราคาตั๋ว</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ยอดจองตั๋ว</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">สถานะ</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                      const isChecked = selectedIds.includes(event.id);
                      const ticketProgress = (event.ticketsSold / event.ticketsTotal) * 100;
                      return (
                        <tr
                          key={event.id}
                          className={`hover:bg-purple-600/5 transition-colors duration-150 ${isChecked ? "bg-purple-600/10" : ""}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectRow(event.id)}
                                className="w-4.5 h-4.5 rounded border-white/10 text-violet-600 focus:ring-purple-500 accent-violet-600 cursor-pointer"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-[15px]">{event.name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-violet-600/20 text-violet-400 border border-violet-400/20 w-max">
                                {event.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white font-medium">{event.date}</div>
                            <div className="text-xs text-violet-400">⏱️ {event.time} น.</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">📍 {event.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                            {event.price === 0 ? (
                              <span className="mt-badge mt-badge-success px-2 py-1 rounded-md">ฟรี</span>
                            ) : (
                              `฿${event.price.toLocaleString()}`
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col w-36">
                              <div className="flex justify-between items-center text-xs font-medium text-gray-400 mb-1">
                                <span>{event.ticketsSold} / {event.ticketsTotal} ใบ</span>
                                <span>{Math.round(ticketProgress)}%</span>
                              </div>
                              <div className="w-full bg-elevated rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-violet-600 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(ticketProgress, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`mt-badge ${
                                event.status === "Published"
                                  ? "mt-badge-success"
                                  : event.status === "Draft"
                                    ? "mt-badge-warning"
                                    : "mt-badge-muted"
                              }`}
                            >
                              {event.status === "Published" && "🚀 เผยแพร่แล้ว"}
                              {event.status === "Draft" && "✏️ ฉบับร่าง"}
                              {event.status === "Completed" && "🏁 สิ้นสุดแล้ว"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => openEditModal(event)}
                                className="p-1.5 text-violet-400 hover:bg-violet-400/10 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขกิจกรรม"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRow(event.id, event.name)}
                                className="p-1.5 text-gray-400 hover:bg-gray-400/10 hover:text-gray-300 rounded-lg transition-colors cursor-pointer"
                                title="ลบกิจกรรม"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <span className="text-4xl">🎫</span>
                          <p className="font-semibold text-lg text-gray-400">ไม่พบกิจกรรมที่คุณกำลังค้นหา</p>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="mt-surface w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-elevated border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-white">
                {modalMode === "add" ? "🔮 สร้างกิจกรรมเวทมนตร์ใหม่" : "✏️ แก้ไขข้อมูลกิจกรรม"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className={labelClassName}>ชื่อกิจกรรม <span className="text-violet-400">*</span></label>
                  <input type="text" required value={formEvent.name || ""} onChange={(e) => setFormEvent({ ...formEvent, name: e.target.value })} placeholder="ใส่ชื่อชื่องานกิจกรรมให้น่าสนใจ..." className={inputClassName} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>ประเภทกิจกรรม</label>
                    <select value={formEvent.category || "Concert"} onChange={(e) => setFormEvent({ ...formEvent, category: e.target.value })} className={`${inputClassName} cursor-pointer`}>
                      <option value="Concert">คอนเสิร์ต (Concert)</option>
                      <option value="Conference">สัมมนา (Conference)</option>
                      <option value="Exhibition">นิทรรศการ (Exhibition)</option>
                      <option value="Party">งานปาร์ตี้ (Party)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>สถานะเริ่มแรก</label>
                    <select value={formEvent.status || "Draft"} onChange={(e) => setFormEvent({ ...formEvent, status: e.target.value as EventStatus })} className={`${inputClassName} cursor-pointer`}>
                      <option value="Draft">ฉบับร่าง (Draft)</option>
                      <option value="Published">เปิดเผยแพร่ (Published)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>วันที่จัดงาน <span className="text-violet-400">*</span></label>
                    <input type="date" required value={formEvent.date || ""} onChange={(e) => setFormEvent({ ...formEvent, date: e.target.value })} className={`${inputClassName} cursor-pointer`} />
                  </div>
                  <div>
                    <label className={labelClassName}>เวลาจัดงาน <span className="text-violet-400">*</span></label>
                    <input type="time" required value={formEvent.time || ""} onChange={(e) => setFormEvent({ ...formEvent, time: e.target.value })} className={`${inputClassName} cursor-pointer`} />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>สถานที่จัดงาน <span className="text-violet-400">*</span></label>
                  <input type="text" required value={formEvent.location || ""} onChange={(e) => setFormEvent({ ...formEvent, location: e.target.value })} placeholder="ชื่อสถานที่ ห้องจัดงาน หรือพิกัดออนไลน์..." className={inputClassName} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>ราคาบัตรเข้าชม (บาท)</label>
                    <input type="number" min="0" value={formEvent.price ?? 0} onChange={(e) => setFormEvent({ ...formEvent, price: parseInt(e.target.value) || 0 })} className={inputClassName} />
                  </div>
                  <div>
                    <label className={labelClassName}>จำนวนบัตรทั้งหมดที่มีขาย (ใบ)</label>
                    <input type="number" min="1" required value={formEvent.ticketsTotal ?? 100} onChange={(e) => setFormEvent({ ...formEvent, ticketsTotal: parseInt(e.target.value) || 1 })} className={inputClassName} />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>รายละเอียดกิจกรรมเพิ่มเติม</label>
                  <textarea rows={3} value={formEvent.description || ""} onChange={(e) => setFormEvent({ ...formEvent, description: e.target.value })} placeholder="เขียนอธิบายความน่าสนใจของกิจกรรมเพื่อดึงดูดใจผู้คน..." className={`${inputClassName} resize-none`}></textarea>
                </div>
              </div>

              <div className="px-6 py-4 bg-elevated border-t border-white/5 flex justify-end items-center gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-elevated hover:bg-surface text-gray-300 border border-white/10 font-medium rounded-xl transition-all duration-200 cursor-pointer">
                  ยกเลิก
                </button>
                <button type="submit" className="px-6 py-2.5 mt-btn-primary cursor-pointer">
                  {modalMode === "add" ? "✨ บันทึกสร้างกิจกรรม" : "💾 บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}