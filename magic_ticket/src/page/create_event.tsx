import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, Calendar, MapPin, ImageIcon,
  Trash2, Crosshair, Loader2,
} from "lucide-react";
import Cookies from "js-cookie";
import { createOrganizerEvent } from "@/api/organizer";
import { fetchEventTypes, type EventType } from "@/api/sysadmin";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { useLeaflet } from "@/hooks/useLeaflet";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreateEventForm {
  name: string;
  description: string;
  type_id: number;
  theme: string;
  start_date: string;
  end_date: string;
  place_name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const EMPTY_FORM: CreateEventForm = {
  name: "", description: "", type_id: 0, theme: "",
  start_date: "", end_date: "",
  place_name: "", address: "",
  latitude: 13.7563, longitude: 100.5018,
};

declare global {
  interface Window { L: typeof import("leaflet"); }
}

// ─── Leaflet Map Picker ───────────────────────────────────────────────────────
function LeafletMapPicker({ lat, lng, onChange, onPlaceName }: {
  lat: number; lng: number;
  onChange: (lat: number, lng: number) => void;
  onPlaceName?: (name: string) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const { ready } = useLeaflet();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function reverseGeocode(rLat: number, rLng: number) {
    if (!onPlaceName) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${rLat}&lon=${rLng}&format=json`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const data = await res.json();
      if (data?.display_name) onPlaceName(data.display_name.split(",")[0].trim());
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = window.L;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    const map = L.map(mapDivRef.current).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const { lat: mLat, lng: mLng } = marker.getLatLng();
      const rLat = Math.round(mLat * 1e6) / 1e6;
      const rLng = Math.round(mLng * 1e6) / 1e6;
      onChange(rLat, rLng);
      reverseGeocode(rLat, rLng);
    });
    map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
      const rLat = Math.round(e.latlng.lat * 1e6) / 1e6;
      const rLng = Math.round(e.latlng.lng * 1e6) / 1e6;
      marker.setLatLng([rLat, rLng]);
      onChange(rLat, rLng);
      reverseGeocode(rLat, rLng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [ready]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  async function doSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const data = await res.json();
      if (!data.length) { setSearchError("ไม่พบสถานที่นี้"); return; }
      const rLat = parseFloat(data[0].lat);
      const rLng = parseFloat(data[0].lon);
      onChange(rLat, rLng);
      mapRef.current?.setView([rLat, rLng], 15);
      if (onPlaceName && data[0].display_name) {
        onPlaceName(data[0].display_name.split(",")[0].trim());
      }
    } catch { setSearchError("ค้นหาไม่สำเร็จ"); }
    finally { setSearching(false); }
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const rLat = Math.round(coords.latitude * 1e6) / 1e6;
      const rLng = Math.round(coords.longitude * 1e6) / 1e6;
      onChange(rLat, rLng);
      mapRef.current?.setView([rLat, rLng], 15);
      reverseGeocode(rLat, rLng);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
          placeholder="ค้นหาสถานที่ เช่น Impact Arena..."
          className="flex-1 mt-input text-sm"
        />
        <button type="button" onClick={doSearch} disabled={searching}
          className="bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium text-violet-300 text-xs shrink-0">
          {searching ? "..." : "ค้นหา"}
        </button>
        <button type="button" onClick={locateMe} title="ตำแหน่งของฉัน"
          className="hover:bg-white/5 p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white shrink-0">
          <Crosshair size={15} />
        </button>
      </div>
      {searchError && <p className="text-red-400 text-xs">{searchError}</p>}
      {!ready && (
        <div className="flex justify-center items-center border border-white/10 rounded-xl h-64 text-gray-500 text-sm">
          กำลังโหลดแผนที่...
        </div>
      )}
      <div ref={mapDivRef}
        className={`overflow-hidden rounded-xl border border-white/10 transition-opacity ${ready ? "opacity-100" : "opacity-0 h-0"}`}
        style={{ height: 300 }}
      />
      <div className="gap-2 grid grid-cols-2">
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Latitude</label>
          <input type="number" step="any" value={lat}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v, lng); }}
            className="mt-input font-mono text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Longitude</label>
          <input type="number" step="any" value={lng}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(lat, v); }}
            className="mt-input font-mono text-sm" />
        </div>
      </div>
      <p className="text-gray-600 text-xs">คลิก/ลากหมุด หรือค้นหาสถานที่ — ชื่อสถานที่จะถูกเติมอัตโนมัติ</p>
    </div>
  );
}

// ─── Image Upload Zone ────────────────────────────────────────────────────────
function ImageUploadZone({ label, multiple = false, files, onChange }: {
  label: string; multiple?: boolean;
  files: File[]; onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
    );
    onChange(multiple ? [...files, ...valid] : [valid[0]].filter(Boolean));
  }

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault();
    setDraggingOver(false);
    if (dragIndexRef.current === null) addFiles(e.dataTransfer.files);
  }

  function onItemDragStart(i: number) { dragIndexRef.current = i; }
  function onItemDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === i) return;
    const next = [...files];
    const [moved] = next.splice(dragIndexRef.current, 1);
    next.splice(i, 0, moved);
    dragIndexRef.current = i;
    onChange(next);
  }
  function onItemDragEnd() { dragIndexRef.current = null; }

  if (!multiple && files[0]) {
    return (
      <div className="space-y-2">
        <label className="mt-label">{label}</label>
        <div className="group relative border border-white/10 rounded-xl overflow-hidden">
          <img src={URL.createObjectURL(files[0])} alt="cover" className="w-full h-56 object-cover" />
          <div className="absolute inset-0 flex justify-center items-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white text-xs">เปลี่ยนรูป</button>
            <button type="button" onClick={() => onChange([])}
              className="bg-red-600/80 hover:bg-red-600 p-1.5 rounded-full text-white"><Trash2 size={15} /></button>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="mt-label">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (dragIndexRef.current === null) setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDropZone}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
          draggingOver ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-black/20 hover:border-violet-500/50 hover:bg-violet-500/5"
        }`}
      >
        <ImageIcon size={28} className="text-gray-500" />
        <p className="text-gray-400 text-sm">
          {multiple ? "อัปโหลดได้หลายรูป — ลากเพื่อเรียงลำดับ" : "อัปโหลด 1 รูปสำหรับภาพปกงาน"}
        </p>
        <p className="text-gray-600 text-xs">PNG / JPG ไม่เกิน 10 MB ต่อรูป</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => addFiles(e.target.files)} />
      {files.length > 0 && (
        <div className={multiple ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "flex"}>
          {files.map((file, i) => (
            <div key={i} draggable={multiple}
              onDragStart={() => onItemDragStart(i)}
              onDragOver={(e) => onItemDragOver(e, i)}
              onDragEnd={onItemDragEnd}
              className="group relative border border-white/10 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing">
              <img src={URL.createObjectURL(file)} alt={file.name}
                className={multiple ? "h-20 w-full object-cover select-none" : "h-40 w-full object-cover"} />
              <div className="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                  className="bg-red-600/80 hover:bg-red-600 p-1 rounded-full text-white"><Trash2 size={14} /></button>
              </div>
              {multiple && (
                <span className="right-0 bottom-0 left-0 absolute bg-black/60 px-1 py-0.5 text-gray-300 text-xs text-center pointer-events-none">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useProfileSidebar();
  const organizerId = Number(id);

  const [form, setForm] = useState<CreateEventForm>(EMPTY_FORM);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);

  // Fetch event types from DB
  useEffect(() => {
    fetchEventTypes()
      .then((types) => {
        setEventTypes(types);
        if (types.length > 0) setForm((prev) => ({ ...prev, type_id: types[0].id }));
      })
      .catch(console.error)
      .finally(() => setTypesLoading(false));
  }, []);

  function set<K extends keyof CreateEventForm>(key: K, val: CreateEventForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("กรุณากรอกชื่องาน"); return; }
    if (!form.place_name.trim()) { setError("กรุณากรอกชื่อสถานที่"); return; }
    if (!form.start_date || !form.end_date) { setError("กรุณาเลือกวันเวลาเริ่มและสิ้นสุด"); return; }
    if (form.type_id === 0) { setError("กรุณาเลือกประเภทงาน"); return; }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น"); return;
    }

    setIsSubmitting(true); setError(null);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("place_name", form.place_name.trim());
      fd.append("type_id", String(form.type_id));
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date);
      fd.append("latitude", String(form.latitude));
      fd.append("longitude", String(form.longitude));
      // Optional fields — only append if filled
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (form.theme.trim()) fd.append("theme", form.theme.trim());
      if (form.address.trim()) fd.append("address", form.address.trim());
      if (coverFiles[0]) fd.append("cover_image", coverFiles[0]);
      extraFiles.forEach((f) => fd.append("event_images", f));

      await createOrganizerEvent(token, organizerId, fd);
      // Go back to events list after success
      navigate(`/profile/events/${organizerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white">
            <span className="sr-only">เปิดเมนู</span>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button onClick={() => navigate(`/profile/events/${organizerId}`)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <ArrowLeft size={18} />
            <span>กลับ</span>
          </button>
          <span className="text-white/20">/</span>
          <h1 className="font-semibold text-white text-xl">สร้าง Event ใหม่</h1>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 px-4 md:px-8 py-6 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">

            {error && (
              <div className="bg-red-500/10 px-4 py-3 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* ── Section: ข้อมูลทั่วไป ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                ข้อมูลทั่วไป
              </h2>

              {/* ชื่องาน */}
              <div className="space-y-1.5">
                <label className="mt-label">ชื่องาน <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="เช่น Magic Harmony 2026 Concert" className="mt-input" />
              </div>

              {/* รายละเอียด - ไม่บังคับ */}
              <div className="space-y-1.5">
                <label className="mt-label">
                  รายละเอียด
                  <span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
                </label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                  rows={4} placeholder="อธิบายเกี่ยวกับงานนี้..." className="mt-input resize-none" />
              </div>

              {/* ประเภท + ธีม */}
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="mt-label">ประเภทงาน <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select value={form.type_id} onChange={(e) => set("type_id", Number(e.target.value))}
                      disabled={typesLoading || eventTypes.length === 0}
                      className="disabled:opacity-50 mt-input pr-8 w-full appearance-none cursor-pointer">
                      {typesLoading && <option value={0}>กำลังโหลด...</option>}
                      {!typesLoading && eventTypes.length === 0 && <option value={0}>ไม่มีประเภท</option>}
                      {!typesLoading && form.type_id === 0 && <option value={0}>เลือกประเภท</option>}
                      {eventTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="mt-label">
                    ธีมงาน
                    <span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
                  </label>
                  <input value={form.theme} onChange={(e) => set("theme", e.target.value)}
                    placeholder="เช่น Cyberpunk, Fantasy..." className="mt-input" />
                </div>
              </div>
            </section>

            {/* ── Section: รูปภาพ ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                รูปภาพ
                <span className="ml-2 font-normal text-gray-600 text-xs normal-case">(ไม่จำเป็น)</span>
              </h2>
              <ImageUploadZone label="ภาพปกงาน (Cover Image)" files={coverFiles} onChange={setCoverFiles} />
              <ImageUploadZone label="รูปภาพเพิ่มเติม" multiple files={extraFiles} onChange={setExtraFiles} />
            </section>

            {/* ── Section: วันเวลา ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                วันเวลา
              </h2>
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 mt-label">
                    <Calendar size={14} className="text-violet-400" />
                    วันเวลาเริ่มงาน <span className="text-red-400">*</span>
                  </label>
                  <input type="datetime-local" value={form.start_date}
                    onChange={(e) => set("start_date", e.target.value)} className="mt-input cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 mt-label">
                    <Calendar size={14} className="text-violet-400" />
                    วันเวลาสิ้นสุด <span className="text-red-400">*</span>
                  </label>
                  <input type="datetime-local" value={form.end_date}
                    onChange={(e) => set("end_date", e.target.value)} className="mt-input cursor-pointer" />
                </div>
              </div>
            </section>

            {/* ── Section: สถานที่ ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                สถานที่จัดงาน
              </h2>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 mt-label">
                  <MapPin size={14} className="text-violet-400" />
                  ชื่อสถานที่ <span className="text-red-400">*</span>
                </label>
                <input value={form.place_name} onChange={(e) => set("place_name", e.target.value)}
                  placeholder="เช่น อิมแพ็ค อารีน่า เมืองทองธานี" className="mt-input" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">
                  ที่อยู่
                  <span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
                </label>
                <textarea value={form.address} onChange={(e) => set("address", e.target.value)}
                  rows={2} placeholder="ที่อยู่แบบเต็ม เช่น 99 ถ.แจ้งวัฒนะ ปากเกร็ด นนทบุรี" className="mt-input resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">ตำแหน่งบนแผนที่</label>
                <LeafletMapPicker
                  lat={form.latitude} lng={form.longitude}
                  onChange={(lat, lng) => { set("latitude", lat); set("longitude", lng); }}
                  onPlaceName={(name) => { if (!form.place_name) set("place_name", name); }}
                />
              </div>
            </section>

            {/* ── Submit ── */}
            <div className="flex gap-3 pb-8">
              <button type="button"
                onClick={() => navigate(`/profile/events/${organizerId}`)}
                disabled={isSubmitting}
                className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-3 border border-white/10 rounded-xl font-semibold text-white text-sm transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex flex-1 justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-3 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> กำลังสร้าง...</>
                ) : "สร้าง Event 🎫"}
              </button>
            </div>
            <p className="-mt-4 pb-4 text-gray-600 text-xs text-center">
              status เริ่มต้นเป็น "pending" จนกว่า Admin จะอนุมัติ
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}
