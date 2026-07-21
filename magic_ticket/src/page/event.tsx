import React, { useState, useEffect } from 'react';
import Sidebar from '../components/navigater/sidebar';
import { Menu, Upload, X } from 'lucide-react';
import cookie from 'js-cookie';

// ---------- Types ----------
type EventStatus = 'Draft' | 'Published' | 'Completed';

interface EventFormData {
  id?: string;
  name: string;
  category: string;
  date: string;
  time: string;
  location: string;
  price: number;
  ticketsTotal: number;
  status: EventStatus;
  description: string;
  theme: string;
}

interface EventItem extends Omit<EventFormData, 'id'> {
  id: string;
  ticketsSold: number;
  thumbnail?: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning';
}

const INITIAL_EVENTS: EventItem[] = [];

const EMPTY_EVENT: EventFormData = {
  name: "",
  category: "Concert",
  date: "",
  time: "",
  location: "",
  price: 0,
  ticketsTotal: 100,
  status: "Draft",
  description: "",
  theme: "",
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

  // 🖼️ State สำหรับจัดการรูปภาพ
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const SidebarComponent = Sidebar as React.ComponentType<{
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }>;

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  };

  const delEvent = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5001/organizer/delete_event/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server responded with status ${response.status}`);
      }

      fetchEvents();
      showToast('ลบกิจกรรมสำเร็จ', 'success');
    } catch (error: unknown) {
      console.error('Delete Event Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(errorMessage || 'ไม่สามารถลบกิจกรรมได้', 'error');
    }
  };

  const fetchEvents = () => {
    fetch('http://localhost:5001/organizer/get_events', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Server responded with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const mappedEvents: EventItem[] = data.map((item: Record<string, unknown>) => {
            let itemDate = '';
            let itemTime = '';

            const startDate = typeof item['start_date'] === 'string' ? (item['start_date'] as string) : '';
            if (startDate) {
              const parts = startDate.split(' ');
              itemDate = parts[0] || '';
              itemTime = parts[1] ? parts[1].substring(0, 5) : '';
            }

            const idVal = item['id'] ?? Date.now().toString();
            const nameVal = typeof item['name'] === 'string' ? (item['name'] as string) : '';
            const typeVal = typeof item['type'] === 'string' ? (item['type'] as string) : 'Concert';
            const placeVal = typeof item['place'] === 'string' ? (item['place'] as string) : '';
            const priceVal = typeof item['price'] === 'number' ? (item['price'] as number) : (typeof item['price'] === 'string' ? Number(item['price']) || 0 : 0);
            const maxSeatVal = typeof item['max_seat'] === 'number' ? (item['max_seat'] as number) : (typeof item['max_seat'] === 'string' ? Number(item['max_seat']) || 100 : 100);
            const ticketsSoldVal = typeof item['ticketsSold'] === 'number' ? (item['ticketsSold'] as number) : 0;
            const statusVal = typeof item['status'] === 'string' ? (item['status'] as string) : 'Draft';
            const descriptionVal = typeof item['description'] === 'string' ? (item['description'] as string) : '';
            const themeVal = typeof item['theme'] === 'string' ? (item['theme'] as string) : '';
            const thumbnailVal = typeof item['thumbnail'] === 'string' ? (item['thumbnail'] as string) : '';

            return {
              id: idVal.toString(),
              name: nameVal,
              category: typeVal,
              date: itemDate,
              time: itemTime,
              location: placeVal,
              price: priceVal,
              ticketsTotal: maxSeatVal,
              ticketsSold: ticketsSoldVal,
              status: statusVal as EventStatus,
              description: descriptionVal,
              theme: themeVal,
              thumbnail: thumbnailVal
            };
          });
          setEvents(mappedEvents);
        } else {
          console.error('Unexpected /organizer/get_events response shape:', data);
          showToast('รูปแบบข้อมูลที่ได้จากเซิร์ฟเวอร์ไม่ถูกต้อง', 'error');
        }
      })
      .catch((error: Error) => {
        console.error('Fetch Events Error:', error);
        showToast(error.message || 'ไม่สามารถโหลดข้อมูลกิจกรรมได้', 'error');
      });
  };

  useEffect(() => {
    if (!token) return;
    fetchEvents();
  }, [token]);

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

  const handleBulkDelete = async () => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมที่เลือกทั้ง ${selectedIds.length} รายการ?`)) {
      try {
        await Promise.all(
          selectedIds.map((id) =>
            fetch(`http://localhost:5001/organizer/delete_event/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        );
        setSelectedIds([]);
        fetchEvents();
        showToast('ลบรายการที่เลือกเรียบร้อยแล้ว', 'success');
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบหลายรายการ', 'error');
      }
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
      delEvent(id);
    }
  };

  // 🖼️ จัดการไฟล์เมื่อยูสเซอร์เลือกรูปภาพ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setThumbnailFile(null);
    setPreviewUrl(null);
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormEvent({
      ...EMPTY_EVENT,
      date: new Date().toISOString().split('T')[0],
      time: '18:00'
    });
    setThumbnailFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: EventItem) => {
    setModalMode('edit');
    setFormEvent(event);
    setThumbnailFile(null);
    // ✅ เรียกใช้ Route /organizer/image/:filename ให้ตรงกับ Backend Express
    setPreviewUrl(event.thumbnail ? `http://localhost:5001/organizer/image/${event.thumbnail}` : null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formEvent.name?.trim() || !formEvent.location?.trim() || !formEvent.date) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('name', formEvent.name);
    formData.append('place', formEvent.location);
    formData.append('type', formEvent.category);
    formData.append('start_date', `${formEvent.date} ${formEvent.time}:00`);
    formData.append('description', formEvent.description || '');
    formData.append('theme', formEvent.theme || '');
    formData.append('status', formEvent.status);
    formData.append('price', String(formEvent.price));
    formData.append('max_seat', String(formEvent.ticketsTotal));
    formData.append('is_active', String(formEvent.status === 'Published' ? 1 : 0));

    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    if (modalMode === 'add') {
      fetch('http://localhost:5001/organizer/add_event', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
        .then(async (response) => {
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Server responded with status ${response.status}`);
          }
          return response.text();
        })
        .then(() => {
          fetchEvents();
          showToast('สร้างกิจกรรมใหม่และบันทึกลงระบบสำเร็จแล้ว!', 'success');
          setIsModalOpen(false);
        })
        .catch((error: Error) => {
          console.error('Fetch Error:', error);
          showToast(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
        });
    } else {
      // 💾 โหมดแก้ไข (Edit Event Mode)
      fetch(`http://localhost:5001/organizer/edit_event/${formEvent.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
        .then(async (response) => {
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Server responded with status ${response.status}`);
          }
          return response.text();
        })
        .then(() => {
          fetchEvents();
          showToast('แก้ไขข้อมูลกิจกรรมเรียบร้อย!', 'success');
          setIsModalOpen(false);
        })
        .catch((error: Error) => {
          console.error('Edit Error:', error);
          showToast(error.message || 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม', 'error');
        });
    }
  };

  const inputClassName = "mt-input";
  const labelClassName = "block text-sm font-bold text-gray-300 mb-1";

  return (
    <div className="flex min-h-screen bg-neutral-900 overflow-hidden">
      <SidebarComponent isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="mt-dashboard-header flex items-center justify-between p-4 bg-neutral-800/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white focus:outline-none cursor-pointer p-1 rounded-lg hover:bg-white/5"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-white">Organizer Management</h1>
          </div>
        </header>

        <main className="mt-dashboard-main flex-1 p-6 w-full max-w-7xl mx-auto">
          {toast && (
            <div
              className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 text-white font-medium border ${
                toast.type === "success"
                  ? "mt-btn-primary border-transparent"
                  : toast.type === "error"
                    ? "bg-red-600/20 border-red-500/40 text-red-400"
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
                    className="mt-badge mt-badge-muted px-3 py-1.5 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
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
                      const ticketsSold = event.ticketsSold ?? 0;
                      const ticketProgress = event.ticketsTotal ? (ticketsSold / event.ticketsTotal) * 100 : 0;
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
                            <div className="flex items-center gap-3">
                              {event.thumbnail ? (
                                <img
                                  src={`http://localhost:5001/organizer/image/${event.thumbnail}`}
                                  alt={event.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center text-xs text-gray-400 border border-white/5">
                                  🖼️
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-[15px]">{event.name}</span>
                                <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-violet-600/20 text-violet-400 border border-violet-400/20 w-max">
                                  {event.category}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white font-medium">{event.date}</div>
                            <div className="text-xs text-violet-400">⏱️ {event.time} น.</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">📍 {event.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                            {!event.price ? (
                              <span className="mt-badge mt-badge-success px-2 py-1 rounded-md">ฟรี</span>
                            ) : (
                              `฿${event.price.toLocaleString()}`
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col w-36">
                              <div className="flex justify-between items-center text-xs font-medium text-gray-400 mb-1">
                                <span>{ticketsSold} / {event.ticketsTotal} ใบ</span>
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
                                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mt-surface w-full max-w-2xl overflow-hidden bg-neutral-800 rounded-2xl border border-white/5 shadow-2xl">
            <div className="px-6 py-4 bg-neutral-800/80 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-white">
                {modalMode === "add" ? "🔮 สร้างกิจกรรมใหม่" : "✏️ แก้ไขข้อมูลกิจกรรม"}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* 🖼️ ส่วนอัปโหลดรูปภาพกิจกรรม (Thumbnail Upload) */}
                <div>
                  <label className={labelClassName}>รูปภาพปกกิจกรรม (Thumbnail)</label>
                  {previewUrl ? (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/10 group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-all duration-200 cursor-pointer shadow-lg"
                        title="ลบรูปภาพ"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-xl cursor-pointer bg-neutral-900/50 hover:bg-neutral-900/80 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-violet-400 animate-bounce" />
                        <p className="mb-1 text-sm text-gray-300 font-medium">
                          คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP (ไม่เกิน 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className={labelClassName}>ชื่อกิจกรรม <span className="text-violet-400">*</span></label>
                  <input type="text" required value={formEvent.name || ""} onChange={(e) => setFormEvent({ ...formEvent, name: e.target.value })} placeholder="ใส่ชื่อกิจกรรมให้น่าสนใจ..." className={inputClassName} />
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
                  <textarea rows={3} value={formEvent.description || ""} onChange={(e) => setFormEvent({ ...formEvent, description: e.target.value })} placeholder="เขียนอธิบายความน่าสนใจของกิจกรรม..." className={`${inputClassName} resize-none`}></textarea>
                </div>
              </div>

              <div className="px-6 py-4 bg-neutral-800 border-t border-white/5 flex justify-end items-center gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-gray-300 border border-white/10 font-medium rounded-xl transition-all duration-200 cursor-pointer">
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