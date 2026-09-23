import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown,
  ImageIcon, Loader2, GripVertical, Rows3,
} from "lucide-react";
import Cookies from "js-cookie";
import { API_BASE } from "@/api/client";
import {
  fetchZones, createZone, updateZone, deleteZone, fetchZoneRows,
  type Zone, type ZoneImage, type RowConfig,
} from "@/api/organizer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneDraft {
  _key: string;
  name: string;
  category: string;
  type: string;
  price: number;
  rows: RowConfig[];      // row-based seat config
  imageFiles: File[];
}

interface ZoneEditorProps {
  organizerId: number;
  eventId: number | null;
  onDraftsChange?: (drafts: ZoneDraft[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_CATEGORIES = ["นั่ง", "ยืน", "VIP Box", "อื่นๆ"];
const ZONE_TYPES      = ["ฟรี", "ปกติ", "VIP", "VVIP"];

function emptyDraft(): ZoneDraft {
  return {
    _key: `${Date.now()}-${Math.random()}`,
    name: "", category: ZONE_CATEGORIES[0], type: ZONE_TYPES[1],
    price: 0, rows: [], imageFiles: [],
  };
}

function typeColor(type: string): string {
  switch (type) {
    case "VIP":  return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "VVIP": return "bg-amber-500/20  text-amber-300  border-amber-500/30";
    case "ฟรี": return "bg-green-500/20  text-green-300  border-green-500/30";
    default:     return "bg-violet-500/20 text-violet-300 border-violet-500/30";
  }
}

function totalSeats(rows: RowConfig[]) {
  return rows.reduce((s, r) => s + (r.count || 0), 0);
}

// ─── Row Config Editor ────────────────────────────────────────────────────────
function RowConfigEditor({ rows, onChange }: {
  rows: RowConfig[];
  onChange: (rows: RowConfig[]) => void;
}) {
  function addRow() {
    // Auto-suggest next label (A → B → C → ...)
    const used = new Set(rows.map((r) => r.label.toUpperCase()));
    let next = "";
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(65 + i);
      if (!used.has(c)) { next = c; break; }
    }
    onChange([...rows, { label: next, count: 10 }]);
  }

  function updateRow(i: number, field: keyof RowConfig, val: string | number) {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-1.5 text-gray-500 text-xs">
          <Rows3 size={13} />
          กำหนดแถวที่นั่ง
          <span className="text-gray-700">
            {rows.length > 0 && `(${rows.length} แถว · ${totalSeats(rows)} ที่นั่งรวม)`}
          </span>
        </label>
        <button type="button" onClick={addRow}
          className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs transition-colors">
          <Plus size={13} /> เพิ่มแถว
        </button>
      </div>

      {rows.length === 0 && (
        <p className="py-2 text-gray-700 text-xs">
          ยังไม่มีแถว — กด "เพิ่มแถว" หรือปล่อยว่างถ้าไม่ต้องการกำหนดที่นั่ง
        </p>
      )}

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical size={14} className="text-gray-700 shrink-0" />
            {/* Row label */}
            <div className="space-y-0.5 shrink-0">
              <label className="text-gray-600 text-xs">แถว</label>
              <input
                value={row.label}
                onChange={(e) => updateRow(i, "label", e.target.value.toUpperCase().slice(0, 8))}
                placeholder="A"
                className="mt-input w-16 font-mono text-sm text-center"
              />
            </div>
            {/* Seat count */}
            <div className="flex-1 space-y-0.5">
              <label className="text-gray-600 text-xs">จำนวนที่นั่ง</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={1} max={999} value={row.count}
                  onChange={(e) => updateRow(i, "count", parseInt(e.target.value) || 1)}
                  className="flex-1 mt-input text-sm"
                />
                <span className="text-gray-600 text-xs shrink-0">
                  → {row.label || "?"}1 – {row.label || "?"}{row.count}
                </span>
              </div>
            </div>
            <button type="button" onClick={() => removeRow(i)}
              className="mt-3 p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {rows.map((r) => (
            <span key={r.label}
              className="bg-white/5 px-1.5 py-0.5 border border-white/10 rounded font-mono text-gray-400 text-xs">
              {r.label}1–{r.label}{r.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Image Picker ─────────────────────────────────────────────────────────────
function ZoneImagePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="group relative border border-white/10 rounded-lg w-20 h-14 overflow-hidden">
            <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute inset-0 flex justify-center items-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} className="text-white" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()}
          className="flex flex-col justify-center items-center gap-1 border-2 border-white/10 hover:border-violet-500/50 border-dashed rounded-lg w-20 h-14 text-gray-500 hover:text-violet-400 transition-colors">
          <ImageIcon size={16} />
          <span className="text-xs">เพิ่มรูป</span>
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => {
          if (!e.target.files) return;
          const valid = Array.from(e.target.files).filter((f) => f.type.startsWith("image/") && f.size <= 10_000_000);
          onChange([...files, ...valid]);
          e.target.value = "";
        }} />
    </div>
  );
}

// ─── Existing images strip ────────────────────────────────────────────────────
function ExistingZoneImages({ images, zoneId, organizerId, eventId, onDeleted }: {
  images: ZoneImage[]; zoneId: number; organizerId: number; eventId: number;
  onDeleted: (imgId: number) => void;
}) {
  if (!images.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => {
        const src = img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`;
        return (
          <div key={img.id} className="group relative border border-white/10 rounded-lg w-20 h-14 overflow-hidden">
            <img src={src} alt={img.name} className="w-full h-full object-cover" />
            <button type="button"
              onClick={async () => {
                const token = Cookies.get("authToken");
                if (!token) return;
                const fd = new FormData();
                fd.append("remove_image_ids[]", String(img.id));
                await updateZone(token, organizerId, eventId, zoneId, fd);
                onDeleted(img.id);
              }}
              className="absolute inset-0 flex justify-center items-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={14} className="text-white" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Zone Form (shared create+edit) ──────────────────────────────────────────
function ZoneForm({ name, category, type, price, rows, imageFiles, onChange, onRowsChange, onImageChange }: {
  name: string; category: string; type: string; price: number;
  rows: RowConfig[]; imageFiles: File[];
  onChange: (field: string, val: string | number) => void;
  onRowsChange: (rows: RowConfig[]) => void;
  onImageChange: (files: File[]) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Basic fields */}
      <div className="gap-2 grid grid-cols-2 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-1">
          <label className="text-gray-500 text-xs">ชื่อโซน *</label>
          <input value={name} onChange={(e) => onChange("name", e.target.value)}
            placeholder="เช่น Zone A, VIP Left" className="mt-input text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">หมวดหมู่</label>
          <div className="relative">
            <select value={category} onChange={(e) => onChange("category", e.target.value)}
              className="mt-input pr-7 w-full text-sm appearance-none cursor-pointer">
              {ZONE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">ประเภท</label>
          <div className="relative">
            <select value={type} onChange={(e) => onChange("type", e.target.value)}
              className="mt-input pr-7 w-full text-sm appearance-none cursor-pointer">
              {ZONE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={13} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">ราคา (บาท)</label>
          <input type="number" min={0} step={0.01} value={price}
            onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
            className="mt-input text-sm" />
        </div>
      </div>

      {/* Row config */}
      <div className="bg-white/[0.02] p-3 border border-white/5 rounded-xl">
        <RowConfigEditor rows={rows} onChange={onRowsChange} />
      </div>

      {/* Images */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs">รูปผังที่นั่ง (ไม่จำเป็น)</label>
        <ZoneImagePicker files={imageFiles} onChange={onImageChange} />
      </div>
    </div>
  );
}

// ─── Create mode — draft list ─────────────────────────────────────────────────
function ZoneDraftList({ drafts, onChange }: { drafts: ZoneDraft[]; onChange: (d: ZoneDraft[]) => void }) {
  function update(key: string, field: string, val: string | number) {
    onChange(drafts.map((d) => d._key === key ? { ...d, [field]: val } : d));
  }
  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <div key={draft._key} className="space-y-3 bg-white/[0.02] p-4 border border-white/5 rounded-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{draft.name || "โซนใหม่"}</span>
              {draft.rows.length > 0 && (
                <span className="bg-violet-500/10 px-2 py-0.5 border border-violet-500/20 rounded-full text-violet-300 text-xs">
                  {draft.rows.length} แถว · {totalSeats(draft.rows)} ที่
                </span>
              )}
            </div>
            <button type="button" onClick={() => onChange(drafts.filter((d) => d._key !== draft._key))}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
          <ZoneForm
            name={draft.name} category={draft.category} type={draft.type}
            price={draft.price} rows={draft.rows} imageFiles={draft.imageFiles}
            onChange={(f, v) => update(draft._key, f, v)}
            onRowsChange={(rows) => onChange(drafts.map((d) => d._key === draft._key ? { ...d, rows } : d))}
            onImageChange={(files) => onChange(drafts.map((d) => d._key === draft._key ? { ...d, imageFiles: files } : d))}
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...drafts, emptyDraft()])}
        className="flex justify-center items-center gap-2 py-3 border-2 border-white/10 hover:border-violet-500/40 border-dashed rounded-xl w-full text-gray-500 hover:text-violet-400 text-sm transition-colors">
        <Plus size={16} /> เพิ่มโซน
      </button>
    </div>
  );
}

// ─── Edit mode — live CRUD ────────────────────────────────────────────────────
function ZoneLiveList({ organizerId, eventId }: { organizerId: number; eventId: number }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", category: "", type: "", price: 0 });
  const [editRows, setEditRows] = useState<RowConfig[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [newDraft, setNewDraft] = useState<ZoneDraft | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) return;
    fetchZones(token, organizerId, eventId)
      .then(setZones).catch(console.error).finally(() => setLoading(false));
  }, [organizerId, eventId]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function openEdit(zone: Zone) {
    setEditId(zone.id);
    setEditData({ name: zone.name, category: zone.category, type: zone.type, price: zone.price });
    setEditImages([]);
    // Load current rows from API
    const token = Cookies.get("authToken");
    if (!token) return;
    try {
      const rows = await fetchZoneRows(token, organizerId, eventId, zone.id);
      setEditRows(rows);
    } catch { setEditRows([]); }
  }

  async function handleAdd() {
    if (!newDraft?.name.trim()) { flash("❌ กรุณากรอกชื่อโซน"); return; }
    setAdding(true);
    try {
      const token = Cookies.get("authToken");
      if (!token) return;
      const fd = new FormData();
      fd.append("name", newDraft.name.trim());
      fd.append("category", newDraft.category);
      fd.append("type", newDraft.type);
      fd.append("price", String(newDraft.price));
      if (newDraft.rows.length > 0) fd.append("rows", JSON.stringify(newDraft.rows));
      newDraft.imageFiles.forEach((f) => fd.append("zone_images", f));
      const result = await createZone(token, organizerId, eventId, fd);
      setZones(result.zones);
      setNewDraft(null);
      flash("✅ เพิ่มโซนสำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    finally { setAdding(false); }
  }

  async function handleUpdate(zoneId: number) {
    if (!editData.name.trim()) { flash("❌ กรุณากรอกชื่อโซน"); return; }
    setSaving(true);
    try {
      const token = Cookies.get("authToken");
      if (!token) return;
      const fd = new FormData();
      fd.append("name", editData.name.trim());
      fd.append("category", editData.category);
      fd.append("type", editData.type);
      fd.append("price", String(editData.price));
      fd.append("rows", JSON.stringify(editRows));
      editImages.forEach((f) => fd.append("zone_images", f));
      const result = await updateZone(token, organizerId, eventId, zoneId, fd);
      setZones(result.zones);
      setEditId(null);
      setEditImages([]);
      flash("✅ อัปเดตสำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    finally { setSaving(false); }
  }

  async function handleDelete(zoneId: number, zoneName: string) {
    if (!confirm(`ลบโซน "${zoneName}"?`)) return;
    try {
      const token = Cookies.get("authToken");
      if (!token) return;
      const result = await deleteZone(token, organizerId, eventId, zoneId);
      setZones(result.zones);
      flash("✅ ลบโซนสำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }

  if (loading) return (
    <div className="space-y-2 animate-pulse">
      {[1, 2].map((i) => <div key={i} className="bg-white/5 rounded-xl h-16" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

      {zones.map((zone) => (
        <div key={zone.id} className="space-y-3 bg-white/[0.02] p-4 border border-white/5 rounded-xl">
          {editId === zone.id ? (
            <>
              <ZoneForm
                name={editData.name} category={editData.category}
                type={editData.type} price={editData.price}
                rows={editRows} imageFiles={editImages}
                onChange={(f, v) => setEditData((p) => ({ ...p, [f]: v }))}
                onRowsChange={setEditRows}
                onImageChange={setEditImages}
              />
              {zone.images.length > 0 && (
                <ExistingZoneImages
                  images={zone.images} zoneId={zone.id}
                  organizerId={organizerId} eventId={eventId}
                  onDeleted={(imgId) =>
                    setZones((prev) => prev.map((z) =>
                      z.id === zone.id ? { ...z, images: z.images.filter((img) => img.id !== imgId) } : z
                    ))
                  }
                />
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setEditId(null); setEditImages([]); }}
                  className="px-3 py-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs">
                  ยกเลิก
                </button>
                <button type="button" onClick={() => handleUpdate(zone.id)} disabled={saving}
                  className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-white text-xs">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  บันทึก
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-medium text-white">{zone.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor(zone.type)}`}>{zone.type}</span>
                  <span className="text-gray-500 text-xs">{zone.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-violet-300 text-sm">
                    {zone.price === 0 ? "ฟรี" : `฿${zone.price.toLocaleString()}`}
                  </p>
                  <span className="text-gray-500 text-xs">
                    {zone.seat_count > 0 ? `${zone.seat_count} ที่นั่ง` : "ไม่กำหนดจำนวน"}
                  </span>
                </div>
                {zone.images.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {zone.images.map((img) => {
                      const src = img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`;
                      return <img key={img.id} src={src} alt={img.name} className="border border-white/10 rounded w-16 h-10 object-cover" />;
                    })}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => openEdit(zone)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors shrink-0">
                <Pencil size={15} />
              </button>
              <button type="button" onClick={() => handleDelete(zone.id, zone.name)}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      ))}

      {newDraft ? (
        <div className="space-y-3 bg-white/[0.02] p-4 border border-violet-500/20 rounded-xl">
          <p className="font-medium text-violet-300 text-sm">โซนใหม่</p>
          <ZoneForm
            name={newDraft.name} category={newDraft.category}
            type={newDraft.type} price={newDraft.price}
            rows={newDraft.rows} imageFiles={newDraft.imageFiles}
            onChange={(f, v) => setNewDraft((p) => p ? { ...p, [f]: v } : p)}
            onRowsChange={(rows) => setNewDraft((p) => p ? { ...p, rows } : p)}
            onImageChange={(files) => setNewDraft((p) => p ? { ...p, imageFiles: files } : p)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNewDraft(null)}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs">
              ยกเลิก
            </button>
            <button type="button" onClick={handleAdd} disabled={adding}
              className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-white text-xs">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              เพิ่มโซน
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setNewDraft(emptyDraft())}
          className="flex justify-center items-center gap-2 py-3 border-2 border-white/10 hover:border-violet-500/40 border-dashed rounded-xl w-full text-gray-500 hover:text-violet-400 text-sm transition-colors">
          <Plus size={16} /> เพิ่มโซน
        </button>
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function ZoneEditor({ organizerId, eventId, onDraftsChange }: ZoneEditorProps) {
  const [drafts, setDrafts] = useState<ZoneDraft[]>([]);

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-white/5 border-b">
        <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">ผังที่นั่ง / โซน</h2>
        <span className="text-gray-600 text-xs">
          {eventId === null ? "สามารถเพิ่มโซนได้หลังสร้าง Event" : "บันทึกทันทีเมื่อกด ✓"}
        </span>
      </div>

      {eventId === null ? (
        <>
          <p className="bg-white/[0.02] px-3 py-2 border border-white/5 rounded-lg text-gray-500 text-xs">
            💡 กำหนดโซนล่วงหน้าได้ที่นี่ โซนจะถูกบันทึกพร้อมกับ Event โดยอัตโนมัติ
          </p>
          <ZoneDraftList drafts={drafts} onChange={(d) => { setDrafts(d); onDraftsChange?.(d); }} />
        </>
      ) : (
        <ZoneLiveList organizerId={organizerId} eventId={eventId} />
      )}
    </section>
  );
}
