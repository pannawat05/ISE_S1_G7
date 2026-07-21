import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Menu, ArrowLeft, Save, X, ChevronDown,
  ImageIcon, Trash2, Crosshair, Plus,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchSingleEvent, updateOrganizerEvent, type OrganizerEvent, type EventImage } from "@/api/organizer";
import { API_BASE } from "@/api/client";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { useLeaflet } from "@/hooks/useLeaflet";

declare global { interface Window { L: typeof import("leaflet"); } }

const EVENT_TYPES = ["Concert","Conference","Exhibition","Party","Festival","Sport","Other"];

interface ExistingImage { id: number; url: string; display_order: number }
// ─── Leaflet Map Picker ───────────────────────────────────────────────────────
function LeafletMapPicker({ lat, lng, onChange, onPlaceName }: {
  lat: number; lng: number;
  onChange: (lat: number, lng: number) => void;
  onPlaceName?: (name: string) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const { ready } = useLeaflet();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  async function reverseGeocode(rLat: number, rLng: number) {
    if (!onPlaceName) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${rLat}&lon=${rLng}&format=json`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const d = await res.json();
      if (d?.display_name) onPlaceName(d.display_name.split(",")[0].trim());
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const { lat: mLat, lng: mLng } = marker.getLatLng();
      const rLat = Math.round(mLat * 1e6) / 1e6;
      const rLng = Math.round(mLng * 1e6) / 1e6;
      onChange(rLat, rLng); reverseGeocode(rLat, rLng);
    });
    map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
      const rLat = Math.round(e.latlng.lat * 1e6) / 1e6;
      const rLng = Math.round(e.latlng.lng * 1e6) / 1e6;
      marker.setLatLng([rLat, rLng]); onChange(rLat, rLng); reverseGeocode(rLat, rLng);
    });
    mapRef.current = map; markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [ready]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  async function doSearch() {
    if (!q.trim()) return;
    setSearching(true); setSearchErr(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const data = await res.json();
      if (!data.length) { setSearchErr("ไม่พบสถานที่นี้"); return; }
      const rLat = parseFloat(data[0].lat);
      const rLng = parseFloat(data[0].lon);
      onChange(rLat, rLng);
      mapRef.current?.setView([rLat, rLng], 15);
      if (onPlaceName && data[0].display_name)
        onPlaceName(data[0].display_name.split(",")[0].trim());
    } catch { setSearchErr("ค้นหาไม่สำเร็จ"); }
    finally { setSearching(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
          placeholder="ค้นหาสถานที่..." className="flex-1 mt-input text-sm" />
        <button type="button" onClick={doSearch} disabled={searching}
          className="bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium text-violet-300 text-xs shrink-0">
          {searching ? "..." : "ค้นหา"}
        </button>
        <button type="button" onClick={() => {
          navigator.geolocation?.getCurrentPosition(({ coords }) => {
            const rLat = Math.round(coords.latitude * 1e6) / 1e6;
            const rLng = Math.round(coords.longitude * 1e6) / 1e6;
            onChange(rLat, rLng); mapRef.current?.setView([rLat, rLng], 15); reverseGeocode(rLat, rLng);
          });
        }} className="hover:bg-white/5 p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white shrink-0">
          <Crosshair size={15} />
        </button>
      </div>
      {searchErr && <p className="text-red-400 text-xs">{searchErr}</p>}
      {!ready && <div className="flex justify-center items-center border border-white/10 rounded-xl h-60 text-gray-500 text-sm">กำลังโหลดแผนที่...</div>}
      <div ref={mapDivRef} className={`overflow-hidden rounded-xl border border-white/10 ${ready ? "opacity-100" : "opacity-0 h-0"}`} style={{ height: 260 }} />
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
    </div>
  );
}

// ─── Cover Picker: preview แทน drop zone ─────────────────────────────────────
function CoverPicker({ existingUrl, file, onChange }: {
  existingUrl: string | null; file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file
    ? URL.createObjectURL(file)
    : existingUrl
    ? (existingUrl.startsWith("http") ? existingUrl : `${API_BASE}${existingUrl}`)
    : null;

  return (
    <div className="space-y-2">
      <label className="mt-label">ภาพปกงาน (cover_image)</label>
      {preview ? (
        <div className="group relative border border-white/10 rounded-xl overflow-hidden">
          <img src={preview} alt="cover" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 flex justify-center items-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium text-white text-xs">
              เปลี่ยนรูป
            </button>
            <button type="button" onClick={() => onChange(null)}
              className="bg-red-600/80 hover:bg-red-600 p-1.5 rounded-full text-white">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()}
          className="flex flex-col justify-center items-center gap-2 bg-black/20 hover:bg-violet-500/5 py-8 border-2 border-white/10 hover:border-violet-500/50 border-dashed rounded-xl cursor-pointer">
          <ImageIcon size={26} className="text-gray-500" />
          <p className="text-gray-400 text-sm">คลิกเพื่ออัปโหลดภาพปก</p>
          <p className="text-gray-600 text-xs">PNG/JPG ไม่เกิน 10MB</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
    </div>
  );
}

// ─── Event Images Editor ──────────────────────────────────────────────────────
function EventImagesEditor({
  existing, newFiles,
  onRemoveExisting, onReorderExisting, onNewFilesChange,
}: {
  existing: ExistingImage[];
  newFiles: File[];
  onRemoveExisting: (id: number) => void;
  onReorderExisting: (reordered: ExistingImage[]) => void;
  onNewFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const existingDragRef = useRef<number | null>(null);
  const newDragRef = useRef<number | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
    );
    onNewFilesChange([...newFiles, ...valid]);
  }

  // ── Drag reorder: existing images ──
  function onExistingDragStart(i: number) { existingDragRef.current = i; }
  function onExistingDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (existingDragRef.current === null || existingDragRef.current === i) return;
    const next = [...existing];
    const [moved] = next.splice(existingDragRef.current, 1);
    next.splice(i, 0, moved);
    existingDragRef.current = i;
    onReorderExisting(next);
  }
  function onExistingDragEnd() { existingDragRef.current = null; }

  // ── Drag reorder: new files ──
  function onNewDragStart(i: number) { newDragRef.current = i; }
  function onNewDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (newDragRef.current === null || newDragRef.current === i) return;
    const next = [...newFiles];
    const [moved] = next.splice(newDragRef.current, 1);
    next.splice(i, 0, moved);
    newDragRef.current = i;
    onNewFilesChange(next);
  }
  function onNewDragEnd() { newDragRef.current = null; }

  const totalCount = existing.length + newFiles.length;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="mt-label">รูปภาพประกอบงาน (event_images)</label>
        <span className="text-gray-500 text-xs">{totalCount} รูป · ลากเพื่อเรียงลำดับ</span>
      </div>

      {/* Existing images — draggable */}
      {existing.length > 0 && (
        <div className="gap-2 grid grid-cols-3 sm:grid-cols-4">
          {existing.map((img, i) => {
            const src = img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`;
            return (
              <div
                key={img.id}
                draggable
                onDragStart={() => onExistingDragStart(i)}
                onDragOver={(e) => onExistingDragOver(e, i)}
                onDragEnd={onExistingDragEnd}
                className="group relative border border-white/10 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
              >
                <img src={src} alt="" className="w-full h-20 object-cover select-none" />
                <div className="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveExisting(img.id); }}
                    className="bg-red-600/80 hover:bg-red-600 p-1 rounded-full text-white"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {/* Show new position, not old display_order */}
                <span className="right-0 bottom-0 left-0 absolute bg-black/60 px-1 py-0.5 text-gray-300 text-xs text-center pointer-events-none">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* New files — draggable */}
      {newFiles.length > 0 && (
        <div className="gap-2 grid grid-cols-3 sm:grid-cols-4">
          {newFiles.map((f, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onNewDragStart(i)}
              onDragOver={(e) => onNewDragOver(e, i)}
              onDragEnd={onNewDragEnd}
              className="group relative border border-violet-500/40 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-20 object-cover select-none" />
              <div className="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onNewFilesChange(newFiles.filter((_, j) => j !== i)); }}
                  className="bg-red-600/80 hover:bg-red-600 p-1 rounded-full text-white"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <span className="right-0 bottom-0 left-0 absolute bg-violet-900/70 px-1 py-0.5 text-violet-300 text-xs text-center pointer-events-none">
                ใหม่ {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex justify-center items-center gap-2 py-4 border-2 border-white/10 hover:border-violet-500/50 border-dashed rounded-xl w-full text-gray-500 hover:text-violet-400 text-sm transition-colors"
      >
        <Plus size={18} /> เพิ่มรูปภาพ
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => addFiles(e.target.files)} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventEditPage() {
  const { id: orgId, eventId } = useParams<{ id: string; eventId: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useProfileSidebar();

  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Concert");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(13.7563);
  const [lng, setLng] = useState(100.5018);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function toDatetimeLocal(raw: string) {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || !orgId || !eventId) { setIsLoading(false); return; }
    fetchSingleEvent(token, Number(orgId), Number(eventId))
      .then((ev) => {
        setEvent(ev);
        setName(ev.name);
        setDescription(ev.description ?? "");
        setType(ev.type_name);
        setTheme(ev.theme ?? "");
        setStartDate(toDatetimeLocal(ev.start_date));
        setEndDate(toDatetimeLocal(ev.end_date));
        setPlaceName(ev.place_name);
        setAddress(ev.address ?? "");
        setLat(parseFloat(ev.latitude) || 13.7563);
        setLng(parseFloat(ev.longitude) || 100.5018);
        // Load existing event images from API response
        setExistingImages(
          (ev.images ?? []).map((img: EventImage) => ({
            id: img.id,
            url: img.url,
            display_order: img.display_order,
          }))
        );
      })
      .catch((err: Error) => setFetchErr(err.message))
      .finally(() => setIsLoading(false));
  }, [orgId, eventId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !placeName.trim() || !startDate || !endDate) {
      setSaveError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ"); return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setSaveError("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น"); return;
    }
    setIsSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("type", type);
      fd.append("theme", theme.trim());
      fd.append("start_date", startDate);
      fd.append("end_date", endDate);
      fd.append("place_name", placeName.trim());
      fd.append("address", address.trim());
      fd.append("latitude", String(lat));
      fd.append("longitude", String(lng));
      if (coverFile) fd.append("cover_image", coverFile);
      if (removeCover) fd.append("remove_cover", "1");
      removedImageIds.forEach((id) => fd.append("remove_image_ids[]", String(id)));
      // Send current order of existing images so backend can update display_order
      existingImages
        .filter((img) => !removedImageIds.includes(img.id))
        .forEach((img, idx) => fd.append(`reorder_images[${img.id}]`, String(idx + 1)));
      newImageFiles.forEach((f) => fd.append("event_images", f));

      await updateOrganizerEvent(token, Number(orgId), Number(eventId), fd);

      // Re-fetch updated event to sync all state
      const updated = await fetchSingleEvent(token, Number(orgId), Number(eventId));
      setEvent(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setType(updated.type_name);
      setTheme(updated.theme ?? "");
      setStartDate(toDatetimeLocal(updated.start_date));
      setEndDate(toDatetimeLocal(updated.end_date));
      setPlaceName(updated.place_name);
      setAddress(updated.address ?? "");
      setLat(parseFloat(updated.latitude) || 13.7563);
      setLng(parseFloat(updated.longitude) || 100.5018);
      setExistingImages(
        (updated.images ?? []).map((img) => ({
          id: img.id,
          url: img.url,
          display_order: img.display_order,
        }))
      );
      // Clear transient state
      setRemovedImageIds([]);
      setNewImageFiles([]);
      setCoverFile(null);
      setRemoveCover(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setIsSaving(false); }
  }

  const existingCover = event?.cover_image && !removeCover ? event.cover_image : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <Menu size={24} />
          </button>
          <button onClick={() => navigate(-1)}
            className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-white text-2xl">
            {isLoading ? "..." : `แก้ไข: ${event?.name ?? ""}`}
          </h1>
        </div>
      </header>

      <main className="mt-dashboard-main">
        {isLoading && (
          <div className="space-y-4 w-full max-w-2xl">
            {[1,2,3].map((i) => <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />)}
          </div>
        )}
        {!isLoading && fetchErr && (
          <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 max-w-2xl text-red-400 text-sm">{fetchErr}</div>
        )}

        {!isLoading && !fetchErr && event && (
          <form onSubmit={handleSave} className="space-y-5 w-full">
            {saveSuccess && (
              <div className="flex justify-between items-center bg-green-500/10 px-4 py-3 border border-green-500/30 rounded-lg text-green-400 text-sm">
                <span>บันทึกสำเร็จ</span>
                <button type="button" onClick={() => setSaveSuccess(false)}><X size={16} /></button>
              </div>
            )}
            {saveError && (
              <div className="flex justify-between items-center bg-red-500/10 px-4 py-3 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <span>{saveError}</span>
                <button type="button" onClick={() => setSaveError(null)}><X size={16} /></button>
              </div>
            )}

            {/* ข้อมูลงาน */}
            <div className="space-y-4 mt-surface p-5">
              <h2 className="font-semibold text-white text-sm">ข้อมูลงาน</h2>
              <div className="space-y-1.5">
                <label className="mt-label">ชื่องาน <span className="text-red-400">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-input" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">รายละเอียด</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-input resize-none" />
              </div>
              <div className="gap-3 grid grid-cols-2">
                <div className="space-y-1.5">
                  <label className="mt-label">ประเภทงาน <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select value={type} onChange={(e) => setType(e.target.value)} className="mt-input appearance-none cursor-pointer">
                      {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="mt-label">ธีมงาน</label>
                  <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="ไม่บังคับ" className="mt-input" />
                </div>
              </div>
              <div className="gap-3 grid grid-cols-2">
                <div className="space-y-1.5">
                  <label className="mt-label">วันเวลาเริ่มงาน <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="mt-label">วันเวลาจบงาน <span className="text-red-400">*</span></label>
                  <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-input" />
                </div>
              </div>
            </div>

            {/* ภาพปก */}
            <div className="mt-surface p-5">
              <CoverPicker
                existingUrl={existingCover}
                file={coverFile}
                onChange={(f) => { setCoverFile(f); setRemoveCover(f === null); }}
              />
            </div>

            {/* รูปประกอบ */}
            <div className="mt-surface p-5">
              <EventImagesEditor
                existing={existingImages.filter((img) => !removedImageIds.includes(img.id))}
                newFiles={newImageFiles}
                onRemoveExisting={(id) => setRemovedImageIds((prev) => [...prev, id])}
                onReorderExisting={setExistingImages}
                onNewFilesChange={setNewImageFiles}
              />
            </div>

            {/* สถานที่ */}
            <div className="space-y-4 mt-surface p-5">
              <h2 className="font-semibold text-white text-sm">สถานที่จัดงาน</h2>
              <div className="space-y-1.5">
                <label className="mt-label">ชื่อสถานที่ <span className="text-red-400">*</span></label>
                <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="เช่น อิมแพ็ค อารีน่า" className="mt-input" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">ที่อยู่</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="ที่อยู่แบบเต็ม (ไม่บังคับ)" className="mt-input resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">ตำแหน่งบนแผนที่ <span className="text-red-400">*</span></label>
                <LeafletMapPicker lat={lat} lng={lng}
                  onChange={(rLat, rLng) => { setLat(rLat); setLng(rLng); }}
                  onPlaceName={(n) => { if (!placeName) setPlaceName(n); }} />
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3 pb-4">
              <button type="button" onClick={() => navigate(-1)}
                className="hover:bg-white/5 px-5 py-2.5 border border-white/10 rounded-xl font-semibold text-white text-sm">
                ยกเลิก
              </button>
              <button type="submit" disabled={isSaving}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-5 py-2.5 rounded-xl font-semibold text-white text-sm disabled:cursor-not-allowed">
                <Save size={16} />
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
