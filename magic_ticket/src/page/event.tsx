import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Menu, Plus, Search, Calendar, MapPin, X, ChevronDown, Navigation, Crosshair,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchOrganizerEventsList, createOrganizerEvent, type OrganizerEvent } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
const EVENT_TYPES = ["Concert", "Conference", "Exhibition", "Party", "Festival", "Sport", "Other"];

interface CreateEventForm {
  name: string; description: string; type: string; theme: string;
  start_date: string; end_date: string;
  place_name: string; address: string;
  latitude: number; longitude: number;
}

const EMPTY_FORM: CreateEventForm = {
  name: "", description: "", type: "Concert", theme: "",
  start_date: "", end_date: "",
  place_name: "", address: "",
  latitude: 13.7563, longitude: 100.5018,
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "text-green-400 bg-green-400/10 border-green-400/20",
    pending:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  const labels: Record<string, string> = {
    approved: "Approved", pending: "Pending", rejected: "Rejected",
  };
  return (
    <span className={`mt-badge ${styles[status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── OSM static thumbnail (no interaction, no library) ───────────────────────
function OsmThumbnail({ lat, lng, height = 144 }: { lat: number; lng: number; height?: number }) {
  const bbox = [lng - 0.008, lat - 0.006, lng + 0.008, lat + 0.006].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      src={src}
      style={{ height, width: "100%", border: "none" }}
      title="map"
      loading="lazy"
      className="pointer-events-none"
      referrerPolicy="no-referrer"
    />
  );
}

// ─── Clickable Map Picker using div overlay on OSM iframe ────────────────────
// Strategy: render iframe at a zoom level, capture click position on the
// transparent overlay div, convert pixel offset to lat/lng delta.
function MapPicker({
  lat, lng, onChange,
}: {
  lat: number; lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [center, setCenter] = useState({ lat, lng });
  const [pin, setPin] = useState({ lat, lng });
  const [iframeKey, setIframeKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ZOOM = 14;

  // Recalculate iframe src whenever center changes
  const delta = 0.02;
  const bbox = [
    center.lng - delta, center.lat - delta * 0.7,
    center.lng + delta, center.lat + delta * 0.7,
  ].join(",");
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${pin.lat},${pin.lng}`;

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fracX = x / rect.width;   // 0 = left, 1 = right
    const fracY = y / rect.height;  // 0 = top, 1 = bottom

    // Convert fraction to lat/lng offset from bbox
    const lngSpan = delta * 2;
    const latSpan = delta * 1.4;
    const newLng = (center.lng - delta) + fracX * lngSpan;
    const newLat = (center.lat + delta * 0.7) - fracY * latSpan;

    const roundedLat = Math.round(newLat * 1e6) / 1e6;
    const roundedLng = Math.round(newLng * 1e6) / 1e6;

    setPin({ lat: roundedLat, lng: roundedLng });
    onChange(roundedLat, roundedLng);
    setIframeKey((k) => k + 1);
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const newPos = { lat: Math.round(latitude * 1e6) / 1e6, lng: Math.round(longitude * 1e6) / 1e6 };
      setCenter(newPos);
      setPin(newPos);
      onChange(newPos.lat, newPos.lng);
      setIframeKey((k) => k + 1);
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const data = await res.json();
      if (!data.length) { setSearchError("ไม่พบสถานที่นี้"); return; }
      const { lat: rLat, lon: rLon } = data[0];
      const newPos = { lat: parseFloat(rLat), lng: parseFloat(rLon) };
      setCenter(newPos);
      setPin(newPos);
      onChange(newPos.lat, newPos.lng);
      setIframeKey((k) => k + 1);
    } catch {
      setSearchError("ค้นหาไม่สำเร็จ");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Search box */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาสถานที่ เช่น Impact Arena..."
          className="flex-1 mt-input text-sm"
        />
        <button type="submit" disabled={searching}
          className="bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium text-violet-300 text-xs shrink-0">
          {searching ? "..." : "ค้นหา"}
        </button>
        <button type="button" onClick={locateMe} title="ตำแหน่งของฉัน"
          className="hover:bg-white/5 p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white shrink-0">
          <Crosshair size={15} />
        </button>
      </form>
      {searchError && <p className="text-red-400 text-xs">{searchError}</p>}

      {/* Map — clickable overlay on top of iframe */}
      <div className="relative border border-white/10 rounded-xl overflow-hidden" style={{ height: 240 }}>
        {/* iframe layer */}
        <iframe
          key={iframeKey}
          src={iframeSrc}
          style={{ height: "100%", width: "100%", border: "none" }}
          title="map picker"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Transparent click overlay */}
        <div
          ref={containerRef}
          onClick={handleOverlayClick}
          className="absolute inset-0 cursor-crosshair"
          title="คลิกเพื่อปักหมุด"
        />
        {/* Hint label */}
        <div className="bottom-2 left-1/2 absolute bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white/80 text-xs -translate-x-1/2 pointer-events-none">
          คลิกบนแผนที่เพื่อปักหมุด
        </div>
      </div>

      {/* Coord display (readonly, editable manually) */}
      <div className="gap-2 grid grid-cols-2">
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Latitude</label>
          <input type="number" step="any" value={pin.lat}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) { setPin((p) => ({ ...p, lat: v })); setCenter((c) => ({ ...c, lat: v })); onChange(v, pin.lng); setIframeKey((k) => k + 1); }
            }}
            className="mt-input font-mono text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Longitude</label>
          <input type="number" step="any" value={pin.lng}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) { setPin((p) => ({ ...p, lng: v })); setCenter((c) => ({ ...c, lng: v })); onChange(pin.lat, v); setIframeKey((k) => k + 1); }
            }}
            className="mt-input font-mono text-sm" />
        </div>
      </div>
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────
function CreateEventModal({
  organizerId, onClose, onCreated,
}: {
  organizerId: number; onClose: () => void; onCreated: (e: OrganizerEvent) => void;
}) {
  const [form, setForm] = useState<CreateEventForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CreateEventForm>(key: K, val: CreateEventForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.place_name.trim() || !form.start_date || !form.end_date) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ"); return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น"); return;
    }
    setIsSubmitting(true); setError(null);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const result = await createOrganizerEvent(token, organizerId, {
        name: form.name.trim(), place_name: form.place_name.trim(),
        address: form.address.trim() || undefined,
        latitude: form.latitude, longitude: form.longitude,
        description: form.description.trim() || undefined,
        theme: form.theme.trim() || undefined,
        type: form.type, start_date: form.start_date, end_date: form.end_date,
      });
      onCreated({
        id: result.eventId, name: form.name.trim(), place_name: form.place_name.trim(),
        address: form.address.trim() || null,
        latitude: String(form.latitude), longitude: String(form.longitude),
        cover_image: "", description: form.description.trim() || null,
        theme: form.theme.trim() || null, status: "pending", is_active: true,
        start_date: form.start_date, end_date: form.end_date,
        type_name: form.type, organizer_id: organizerId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="z-[100] fixed inset-0 flex justify-center items-start bg-black/70 p-4 py-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] shadow-2xl border border-white/10 rounded-2xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-white/5 border-b">
          <h2 className="font-bold text-white text-lg">สร้าง Event ใหม่</h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && (
            <p className="bg-red-500/10 px-4 py-3 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</p>
          )}

          <div className="space-y-1.5">
            <label className="mt-label">ชื่องาน <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="เช่น Magic Harmony 2026 Concert" className="mt-input" />
          </div>

          <div className="space-y-1.5">
            <label className="mt-label">รายละเอียด <span className="text-red-400">*</span></label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} placeholder="อธิบายเกี่ยวกับงานนี้" className="mt-input resize-none" />
          </div>

          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <label className="mt-label">ประเภทงาน <span className="text-red-400">*</span></label>
              <div className="relative">
                <select value={form.type} onChange={(e) => set("type", e.target.value)}
                  className="mt-input appearance-none cursor-pointer">
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="mt-label">ธีมงาน</label>
              <input value={form.theme} onChange={(e) => set("theme", e.target.value)}
                placeholder="ไม่บังคับ" className="mt-input" />
            </div>
          </div>

          <div className="gap-3 grid grid-cols-2">
            <div className="space-y-1.5">
              <label className="mt-label">วันเวลาเริ่มงาน <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)} className="mt-input cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <label className="mt-label">วันเวลาจบงาน <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)} className="mt-input cursor-pointer" />
            </div>
          </div>

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

          <div className="space-y-1.5">
            <label className="mt-label">
              ตำแหน่งบนแผนที่ <span className="text-red-400">*</span>
            </label>
            <MapPicker
              lat={form.latitude} lng={form.longitude}
              onChange={(lat, lng) => { set("latitude", lat); set("longitude", lng); }}
            />
          </div>

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
          <p className="text-gray-600 text-xs text-center">
            status ตั้งต้นเป็น "pending" จนกว่า Admin จะตรวจสอบ
          </p>
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

  return (
    <div className="flex flex-col mt-surface overflow-hidden">
      {hasCoords && (
        <div className="w-full h-36 overflow-hidden">
          <OsmThumbnail lat={lat} lng={lng} height={144} />
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{event.name}</p>
            <span className="inline-flex items-center bg-violet-600/20 mt-0.5 px-2 py-0.5 rounded text-violet-400 text-xs">
              {event.type_name}
            </span>
          </div>
          <StatusBadge status={event.status} />
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
  const organizerId = Number(id);

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showCreate, setShowCreate] = useState(false);

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
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
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
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-gray-400 text-xs">
              {events.length} งาน
            </span>
          )}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl font-semibold text-white text-sm cursor-pointer">
          <Plus size={18} /> สร้าง Event
        </button>
      </header>

      <main className="mt-dashboard-main">
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
            <button onClick={() => setShowCreate(true)}
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

      {showCreate && (
        <CreateEventModal
          organizerId={organizerId}
          onClose={() => setShowCreate(false)}
          onCreated={(newEvent) => { setEvents((prev) => [newEvent, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
