import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, Check, X, Eye, ChevronDown,
  Calendar, MapPin, Building2, Mail, AlertTriangle,
  Settings, Tag, CreditCard, Users, LayoutDashboard,
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Shield,
} from "lucide-react";
import Cookies from "js-cookie";
import {
  fetchAdminEvents, fetchAdminEventDetail, approveEvent, rejectEvent,
  getAdminCoverUrl, type AdminEvent, type AdminEventDetail,
} from "@/api/admin";
import {
  fetchEventTypes, createEventType, updateEventType, deleteEventType,
  fetchPaymentMethods, createPaymentMethod, updatePaymentMethod,
  togglePaymentMethod, deletePaymentMethod,
  fetchUsers, updateUserRole,
  fetchSysOrganizers,
  type EventType, type PaymentMethod, type SysUser, type SysOrganizer, type PaymentCategory,
} from "@/api/sysadmin";
import { API_BASE } from "@/api/client";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    pending:  "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    approved: "bg-green-400/10  text-green-400  border-green-400/20",
    rejected: "bg-red-400/10   text-red-400   border-red-400/20",
  };
  const l: Record<string, string> = {
    pending: "Pending", approved: "Approved", rejected: "Rejected",
  };
  return (
    <span className={`mt-badge ${s[status] ?? "bg-gray-400/10 text-gray-400 border-gray-400/20"}`}>
      {l[status] ?? status}
    </span>
  );
}
// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ event, onConfirm, onCancel, isSubmitting }: {
  event: AdminEvent;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div
      className="z-[110] fixed inset-0 flex justify-center items-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[#111] shadow-2xl p-6 border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex justify-center items-center bg-red-500/15 mb-4 rounded-full w-11 h-11">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h3 className="mb-1 font-bold text-white text-base">Reject กิจกรรมนี้?</h3>
        <p className="mb-4 text-gray-400 text-sm">
          <span className="font-semibold text-white">"{event.name}"</span>
          {" "}— เจ้าของจะได้รับ email แจ้งเหตุผล
        </p>
        <div className="space-y-1.5">
          <label className="mt-label">
            เหตุผลการ Reject <span className="text-red-400">*</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="เช่น ข้อมูลไม่ครบถ้วน, รูปภาพไม่เหมาะสม..."
            className="mt-input resize-none"
            autoFocus
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={isSubmitting}
            className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-2.5 border border-white/10 rounded-xl font-semibold text-white text-sm">
            ยกเลิก
          </button>
          <button
            onClick={() => note.trim() && onConfirm(note.trim())}
            disabled={isSubmitting || !note.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold text-white text-sm disabled:cursor-not-allowed">
            {isSubmitting ? "กำลังส่ง..." : "Reject + ส่ง Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Event Detail Drawer ──────────────────────────────────────────────────────
function EventDetailDrawer({ eventId, token, onClose }: {
  eventId: number; token: string; onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminEventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminEventDetail(token, eventId)
      .then(setDetail).catch(console.error).finally(() => setLoading(false));
  }, [eventId]);

  const cover = detail ? getAdminCoverUrl(detail.cover_image) : null;
  const lat = parseFloat(detail?.latitude ?? "");
  const lng = parseFloat(detail?.longitude ?? "");
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

  return (
    <div
      className="z-[100] fixed inset-0 flex justify-end bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col bg-[#111] shadow-2xl border-white/10 border-l w-full max-w-lg h-full overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-white/5 border-b">
          <h2 className="font-bold text-white text-base">รายละเอียดกิจกรรม</h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="space-y-3 p-6">
            {[1,2,3,4].map((i) => <div key={i} className="bg-white/5 rounded-xl h-12 animate-pulse" />)}
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-5 p-6">
            {cover && <img src={cover} alt={detail.name} className="rounded-xl w-full h-48 object-cover" />}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={detail.status} />
                <span className="text-gray-500 text-xs">{detail.type_name}</span>
              </div>
              <h3 className="font-bold text-white text-lg">{detail.name}</h3>
              {detail.theme && <p className="text-violet-400 text-xs">ธีม: {detail.theme}</p>}
            </div>
            {detail.description && (
              <p className="bg-white/5 p-4 rounded-xl text-gray-300 text-sm leading-relaxed">
                {detail.description}
              </p>
            )}
            <div className="space-y-2.5 text-gray-400 text-sm">
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="mt-0.5 text-violet-400 shrink-0" />
                <span>
                  {new Date(detail.start_date).toLocaleString("th-TH")}
                  {" — "}
                  {new Date(detail.end_date).toLocaleString("th-TH")}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 text-violet-400 shrink-0" />
                <span>{detail.place_name}{detail.address ? `, ${detail.address}` : ""}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 size={15} className="mt-0.5 text-violet-400 shrink-0" />
                <span>{detail.organizer_name}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="mt-0.5 text-violet-400 shrink-0" />
                <span>{detail.owner_name} · {detail.owner_email}</span>
              </div>
            </div>
            {hasCoords && (
              <>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.008},${lng+0.01},${lat+0.008}&layer=mapnik&marker=${lat},${lng}`}
                    style={{ height: 180, width: "100%", border: "none" }}
                    title="map" loading="lazy" className="pointer-events-none" referrerPolicy="no-referrer"
                  />
                </div>
                <a href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs">
                  <MapPin size={13} /> เปิดใน Google Maps
                </a>
              </>
            )}
            {detail.images.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-gray-500 text-xs">รูปภาพประกอบงาน</p>
                <div className="gap-2 grid grid-cols-3">
                  {detail.images.map((img) => {
                    const src = img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`;
                    return <img key={img.id} src={src} alt="" className="rounded-lg w-full h-20 object-cover" />;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Events Dashboard (เดิม) ──────────────────────────────────────────────────
function EventsDashboard({ token, events, isLoading, error, search, setSearch, statusFilter, setStatusFilter, counts, actionMsg, onApprove, onRejectClick, onViewClick }: {
  token: string; events: AdminEvent[]; isLoading: boolean; error: string | null;
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  counts: { pending: number; approved: number; rejected: number };
  actionMsg: string | null;
  onApprove: (ev: AdminEvent) => void;
  onRejectClick: (ev: AdminEvent) => void;
  onViewClick: (id: number) => void;
}) {
  return (
    <>
      {actionMsg && (
        <div className="bg-violet-600/10 px-4 py-3 border border-violet-500/30 rounded-xl text-violet-300 text-sm">
          {actionMsg}
        </div>
      )}
      <div className="gap-3 grid grid-cols-3">
        {[
          { label: "รออนุมัติ",   value: counts.pending,   color: "text-yellow-400" },
          { label: "อนุมัติแล้ว", value: counts.approved,  color: "text-green-400" },
          { label: "ปฏิเสธ",      value: counts.rejected,  color: "text-red-400" },
        ].map((c) => (
          <div key={c.label} className="mt-surface p-4 rounded-xl text-center">
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-gray-500 text-xs">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="flex sm:flex-row flex-col gap-3">
        <div className="relative flex-1">
          <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อกิจกรรม หรือ organizer..." className="mt-input pl-9" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-input pr-8 appearance-none cursor-pointer">
            <option value="">ทุกสถานะ</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={15} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && error && (
        <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {!isLoading && !error && (
        <div className="mt-surface rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-white/5 border-b text-gray-500 text-xs text-left">
                <th className="px-4 py-3 font-medium">กิจกรรม</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Organizer</th>
                <th className="hidden lg:table-cell px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-gray-600 text-center">ไม่พบกิจกรรม</td></tr>
              )}
              {events.map((ev) => {
                const cover = getAdminCoverUrl(ev.cover_image);
                const dateStr = new Date(ev.start_date).toLocaleDateString("th-TH", {
                  day: "numeric", month: "short", year: "numeric",
                });
                return (
                  <tr key={ev.id} className="hover:bg-white/[0.03] border-white/5 border-b transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cover ? (
                          <img src={cover} alt={ev.name} className="rounded-lg w-14 h-10 object-cover shrink-0" />
                        ) : (
                          <div className="bg-white/5 rounded-lg w-14 h-10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[180px] font-medium text-white truncate">{ev.name}</p>
                          <p className="text-gray-500 text-xs">{ev.type_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <p className="text-gray-300">{ev.organizer_name}</p>
                      <p className="text-gray-600 text-xs">{ev.owner_email}</p>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-gray-400">{dateStr}</td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1.5">
                        <button onClick={() => onViewClick(ev.id)} title="ดูรายละเอียด"
                          className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white">
                          <Eye size={16} />
                        </button>
                        {ev.status !== "approved" && (
                          <button onClick={() => onApprove(ev)} title="Approve"
                            className="hover:bg-green-500/20 p-1.5 rounded-lg text-gray-400 hover:text-green-400">
                            <Check size={16} />
                          </button>
                        )}
                        {ev.status !== "rejected" && (
                          <button onClick={() => onRejectClick(ev)} title="Reject"
                            className="hover:bg-red-500/20 p-1.5 rounded-lg text-gray-400 hover:text-red-400">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
// ─── System Dashboard ─────────────────────────────────────────────────────────
function SystemDashboard({ token, isSysAdmin }: { token: string; isSysAdmin: boolean }) {
  const [sysTab, setSysTab] = useState<"types" | "payments" | "users" | "organizers">("types");

  if (!isSysAdmin) {
    return (
      <div className="mt-surface p-8 rounded-2xl text-center">
        <Shield size={48} className="mx-auto mb-4 text-gray-600" />
        <h3 className="font-semibold text-white text-lg">System Dashboard</h3>
        <p className="mt-2 text-gray-500 text-sm">ต้องมี role sysadmin เท่านั้น</p>
      </div>
    );
  }

  const tabs = [
    { key: "types" as const, label: "Event Types", icon: Tag },
    { key: "payments" as const, label: "Payment Methods", icon: CreditCard },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "organizers" as const, label: "Organizers", icon: Building2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSysTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              sysTab === tab.key
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-surface p-6 rounded-2xl">
        {sysTab === "types" && <EventTypesManager token={token} />}
        {sysTab === "payments" && <PaymentMethodsManager token={token} />}
        {sysTab === "users" && <UsersManager token={token} />}
        {sysTab === "organizers" && <OrganizersManager token={token} />}
      </div>
    </div>
  );
}
// ─── Event Types Manager ──────────────────────────────────────────────────────
function EventTypesManager({ token }: { token: string }) {
  const [types, setTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetchEventTypes(token).then(setTypes).catch(console.error).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createEventType(token, newName.trim());
      setNewName("");
      load();
      flash("✅ สร้างประเภทใหม่สำเร็จ");
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    try {
      await updateEventType(token, id, editName.trim());
      setEditId(null);
      load();
      flash("✅ อัปเดตสำเร็จ");
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`ลบประเภท "${name}"?`)) return;
    try {
      await deleteEventType(token, id);
      load();
      flash("✅ ลบสำเร็จ");
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white text-lg">Event Types</h3>
        {msg && <p className="text-violet-300 text-sm">{msg}</p>}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="ชื่อประเภทใหม่..." className="flex-1 mt-input" />
        <button onClick={handleCreate} disabled={!newName.trim()}
          className="disabled:opacity-50 mt-btn-primary px-4 py-2 shrink-0">
          <Plus size={16} />
        </button>
      </div>
      {loading && <div className="space-y-2 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-lg h-12" />)}
      </div>}
      {!loading && (
        <div className="space-y-2">
          {types.map((type) => (
            <div key={type.id} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-lg">
              {editId === type.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 mt-input" autoFocus />
                  <button onClick={() => handleUpdate(type.id)}
                    className="p-1 text-green-400 hover:text-green-300">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="p-1 text-gray-400 hover:text-gray-300">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Tag size={16} className="text-violet-400" />
                  <span className="flex-1 text-white">{type.name}</span>
                  <button onClick={() => { setEditId(type.id); setEditName(type.name); }}
                    className="p-1 text-gray-400 hover:text-white">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(type.id, type.name)}
                    className="p-1 text-gray-400 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
          {types.length === 0 && <p className="py-8 text-gray-500 text-center">ยังไม่มีประเภท</p>}
        </div>
      )}
    </div>
  );
}
// ─── Payment Methods Manager ──────────────────────────────────────────────────
function PaymentMethodsManager({ token }: { token: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  function load() { fetchPaymentMethods(token).then(setMethods).catch(console.error).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function handleToggle(id: number) {
    try { await togglePaymentMethod(token, id); load(); }
    catch (e: unknown) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }
  async function handleDelete(id: number) {
    if (!confirm("ลบ Payment Method นี้?")) return;
    try { await deletePaymentMethod(token, id); load(); flash("✅ ลบสำเร็จ"); }
    catch (e: unknown) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  const categoryColors: Record<PaymentCategory, string> = {
    "credit card": "bg-blue-500/20 text-blue-300",
    "prompt pay": "bg-green-500/20 text-green-300",
    "mobile banking": "bg-purple-500/20 text-purple-300",
    "cash": "bg-orange-500/20 text-orange-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white text-lg">Payment Methods</h3>
        {msg && <p className="text-violet-300 text-sm">{msg}</p>}
      </div>
      {loading && <div className="space-y-2 animate-pulse">
        {[1,2].map(i => <div key={i} className="bg-white/5 rounded-lg h-16" />)}
      </div>}
      {!loading && (
        <div className="space-y-2">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center gap-3 bg-white/[0.02] p-4 border border-white/5 rounded-lg">
              <CreditCard size={18} className="text-violet-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`mt-badge ${categoryColors[method.category]}`}>{method.category}</span>
                  <span className="font-medium text-white">{method.channel}</span>
                  {method.gateway && <span className="text-gray-400 text-xs">via {method.gateway}</span>}
                </div>
              </div>
              <button onClick={() => handleToggle(method.id)} className="p-1">
                {method.is_active ? (
                  <ToggleRight size={20} className="text-green-400" />
                ) : (
                  <ToggleLeft size={20} className="text-gray-500" />
                )}
              </button>
              <button onClick={() => handleDelete(method.id)}
                className="p-1 text-gray-400 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {methods.length === 0 && <p className="py-8 text-gray-500 text-center">ยังไม่มี Payment Methods</p>}
        </div>
      )}
    </div>
  );
}
// ─── Users Manager ────────────────────────────────────────────────────────────
function UsersManager({ token }: { token: string }) {
  const [users, setUsers] = useState<SysUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function load() { fetchUsers(token, { search }).then(setUsers).catch(console.error).finally(() => setLoading(false)); }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  async function handleRoleChange(userId: number, newRole: "admin" | "customer" | "sysadmin") {
    try {
      await updateUserRole(token, userId, newRole as "admin" | "customer");
      load();
      flash(`✅ เปลี่ยน role เป็น ${newRole} แล้ว`);
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white text-lg">Users ({users.length})</h3>
        {msg && <p className="text-violet-300 text-sm">{msg}</p>}
      </div>
      <div className="relative">
        <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา email หรือชื่อ..." className="mt-input pl-9" />
      </div>
      {loading && <div className="space-y-2 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-lg h-14" />)}
      </div>}
      {!loading && (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-white">{user.f_name} {user.l_name}</p>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
              <select value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "customer" | "sysadmin")}
                className="mt-input text-xs">
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="sysadmin">SysAdmin</option>
              </select>
              {user.role === "admin" && <Shield size={16} className="text-violet-400" />}
              {user.role === "sysadmin" && <Shield size={16} className="text-red-400" />}
            </div>
          ))}
          {users.length === 0 && <p className="py-8 text-gray-500 text-center">ไม่พบ users</p>}
        </div>
      )}
    </div>
  );
}

// ─── Organizers Manager ───────────────────────────────────────────────────────
function OrganizersManager({ token }: { token: string }) {
  const [organizers, setOrganizers] = useState<SysOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function load() { fetchSysOrganizers(token, search).then(setOrganizers).catch(console.error).finally(() => setLoading(false)); }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white text-lg">Organizers ({organizers.length})</h3>
      <div className="relative">
        <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ organizer..." className="mt-input pl-9" />
      </div>
      {loading && <div className="space-y-2 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-lg h-16" />)}
      </div>}
      {!loading && (
        <div className="space-y-2">
          {organizers.map((org) => (
            <div key={org.id} className="flex items-center gap-3 bg-white/[0.02] p-4 border border-white/5 rounded-lg">
              {org.logo_url ? (
                <img src={`${API_BASE}${org.logo_url}`} alt={org.name}
                  className="rounded-lg w-12 h-12 object-cover" />
              ) : (
                <div className="flex justify-center items-center bg-white/10 rounded-lg w-12 h-12">
                  <Building2 size={18} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-white">{org.name}</p>
                <p className="text-gray-400 text-sm">{org.owner_name} · {org.owner_email}</p>
                <p className="text-gray-500 text-xs">{org.event_count} events</p>
              </div>
            </div>
          ))}
          {organizers.length === 0 && <p className="py-8 text-gray-500 text-center">ไม่พบ organizers</p>}
        </div>
      )}
    </div>
  );
}
// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const token = Cookies.get("authToken") ?? "";
  const [activeTab, setActiveTab] = useState<"events" | "system">("events");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectTarget, setRejectTarget] = useState<AdminEvent | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user || !["admin", "sysadmin"].includes(user.role)) {
      navigate("/", { replace: true });
      return;
    }
    setUserRole(user.role);
  }, []);

  function loadEvents() {
    setIsLoading(true);
    fetchAdminEvents(token, { status: statusFilter, search })
      .then(setEvents).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (activeTab === "events") {
      const t = setTimeout(loadEvents, 300);
      return () => clearTimeout(t);
    }
  }, [search, statusFilter, activeTab]);

  async function handleApprove(ev: AdminEvent) {
    try {
      await approveEvent(token, ev.id);
      setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, status: "approved" } : e));
      flash(`✅ Approved "${ev.name}" — email sent`);
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  async function handleReject(note: string) {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await rejectEvent(token, rejectTarget.id, note);
      setEvents((prev) => prev.map((e) => e.id === rejectTarget.id ? { ...e, status: "rejected" } : e));
      flash(`🚫 Rejected "${rejectTarget.name}" — email sent`);
      setRejectTarget(null);
    } catch (e: unknown) {
      flash(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setIsRejecting(false);
    }
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 4000);
  }

  const counts = {
    pending:  events.filter((e) => e.status === "pending").length,
    approved: events.filter((e) => e.status === "approved").length,
    rejected: events.filter((e) => e.status === "rejected").length,
  };

  const isSysAdmin = userRole === "sysadmin";

  return (
    <div className="bg-black w-full h-full overflow-y-auto text-white">
      <div className="space-y-6 mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="flex justify-center items-center bg-violet-600/20 rounded-xl w-10 h-10">
            <ShieldCheck size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-2xl">Admin Panel</h1>
            <p className="text-gray-500 text-sm">
              จัดการระบบ Magic Ticket {isSysAdmin && "· SysAdmin"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-white/[0.03] p-1 border border-white/5 rounded-xl">
          <button
            onClick={() => setActiveTab("events")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "events"
                ? "bg-violet-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <LayoutDashboard size={16} />
            Admin Dashboard
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "system"
                ? "bg-violet-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Settings size={16} />
            System Dashboard
          </button>
        </div>

        {activeTab === "events" ? (
          <EventsDashboard
            token={token} events={events} isLoading={isLoading} error={error}
            search={search} setSearch={setSearch}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            counts={counts} actionMsg={actionMsg}
            onApprove={handleApprove} onRejectClick={setRejectTarget} onViewClick={setDetailId}
          />
        ) : (
          <SystemDashboard token={token} isSysAdmin={isSysAdmin} />
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          event={rejectTarget} onConfirm={handleReject} onCancel={() => setRejectTarget(null)}
          isSubmitting={isRejecting}
        />
      )}
      {detailId !== null && (
        <EventDetailDrawer eventId={detailId} token={token} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}