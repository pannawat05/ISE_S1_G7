import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Calendar, MapPin, Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import { createOrganizerEvent, createZone, uploadEventDocuments } from "@/api/organizer";
import { fetchEventTypes, type EventType } from "@/api/sysadmin";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { LeafletMapPicker, ImageUploadZone, ZoneEditor, DocumentUploader, type ZoneDraft } from "@/components/shared";

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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useProfileSidebar();
  const organizerId = Number(id);

  const [form, setForm] = useState<CreateEventForm>(EMPTY_FORM);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [zoneDrafts, setZoneDrafts] = useState<ZoneDraft[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);

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
    setIsSubmitting(true);
    setError(null);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      // Step 1: Create event
      setSubmitStep("กำลังสร้าง Event...");
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("place_name", form.place_name.trim());
      fd.append("type_id", String(form.type_id));
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date);
      fd.append("latitude", String(form.latitude));
      fd.append("longitude", String(form.longitude));
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (form.theme.trim())       fd.append("theme", form.theme.trim());
      if (form.address.trim())     fd.append("address", form.address.trim());
      if (coverFiles[0])           fd.append("cover_image", coverFiles[0]);
      extraFiles.forEach((f) =>    fd.append("event_images", f));

      const { eventId } = await createOrganizerEvent(token, organizerId, fd);

      // Step 2: Create zone drafts (if any)
      const validDrafts = zoneDrafts.filter((d) => d.name.trim());
      if (validDrafts.length > 0) {
        setSubmitStep(`กำลังบันทึกโซน (0/${validDrafts.length})...`);
        for (let i = 0; i < validDrafts.length; i++) {
          const draft = validDrafts[i];
          setSubmitStep(`กำลังบันทึกโซน (${i + 1}/${validDrafts.length})...`);
          const zfd = new FormData();
          zfd.append("name", draft.name.trim());
          zfd.append("category", draft.category);
          zfd.append("type", draft.type);
          zfd.append("price", String(draft.price));
          if (draft.rows && draft.rows.length > 0) {
            zfd.append("rows", JSON.stringify(draft.rows));
          }
          draft.imageFiles.forEach((f) => zfd.append("zone_images", f));
          await createZone(token, organizerId, eventId, zfd);
        }
      }

      // Step 3: Upload documents (if any)
      if (docFiles.length > 0) {
        setSubmitStep(`กำลังอัปโหลดเอกสาร (${docFiles.length} ไฟล์)...`);
        await uploadEventDocuments(token, organizerId, eventId, docFiles);
      }

      navigate(`/profile/events/${organizerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
      setSubmitStep(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button
            onClick={() => navigate(`/profile/events/${organizerId}`)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={18} /><span>กลับ</span>
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

            {/* ── ข้อมูลทั่วไป ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                ข้อมูลทั่วไป
              </h2>
              <div className="space-y-1.5">
                <label className="mt-label">ชื่องาน <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="เช่น Magic Harmony 2026 Concert" className="mt-input" />
              </div>
              <div className="space-y-1.5">
                <label className="mt-label">
                  รายละเอียด<span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
                </label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                  rows={4} placeholder="อธิบายเกี่ยวกับงานนี้..." className="mt-input resize-none" />
              </div>
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="mt-label">ประเภทงาน <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select
                      value={form.type_id}
                      onChange={(e) => set("type_id", Number(e.target.value))}
                      disabled={typesLoading || eventTypes.length === 0}
                      className="disabled:opacity-50 mt-input pr-8 w-full appearance-none cursor-pointer"
                    >
                      {typesLoading && <option value={0}>กำลังโหลด...</option>}
                      {!typesLoading && eventTypes.length === 0 && <option value={0}>ไม่มีประเภท</option>}
                      {!typesLoading && form.type_id === 0 && <option value={0}>เลือกประเภท</option>}
                      {eventTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="mt-label">
                    ธีมงาน<span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
                  </label>
                  <input value={form.theme} onChange={(e) => set("theme", e.target.value)}
                    placeholder="เช่น Cyberpunk, Fantasy..." className="mt-input" />
                </div>
              </div>
            </section>

            {/* ── รูปภาพ ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">
                รูปภาพ<span className="ml-2 font-normal text-gray-600 text-xs normal-case">(ไม่จำเป็น)</span>
              </h2>
              <ImageUploadZone label="ภาพปกงาน (Cover Image)" files={coverFiles} onChange={setCoverFiles} />
              <ImageUploadZone label="รูปภาพเพิ่มเติม" multiple files={extraFiles} onChange={setExtraFiles} />
            </section>

            {/* ── วันเวลา ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">วันเวลา</h2>
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

            {/* ── สถานที่ ── */}
            <section className="space-y-5">
              <h2 className="pb-2 border-white/5 border-b font-semibold text-gray-400 text-sm uppercase tracking-wider">สถานที่จัดงาน</h2>
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
                  ที่อยู่<span className="ml-2 font-normal text-gray-600 text-xs">(ไม่จำเป็น)</span>
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

            {/* ── ผังที่นั่ง / โซน ── */}
            <ZoneEditor
              organizerId={organizerId}
              eventId={null}
              onDraftsChange={setZoneDrafts}
            />

            {/* ── เอกสารประกอบงาน ── */}
            <DocumentUploader
              organizerId={organizerId}
              eventId={null}
              onFilesChange={setDocFiles}
            />

            {/* ── Submit ── */}
            <div className="flex gap-3 pb-8">
              <button type="button"
                onClick={() => navigate(`/profile/events/${organizerId}`)}
                disabled={isSubmitting}
                className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-3 border border-white/10 rounded-xl font-semibold text-white text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex flex-1 justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-3 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? <><Loader2 size={16} className="animate-spin" /> {submitStep ?? "กำลังสร้าง..."}</>
                  : "สร้าง Event 🎫"}
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
