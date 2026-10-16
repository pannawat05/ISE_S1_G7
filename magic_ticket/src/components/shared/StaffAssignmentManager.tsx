import Swal from 'sweetalert2';
import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, X, Loader2, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import { assignEventStaff, fetchEventStaff, removeEventStaff, searchUsers, type EventStaffAssignment, type UserSearchResult } from "@/api/organizer";

function showError(error: unknown, fallback: string) {
  void Swal.fire({
    icon: 'error',
    title: 'เกิดข้อผิดพลาด',
    text: error instanceof Error && error.message ? error.message : fallback,
    confirmButtonColor: '#7c3aed',
  });
}

export default function StaffAssignmentManager({ organizerId, eventId }: { organizerId: number; eventId: number }) {
  const [staff, setStaff] = useState<EventStaffAssignment[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [role, setRole] = useState("checkin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = Cookies.get("authToken");
    if (!token) {
      const error = new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      console.error(error);
      showError(error, "กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    setLoading(true);
    try {
      setStaff(await fetchEventStaff(token, organizerId, eventId));
    } catch (error: unknown) {
      console.error(error);
      showError(error, "โหลดรายชื่อ Staff ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    finally { setLoading(false); }
  }, [organizerId, eventId]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || query.trim().length < 2 || selected) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(token, organizerId, query.trim())
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch((error: unknown) => {
          console.error(error);
          if (!cancelled) {
            setResults([]);
            showError(error, "ค้นหา Staff ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, organizerId, selected]);

  async function handleAssign() {
    const token = Cookies.get("authToken");
    if (!token) {
      const error = new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      console.error(error);
      showError(error, "กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    if (!selected) return;
    setSaving(true);
    try {
      await assignEventStaff(token, organizerId, eventId, selected.id, role);
      setSelected(null); setQuery(""); setMessage("Assign staff สำเร็จ"); await load();
    } catch (error: unknown) {
      console.error(error);
      showError(error, "มอบหมาย Staff ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    finally { setSaving(false); }
  }

  async function handleRemove(assignmentId: number) {
    const token = Cookies.get("authToken");
    if (!token) {
      const error = new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      console.error(error);
      showError(error, "กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    if (!confirm("นำ staff คนนี้ออกจาก event หรือไม่?")) return;
    try {
      await removeEventStaff(token, organizerId, eventId, assignmentId);
      setMessage("นำ staff ออกจาก event แล้ว");
      await load();
    } catch (error: unknown) {
      console.error(error);
      showError(error, "นำ Staff ออกจากกิจกรรมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  const assignedIds = new Set(staff.map((item) => item.user_id));
  return <section className="space-y-4 bg-white/[0.02] p-4 border border-white/5 rounded-2xl">
    <div className="flex justify-between items-center"><div><h3 className="font-semibold text-white">Assign Staff</h3><p className="mt-1 text-gray-500 text-xs">กำหนดหน้าที่ staff สำหรับ event นี้</p></div>{message && <span className="text-violet-300 text-xs">{message}</span>}</div>
    <div className="flex sm:flex-row flex-col gap-2">
      <div className="relative flex-1"><Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" /><input value={selected ? `${selected.f_name} ${selected.l_name} (${selected.email})` : query} onChange={(event) => { setSelected(null); setQuery(event.target.value); if (event.target.value.trim().length < 2) setResults([]); }} placeholder="ค้นหา staff ด้วยชื่อหรือ email..." className="mt-input pl-9" />{results.length > 0 && <div className="z-20 absolute bg-[#171717] shadow-xl mt-1 border border-white/10 rounded-xl w-full overflow-hidden">{results.filter((user) => !assignedIds.has(user.id)).map((user) => <button key={user.id} type="button" onClick={() => { setSelected(user); setQuery(""); setResults([]); }} className="block hover:bg-white/5 px-3 py-2 w-full text-left"><p className="text-white text-sm">{user.f_name} {user.l_name}</p><p className="text-gray-500 text-xs">{user.email}</p></button>)}</div>}</div>
      <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-input sm:w-40"><option value="checkin">Check-in</option><option value="security">Security</option><option value="registration">Registration</option><option value="backstage">Backstage</option><option value="manager">Manager</option></select>
      <button type="button" onClick={handleAssign} disabled={!selected || saving} className="flex justify-center items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-xl font-semibold text-white text-sm"><UserPlus size={15} /> Assign</button>
    </div>
    {loading ? <Loader2 size={18} className="text-violet-400 animate-spin" /> : <div className="space-y-2">{staff.map((item) => <div key={item.assignment_id} className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-xl"><div className="flex justify-center items-center bg-violet-600/20 rounded-full w-8 h-8 font-semibold text-violet-300 text-xs">{item.f_name[0]}{item.l_name[0]}</div><div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{item.f_name} {item.l_name}</p><p className="text-gray-500 text-xs truncate">{item.email}</p></div><span className="flex items-center gap-1 text-green-400 text-xs"><ShieldCheck size={13} /> {item.event_role}</span><button type="button" onClick={() => handleRemove(item.assignment_id)} className="p-1 text-gray-500 hover:text-red-400"><X size={15} /></button></div>)}{!staff.length && <p className="py-3 text-gray-500 text-xs">ยังไม่มี staff ใน event นี้</p>}</div>}
  </section>;
}