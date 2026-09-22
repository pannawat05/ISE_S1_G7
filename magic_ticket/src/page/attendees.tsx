/**
 * Attendees Page — /profile/attendees/:id
 * Organizer จัดการ Staff + Event Staff
 *
 * Tab 1: Staff — เพิ่ม/ลบ user เป็น staff ของ organizer
 * Tab 2: Event Staff — assign staff เข้างาน
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Menu, Users, Search, UserPlus, X, Loader2, ShieldCheck,
  CalendarDays, ChevronDown, Trash2, Pencil, Check,
} from "lucide-react";
import Cookies from "js-cookie";
import {
  fetchStaff, addStaff, removeStaff, updateStaffRole,
  fetchEventStaff, assignStaffToEvent, removeStaffFromEvent,
  fetchOrganizerEventsList,
  type StaffMember, type EventStaffMember,
  type StaffRole, type EventStaffRole, type OrganizerEvent,
} from "@/api/organizer";
import { searchUsers, type UserSearchResult } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";

// ─── Constants ────────────────────────────────────────────────────────────────
const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  general_staff: "Staff ทั่วไป",
  manager:       "Manager",
};

const EVENT_ROLE_LABELS: Record<EventStaffRole, string> = {
  checkin:      "Check-in",
  security:     "Security",
  registration: "Registration",
  backstage:    "Backstage",
  manager:      "Manager",
};

const STAFF_ROLES: StaffRole[]      = ["general_staff", "manager"];
const EVENT_ROLES: EventStaffRole[] = ["checkin", "security", "registration", "backstage", "manager"];

function roleColor(role: string) {
  switch (role) {
    case "manager":       return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "checkin":       return "bg-green-500/20  text-green-300  border-green-500/30";
    case "security":      return "bg-red-500/20    text-red-300    border-red-500/30";
    case "registration":  return "bg-blue-500/20   text-blue-300   border-blue-500/30";
    case "backstage":     return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    default:              return "bg-gray-500/20   text-gray-300   border-gray-500/30";
  }
}

// ─── User Search (reusable) ───────────────────────────────────────────────────
function UserSearchInput({ organizerId, excludeIds, onSelect }: {
  organizerId: number;
  excludeIds: Set<number>;
  onSelect: (user: UserSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suppressRef.current) { suppressRef.current = false; return; }
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const token = Cookies.get("authToken");
      if (!token) return;
      try {
        const data = await searchUsers(token, organizerId, q.trim());
        setResults(data.filter((u) => !excludeIds.has(u.id)));
        setOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [q, organizerId, excludeIds]);

  function pick(user: UserSearchResult) {
    suppressRef.current = true;
    setQ(`${user.f_name} ${user.l_name} (${user.email})`);
    setOpen(false);
    onSelect(user);
    setTimeout(() => setQ(""), 100);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2 pointer-events-none" />
      <input value={q} onChange={(e) => { setQ(e.target.value); }}
        placeholder="ค้นหา email หรือชื่อ..."
        className="mt-input pr-8 pl-9 w-full text-sm" />
      {searching && <Loader2 size={14} className="top-1/2 right-3 absolute text-gray-500 -translate-y-1/2 animate-spin" />}

      {open && results.length > 0 && (
        <div className="z-50 absolute bg-[#1a1a1a] shadow-2xl mt-1 border border-white/10 rounded-xl w-full overflow-hidden">
          {results.map((u) => (
            <button key={u.id} type="button" onClick={() => pick(u)}
              className="flex items-center gap-3 hover:bg-white/5 px-4 py-3 w-full text-left transition-colors">
              <div className="flex justify-center items-center bg-violet-600/30 border border-violet-500/30 rounded-full w-8 h-8 font-bold text-violet-300 text-xs shrink-0">
                {u.f_name[0]}{u.l_name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white text-sm truncate">{u.f_name} {u.l_name}</p>
                <p className="text-gray-500 text-xs truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && !searching && q.length >= 2 && results.length === 0 && (
        <div className="z-50 absolute bg-[#1a1a1a] mt-1 p-4 border border-white/10 rounded-xl w-full text-gray-500 text-sm text-center">
          ไม่พบ user
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Staff Manager ─────────────────────────────────────────────────────
function StaffTab({ organizerId }: { organizerId: number }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState<UserSearchResult | null>(null);
  const [addRole, setAddRole] = useState<StaffRole>("general_staff");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("general_staff");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = Cookies.get("authToken");
    if (!token) return;
    setLoading(true);
    try { setStaff(await fetchStaff(token, organizerId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [organizerId]);

  useEffect(() => { load(); }, [load]);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  async function handleAdd() {
    if (!addingUser) return;
    setAdding(true);
    try {
      const token = Cookies.get("authToken")!;
      const updated = await addStaff(token, organizerId, addingUser.id, addRole);
      setStaff(updated);
      setAddingUser(null);
      flash(`✅ เพิ่ม ${addingUser.f_name} เป็น staff แล้ว`);
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    finally { setAdding(false); }
  }

  async function handleUpdateRole(s: StaffMember) {
    try {
      const token = Cookies.get("authToken")!;
      await updateStaffRole(token, organizerId, s.id, editRole);
      setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, role: editRole } : x));
      setEditId(null);
      flash("✅ อัปเดต role สำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }

  async function handleRemove(s: StaffMember) {
    if (!confirm(`ลบ ${s.f_name} ${s.l_name} ออกจาก staff?\n(จะถูกลบออกจากงานทุกงานด้วย)`)) return;
    try {
      const token = Cookies.get("authToken")!;
      setStaff(await removeStaff(token, organizerId, s.id));
      flash("✅ ลบ staff สำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }

  const existingUserIds = new Set(staff.map((s) => s.users_id));

  return (
    <div className="space-y-5">
      {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

      {/* Add staff */}
      <div className="space-y-4 bg-white/[0.02] p-5 border border-white/5 rounded-2xl">
        <h3 className="font-semibold text-white text-sm">เพิ่ม Staff ใหม่</h3>
        <UserSearchInput
          organizerId={organizerId}
          excludeIds={existingUserIds}
          onSelect={(u) => setAddingUser(u)}
        />
        {addingUser && (
          <div className="flex items-center gap-3 bg-violet-500/5 p-3 border border-violet-500/20 rounded-xl">
            <div className="flex justify-center items-center bg-violet-600/30 border border-violet-500/30 rounded-full w-9 h-9 font-bold text-violet-300 text-xs shrink-0">
              {addingUser.f_name[0]}{addingUser.l_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{addingUser.f_name} {addingUser.l_name}</p>
              <p className="text-gray-500 text-xs">{addingUser.email}</p>
            </div>
            <div className="relative shrink-0">
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as StaffRole)}
                className="mt-input pr-7 text-sm appearance-none cursor-pointer">
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>)}
              </select>
              <ChevronDown size={13} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
            </div>
            <button type="button" onClick={handleAdd} disabled={adding}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg font-semibold text-white text-xs">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              เพิ่ม
            </button>
            <button type="button" onClick={() => setAddingUser(null)}
              className="p-1 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white/5 rounded-xl h-16" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="space-y-2 py-12 text-center">
          <Users size={36} className="mx-auto text-gray-700" />
          <p className="text-gray-500 text-sm">ยังไม่มี Staff</p>
          <p className="text-gray-700 text-xs">ค้นหา user ด้านบนเพื่อเพิ่มเป็น staff</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs">{staff.length} คน</p>
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-xl">
              <div className="flex justify-center items-center bg-violet-600/20 border border-violet-500/20 rounded-full w-9 h-9 font-bold text-violet-300 text-xs shrink-0">
                {s.f_name[0]}{s.l_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{s.f_name} {s.l_name}</p>
                <p className="text-gray-500 text-xs truncate">{s.email}</p>
              </div>
              {editId === s.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value as StaffRole)}
                      className="mt-input pr-6 text-xs appearance-none cursor-pointer">
                      {STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>)}
                    </select>
                    <ChevronDown size={11} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button type="button" onClick={() => handleUpdateRole(s)}
                    className="p-1.5 text-green-400 hover:text-green-300"><Check size={15} /></button>
                  <button type="button" onClick={() => setEditId(null)}
                    className="p-1.5 text-gray-500 hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${roleColor(s.role)}`}>
                    {STAFF_ROLE_LABELS[s.role]}
                  </span>
                  <button type="button" onClick={() => { setEditId(s.id); setEditRole(s.role); }}
                    className="p-1.5 text-gray-500 hover:text-white transition-colors"><Pencil size={14} /></button>
                  <button type="button" onClick={() => handleRemove(s)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Event Staff ───────────────────────────────────────────────────────
function EventStaffTab({ organizerId }: { organizerId: number }) {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventStaff, setEventStaff] = useState<EventStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [addStaffId, setAddStaffId] = useState<number>(0);
  const [addRole, setAddRole] = useState<EventStaffRole>("checkin");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchOrganizerEventsList(token, organizerId),
      fetchStaff(token, organizerId),
    ])
      .then(([evs, stf]) => { setEvents(evs); setStaff(stf); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organizerId]);

  async function loadEventStaff(eventId: number) {
    setSelectedEventId(eventId);
    setStaffLoading(true);
    const token = Cookies.get("authToken");
    if (!token) return;
    try {
      setEventStaff(await fetchEventStaff(token, organizerId, eventId));
    } catch { setEventStaff([]); }
    finally { setStaffLoading(false); }
  }

  async function handleAssign() {
    if (!selectedEventId || !addStaffId) return;
    setAdding(true);
    try {
      const token = Cookies.get("authToken")!;
      const updated = await assignStaffToEvent(token, organizerId, selectedEventId, addStaffId, addRole);
      setEventStaff(updated);
      setAddStaffId(0);
      flash("✅ เพิ่ม staff เข้างานสำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    finally { setAdding(false); }
  }

  async function handleRemoveES(staffId: number) {
    if (!selectedEventId) return;
    try {
      const token = Cookies.get("authToken")!;
      setEventStaff(await removeStaffFromEvent(token, organizerId, selectedEventId, staffId));
      flash("✅ ลบ event staff สำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }

  const assignedStaffIds = new Set(eventStaff.map((es) => es.staff_id));
  const availableStaff = staff.filter((s) => !assignedStaffIds.has(s.id));

  return (
    <div className="space-y-5">
      {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

      {loading ? (
        <div className="space-y-2 animate-pulse">{[1, 2].map((i) => <div key={i} className="bg-white/5 rounded-xl h-12" />)}</div>
      ) : (
        <>
          {/* Event selector */}
          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs">เลือก Event</label>
            <div className="relative">
              <select
                value={selectedEventId ?? ""}
                onChange={(e) => e.target.value && loadEventStaff(Number(e.target.value))}
                className="mt-input pr-8 w-full appearance-none cursor-pointer"
              >
                <option value="">— เลือก event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
              <ChevronDown size={15} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {selectedEventId && (
            <>
              {/* Assign form */}
              {staff.length === 0 ? (
                <div className="bg-yellow-500/10 px-4 py-3 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs">
                  ยังไม่มี staff — ไปเพิ่ม staff ใน Tab "Staff" ก่อน
                </div>
              ) : (
                <div className="space-y-3 bg-white/[0.02] p-4 border border-white/5 rounded-2xl">
                  <h3 className="font-semibold text-white text-sm">เพิ่ม Staff เข้างาน</h3>
                  <div className="flex flex-wrap gap-3">
                    {/* Staff dropdown */}
                    <div className="relative flex-1 min-w-[160px]">
                      <select value={addStaffId}
                        onChange={(e) => setAddStaffId(Number(e.target.value))}
                        className="mt-input pr-7 w-full text-sm appearance-none cursor-pointer">
                        <option value={0}>— เลือก staff —</option>
                        {availableStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.f_name} {s.l_name} ({STAFF_ROLE_LABELS[s.role]})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {/* Role dropdown */}
                    <div className="relative shrink-0">
                      <select value={addRole} onChange={(e) => setAddRole(e.target.value as EventStaffRole)}
                        className="mt-input pr-7 text-sm appearance-none cursor-pointer">
                        {EVENT_ROLES.map((r) => <option key={r} value={r}>{EVENT_ROLE_LABELS[r]}</option>)}
                      </select>
                      <ChevronDown size={13} className="top-1/2 right-2 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button type="button" onClick={handleAssign}
                      disabled={!addStaffId || adding}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-xl font-semibold text-white text-sm transition-colors">
                      {adding ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      เพิ่ม
                    </button>
                  </div>
                </div>
              )}

              {/* Event staff list */}
              {staffLoading ? (
                <div className="space-y-2 animate-pulse">{[1, 2].map((i) => <div key={i} className="bg-white/5 rounded-xl h-14" />)}</div>
              ) : eventStaff.length === 0 ? (
                <div className="py-8 text-gray-500 text-sm text-center">
                  ยังไม่มี staff ใน event นี้
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-500 text-xs">{eventStaff.length} คน</p>
                  {eventStaff.map((es) => (
                    <div key={es.id} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-xl">
                      <div className="flex justify-center items-center bg-blue-600/20 border border-blue-500/20 rounded-full w-9 h-9 font-bold text-blue-300 text-xs shrink-0">
                        {es.f_name[0]}{es.l_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{es.f_name} {es.l_name}</p>
                        <p className="text-gray-500 text-xs truncate">{es.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${roleColor(es.role)}`}>
                          {EVENT_ROLE_LABELS[es.role]}
                        </span>
                        <button type="button" onClick={() => handleRemoveES(es.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const { setIsOpen } = useProfileSidebar();
  const organizerId = Number(id);
  const [tab, setTab] = useState<"staff" | "event_staff">("staff");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <Users size={22} className="text-violet-400" />
          <h1 className="font-semibold text-white text-xl">จัดการ Staff</h1>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-4 md:px-6 py-6 min-h-0 overflow-y-auto">

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] p-1 border border-white/5 rounded-xl">
          <button onClick={() => setTab("staff")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "staff" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
            }`}>
            <ShieldCheck size={15} /> Staff ({tab === "staff" ? "" : ""})
          </button>
          <button onClick={() => setTab("event_staff")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "event_staff" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
            }`}>
            <CalendarDays size={15} /> Event Staff
          </button>
        </div>

        {tab === "staff"       && <StaffTab organizerId={organizerId} />}
        {tab === "event_staff" && <EventStaffTab organizerId={organizerId} />}

      </main>
    </div>
  );
}
