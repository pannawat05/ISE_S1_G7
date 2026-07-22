import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Menu, Plus, Search, Calendar, MapPin, X, ChevronDown,
  Crosshair, ImageIcon, Trash2, Pencil,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchOrganizerEventsList, createOrganizerEvent, type OrganizerEvent } from "@/api/organizer";
import { fetchEventTypes, type EventType } from "@/api/sysadmin";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { useLeaflet } from "@/hooks/useLeaflet";
import { API_BASE } from "@/api/client";

// ─── Constants ────────────────────────────────────────────────────────────────
// Removed hard-coded EVENT_TYPES - will fetch from API

declare global {
  interface Window { L: typeof import("leaflet"); }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreateEventForm {
  name: string; description: string; type_id: number; theme: string;
  start_date: string; end_date: string;
  place_name: string; address: string;
  latitude: number; longitude: number;
}

const EMPTY_FORM: CreateEventForm = {
  name: "", description: "", type_id: 0, theme: "",
  start_date: "", end_date: "",
  place_name: "", address: "",
  latitude: 13.7563, longitude: 100.5018,
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    approved: "text-green-400 bg-green-400/10 border-green-400/20",
    pending:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  const l: Record<string, string> = { approved: "Approved", pending: "Pending", rejected: "Rejected" };
  return (
    <span className={`mt-badge ${s[status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
      {l[status] ?? status}
    </span>
  );
}

// ─── Leaflet Map Picker (fully interactive via CDN) ───────────────────────────
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

  // Reverse geocode: lat/lng → place name
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

  // Init map once Leaflet CDN is ready
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

  // Sync marker when lat/lng changes from outside
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  // ── Search: use button click, NOT form submit, to avoid page reload ──
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
      {/* Search bar — NO <form> to prevent page reload */}
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
      {!ready && <div className="flex justify-center items-center border border-white/10 rounded-xl h-60 text-gray-500 text-sm">กำลังโหลดแผนที่...</div>}
      <div ref={mapDivRef}
        className={`overflow-hidden rounded-xl border border-white/10 transition-opacity ${ready ? "opacity-100" : "opacity-0 h-0"}`}
        style={{ height: 260 }}
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
      <p className="text-gray-600 text-xs">คลิก/ลากหมุด หรือค้นหาสถานที่ — ชื่อจะถูกเติมอัตโนมัติ</p>
    </div>
  );
}

// ─── Image Upload Zone with real drag-to-reorder ─────────────────────────────
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

  // ── Item drag-to-reorder ──
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

  // ── Cover (single) — show image preview instead of drop zone ──
  if (!multiple && files[0]) {
    return (
      <div className="space-y-2">
        <label className="mt-label">{label}</label>
        <div className="group relative border border-white/10 rounded-xl overflow-hidden">
          <img
            src={URL.createObjectURL(files[0])}
            alt="cover preview"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 flex justify-center items-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium text-white text-xs"
            >
              เปลี่ยนรูป
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="bg-red-600/80 hover:bg-red-600 p-1.5 rounded-full text-white"
            >
              <Trash2 size={15} />
            </button>
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors ${
          draggingOver ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-black/20 hover:border-violet-500/50 hover:bg-violet-500/5"
        }`}
      >
        <ImageIcon size={26} className="text-gray-500" />
        <p className="text-gray-400 text-sm">
          {multiple ? "อัปโหลดได้หลายรูป — ลากรูปเพื่อเรียงลำดับ" : "อัปโหลด 1 รูป ใช้เป็นภาพหลักของ Event"}
        </p>
        <p className="text-gray-600 text-xs">PNG/JPG ไม่เกิน 10MB ต่อรูป</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => addFiles(e.target.files)} />

      {files.length > 0 && (
        <div className={multiple ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "flex"}>
          {files.map((file, i) => (
            <div
              key={i}
              draggable={multiple}
              onDragStart={() => onItemDragStart(i)}
              onDragOver={(e) => onItemDragOver(e, i)}
              onDragEnd={onItemDragEnd}
              className="group relative border border-white/10 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <img
                src={URL.createObjectURL(file)} alt={file.name}
                className={multiple ? "h-20 w-full object-cover select-none" : "h-32 w-full object-cover"}
              />
              <div className="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                  className="bg-red-600/80 hover:bg-red-600 p-1 rounded-full text-white">
                  <Trash2 size={14} />
                </button>
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

// ─── Create Event Modal ───────────────────────────────────────────────────────
function CreateEventModal({ organizerId, onClose, onCreated }: {
  organizerId: number; onClose: () => void; onCreated: (e: OrganizerEvent) => void;
}) {
  const [form, setForm] = useState<CreateEventForm>(EMPTY_FORM);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);

  // Fetch event types on mount
  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) return;
    fetchEventTypes(token)
      .then((types) => {
        setEventTypes(types);
        // Set first type as default if available
        if (types.length > 0 && form.type_id === 0) {
          setForm(prev => ({ ...prev, type_id: types[0].id }));
        }
      })
      .catch(console.error)
      .finally(() => setTypesLoading(false));
  }, []);

  function set<K extends keyof CreateEventForm>(key: K, val: CreateEventForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.place_name.trim() || !form.start_date || !form.end_date || !form.type_id) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ"); return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น"); return;
    }
    setIsSubmitting(true); setError(null);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (coverFiles[0]) fd.append("cover_image", coverFiles[0]);
      extraFiles.forEach((f) => fd.append("event_images", f));

      const result = await createOrganizerEvent(token, organizerId, fd);
      const selectedType = eventTypes.find(t => t.id === form.type_id);

      const coverUrl = coverFiles[0] ? URL.createObjectURL(coverFiles[0]) : "";
      onCreated({
        id: result.eventId, name: form.name.trim(), place_name: form.place_name.trim(),
        address: form.address.trim() || null,
        latitude: String(form.latitude), longitude: String(form.longitude),
        cover_image: coverUrl, description: form.description.trim() || null,
        theme: form.theme.trim() || null, status: "pending", is_active: true,
        start_date: form.start_date, end_date: form.end_date,
        type_name: selectedType?.name ?? "", organizer_id: organizerId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="z-[100] fixed inset-0 flex justify-center items-start bg-black/70 p-4 py-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111] shadow-2xl border border-white/10 rounded-2xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-white/5 border-b">
          <h2 className="font-bold text-white text-lg">สร้าง Event ใหม่</h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && <p className="bg-red-500/10 px-4 py-3 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</p>}

          {/* ชื่องาน */}
          <div className="space-y-1.5">
            <label className="mt-label">ชื่องาน <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="เช่น Magic Harmony 2026 Concert" className="mt-input" />
          </div>

          {/* รายละเอียด */}
          <div className="space-y-1.5">
            <label className="mt-label">รายละเอียด <span className="text-red-400">*</span></label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} placeholder="อธิบายเกี่ยวกับงานนี้" className="mt-input resize-none" />
          </div>

          {/* ประเภท + ธีม */}
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <label className="mt-label">ประเภทงาน <span className="text-red-400">*</span></label>
              <div className="relative">
                <select 
                  value={form.type_id} 
                  onChange={(e) => set("type_id", Number(e.target.value))}
                  disabled={typesLoading || eventTypes.length === 0}
                  className="disabled:opacity-50 mt-input appearance-none cursor-pointer"
                >
                  {typesLoading && <option value={0}>กำลังโหลด...</option>}
                  {!typesLoading && eventTypes.length === 0 && <option value={0}>ไม่มีประเภท</option>}
                  {!typesLoading && eventTypes.length > 0 && form.type_id === 0 && (
                    <option value={0}>เลือกประเภท</option>
                  )}
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-gray-600 text-xs">ดึงจากตาราง event_types</p>
            </div>
            <div className="space-y-1.5">
              <label className="mt-label">ธีมงาน</label>
              <input value={form.theme} onChange={(e) => set("theme", e.target.value)}
                placeholder="ไม่บังคับ" className="mt-input" />
            </div>
          </div>

          {/* ภาพปกงาน */}
          <ImageUploadZone
            label="ภาพปกงาน (cover_image) *"
            files={coverFiles}
            onChange={setCoverFiles}
          />

          {/* รูปภาพเพิ่มเติม */}
          <ImageUploadZone
            label="รูปภาพเพิ่มเติม (event_images)"
            multiple
            files={extraFiles}
            onChange={setExtraFiles}
          />

          {/* วันเวลา */}
          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <label className="mt-label">วันเวลาเริ่มงาน (start_date) <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)} className="mt-input cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <label className="mt-label">วันเวลาจบงาน (end_date) <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)} className="mt-input cursor-pointer" />
            </div>
          </div>

          {/* สถานที่ */}
          <div className="space-y-1.5">
            <label className="mt-label">ชื่อสถานที่ (place_name) <span className="text-red-400">*</span></label>
            <input value={form.place_name} onChange={(e) => set("place_name", e.target.value)}
              placeholder="เช่น อิมแพ็ค อารีน่า เมืองทองธานี" className="mt-input" />
          </div>
          <div className="space-y-1.5">
            <label className="mt-label">ที่อยู่ (address)</label>
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)}
              rows={2} placeholder="ที่อยู่แบบเต็ม (ไม่บังคับ)" className="mt-input resize-none" />
          </div>

          {/* Map */}
          <div className="space-y-1.5">
            <label className="mt-label">ตำแหน่งบนแผนที่ (latitude / longitude) <span className="text-red-400">*</span></label>
            <LeafletMapPicker
              lat={form.latitude} lng={form.longitude}
              onChange={(lat, lng) => { set("latitude", lat); set("longitude", lng); }}
              onPlaceName={(name) => { if (!form.place_name) set("place_name", name); }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-white/5 border-t">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-2.5 border border-white/10 rounded-xl font-semibold text-white text-sm">
              ยกเลิก
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold text-white text-sm disabled:cursor-not-allowed">
              {isSubmitting ? "กำลังสร้าง..." : "สร้าง Event"}
            </button>
          </div>
          <p className="text-gray-600 text-xs text-center">status ตั้งต้นเป็น "pending" จนกว่า Admin จะตรวจสอบ</p>
        </form>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event }: { event: OrganizerEvent }) {
  const start = new Date(event.start_date);
  const dateStr = start.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const lat = parseFloat(event.latitude);
  const lng = parseFloat(event.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
  const coverSrc = event.cover_image
    ? (event.cover_image.startsWith("http") ? event.cover_image : `${API_BASE}${event.cover_image}`)
    : null;

  return (
    <div className="flex flex-col mt-surface overflow-hidden">
      {coverSrc ? (
        <div className="w-full h-36 overflow-hidden">
          <img src={coverSrc} alt={event.name} className="w-full h-full object-cover" />
        </div>
      ) : hasCoords ? (
        <div className="w-full h-36 overflow-hidden">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.006},${lng + 0.008},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`}
            style={{ height: "100%", width: "100%", border: "none" }}
            title="map" loading="lazy" className="pointer-events-none" referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{event.name}</p>
            <span className="inline-flex bg-violet-600/20 mt-0.5 px-2 py-0.5 rounded text-violet-400 text-xs">
              {event.type_name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={event.status} />
            <Link
              to={`/profile/events/${event.organizer_id}/edit/${event.id}`}
              className="hover:bg-elevated p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="แก้ไข Event"
            >
              <Pencil size={14} />
            </Link>
          </div>
        </div>
        <div className="space-y-1.5 text-gray-400 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-violet-400 shrink-0" />
            <span>{dateStr} · {timeStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-violet-400 shrink-0" />
            <span className="truncate">{event.place_name}</span>
          </div>
          {hasCoords && (
            <a href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
              <MapPin size={12} /> เปิดใน Google Maps
            </a>
          )}
        </div>
        {event.description && (
          <p className="text-gray-500 text-xs line-clamp-2">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { setIsOpen } = useProfileSidebar();
  const navigate = useNavigate();
  const organizerId = Number(id);

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || isNaN(organizerId)) { setIsLoading(false); return; }
    fetchOrganizerEventsList(token, organizerId)
      .then(setEvents)
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setIsLoading(false));
  }, [organizerId]);

  const filtered = events.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      || e.place_name.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === "all" || e.status === statusFilter);
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-2xl">Events</h1>
          {!isLoading && (
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-gray-400 text-xs">{events.length} งาน</span>
          )}
        </div>
        <button onClick={() => navigate(`/profile/events/${organizerId}/create`)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl font-semibold text-white text-sm cursor-pointer">
          <Plus size={18} /> สร้าง Event
        </button>
      </header>

      <main className="mt-dashboard-main">
        {/* Search + Filter */}
        <div className="flex sm:flex-row flex-col gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่องาน หรือสถานที่..." className="mt-input pl-9" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="mt-input pr-8 appearance-none cursor-pointer">
              <option value="all">สถานะทั้งหมด</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {isLoading && (
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse" />)}
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 text-red-400 text-sm">{fetchError}</div>
        )}
        {!isLoading && !fetchError && events.length === 0 && (
          <div className="flex flex-col items-center gap-4 mt-surface py-16 text-center">
            <div className="flex justify-center items-center bg-violet-600/10 rounded-2xl w-16 h-16">
              <Calendar size={32} className="text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">ยังไม่มี Event</p>
              <p className="mt-1 text-gray-500 text-sm">สร้าง event แรกของ organizer นี้เพื่อเริ่มต้น</p>
            </div>
            <button onClick={() => navigate(`/profile/events/${organizerId}/create`)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-5 py-2.5 rounded-xl font-semibold text-white text-sm">
              <Plus size={16} /> สร้าง Event แรก
            </button>
          </div>
        )}
        {!isLoading && !fetchError && events.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 mt-surface py-12 text-center">
            <Search size={28} className="text-gray-600" />
            <p className="text-gray-400 text-sm">ไม่พบ event ที่ตรงกับการค้นหา</p>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </main>


    </div>
  );
}
