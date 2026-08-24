/**
 * WhitelistManager — ใช้ใน event_edit.tsx
 * ผู้จัดงานเพิ่ม user เข้า whitelist เพื่อให้เข้างานได้โดยไม่ต้องซื้อบัตร
 * ไม่นับรวมกับ seat/ticket stats บน dashboard
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, UserPlus, X, Loader2, UserCheck, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import {
  fetchWhitelist, addToWhitelist, removeFromWhitelist, searchUsers,
  type WhitelistEntry, type UserSearchResult,
} from "@/api/organizer";

// ─── Search Dropdown ──────────────────────────────────────────────────────────
function UserSearchDropdown({
  organizerId, onSelect, excludeIds,
}: {
  organizerId: number;
  onSelect: (user: UserSearchResult) => void;
  excludeIds: Set<number>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // ป้องกัน useEffect ยิง search ตอน pickUser เซต q
  const suppressSearchRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // ถ้ากำลัง suppress (pickUser เพิ่งเลือก) ให้ข้ามไป
    if (suppressSearchRef.current) { suppressSearchRef.current = false; return; }
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const token = Cookies.get("authToken");
      if (!token) return;
      try {
        const data = await searchUsers(token, organizerId, q.trim());
        setResults(data.filter((u) => !excludeIds.has(u.id)));
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, [q, organizerId, excludeIds]);

  function pickUser(user: UserSearchResult) {
    suppressSearchRef.current = true; // บอก useEffect ว่าอย่า search รอบนี้
    setSelectedUser(user);
    setQ(`${user.f_name} ${user.l_name} (${user.email})`);
    setOpen(false);
    setResults([]);
  }

  function confirm() {
    if (!selectedUser) return;
    onSelect({ ...selectedUser, _note: note.trim() } as UserSearchResult & { _note: string });
    setQ(""); setNote(""); setSelectedUser(null); setResults([]);
  }

  return (
    <div className="space-y-3">
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelectedUser(null); }}
            placeholder="ค้นหาด้วยชื่อ หรือ email..."
            className="mt-input pr-9 pl-9 w-full text-sm"
          />
          {loading && (
            <Loader2 size={14} className="top-1/2 right-3 absolute text-gray-500 -translate-y-1/2 animate-spin" />
          )}
          {selectedUser && !loading && (
            <button type="button" onClick={() => { setQ(""); setSelectedUser(null); }}
              className="top-1/2 right-3 absolute text-gray-500 hover:text-white -translate-y-1/2">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {open && results.length > 0 && (
          <div className="z-50 absolute bg-[#1a1a1a] shadow-2xl mt-1 border border-white/10 rounded-xl w-full overflow-hidden">
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => pickUser(user)}
                className="flex items-center gap-3 hover:bg-white/5 px-4 py-3 w-full text-left transition-colors"
              >
                <div className="flex justify-center items-center bg-violet-600/30 border border-violet-500/30 rounded-full w-8 h-8 font-bold text-violet-300 text-xs shrink-0">
                  {user.f_name[0]}{user.l_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {user.f_name} {user.l_name}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && !loading && q.length >= 2 && results.length === 0 && (
          <div className="z-50 absolute bg-[#1a1a1a] mt-1 p-4 border border-white/10 rounded-xl w-full text-gray-500 text-sm text-center">
            ไม่พบ user
          </div>
        )}
      </div>

      {/* Note + Add button — shown after user is selected */}
      {selectedUser && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ (เช่น สื่อมวลชน, VIP Guest) — ไม่บังคับ"
            className="flex-1 mt-input text-sm"
          />
          <button
            type="button"
            onClick={confirm}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl font-semibold text-white text-sm transition-colors shrink-0"
          >
            <UserPlus size={16} />
            เพิ่ม
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Whitelist Row ────────────────────────────────────────────────────────────
function WhitelistRow({ entry, onRemove }: {
  entry: WhitelistEntry;
  onRemove: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`ลบ ${entry.f_name} ${entry.l_name} ออกจาก whitelist?`)) return;
    setRemoving(true);
    onRemove(entry.id);
  }

  return (
    <div className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-xl">
      <div className="flex justify-center items-center bg-violet-600/20 border border-violet-500/20 rounded-full w-9 h-9 font-bold text-violet-300 text-xs shrink-0">
        {entry.f_name[0]}{entry.l_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">
          {entry.f_name} {entry.l_name}
        </p>
        <p className="text-gray-500 text-xs truncate">{entry.email}</p>
        {entry.note && (
          <p className="mt-0.5 text-violet-400 text-xs truncate">
            📝 {entry.note}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-green-400 text-xs">
          <ShieldCheck size={12} />
          Whitelisted
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="disabled:opacity-50 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
          title="ลบออก"
        >
          {removing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface WhitelistManagerProps {
  organizerId: number;
  eventId: number;
}

export default function WhitelistManager({ organizerId, eventId }: WhitelistManagerProps) {
  const [list, setList] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  function flash(text: string, type: "ok" | "err" = "ok") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  const load = useCallback(async () => {
    const token = Cookies.get("authToken");
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchWhitelist(token, organizerId, eventId);
      setList(data);
    } catch (e) { flash(e instanceof Error ? e.message : "โหลดไม่สำเร็จ", "err"); }
    finally { setLoading(false); }
  }, [organizerId, eventId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(user: UserSearchResult & { _note?: string }) {
    const token = Cookies.get("authToken");
    if (!token) return;
    try {
      const updated = await addToWhitelist(token, organizerId, eventId, user.id, user._note);
      setList(updated);
      flash(`✅ เพิ่ม ${user.f_name} ${user.l_name} เข้า whitelist แล้ว`);
    } catch (e) { flash(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ", "err"); }
  }

  async function handleRemove(wlId: number) {
    const token = Cookies.get("authToken");
    if (!token) return;
    try {
      const updated = await removeFromWhitelist(token, organizerId, eventId, wlId);
      setList(updated);
      flash("✅ ลบออกแล้ว");
    } catch (e) { flash(e instanceof Error ? e.message : "ลบไม่สำเร็จ", "err"); }
  }

  const excludeIds = new Set(list.map((e) => e.users_id));

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-white/5 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">
            Whitelist
          </h2>
          {list.length > 0 && (
            <span className="bg-violet-500/20 px-2 py-0.5 border border-violet-500/30 rounded-full text-violet-300 text-xs">
              {list.length} คน
            </span>
          )}
        </div>
        <p className="flex items-center gap-1 text-gray-600 text-xs">
          <ShieldCheck size={12} />
          ไม่นับรวมกับยอดขายตั๋ว
        </p>
      </div>

      {/* Info note */}
      <div className="flex gap-2.5 bg-violet-500/5 px-4 py-3 border border-violet-500/15 rounded-xl">
        <UserCheck size={16} className="mt-0.5 text-violet-400 shrink-0" />
        <p className="text-gray-400 text-xs leading-relaxed">
          User ใน whitelist สามารถเข้างานได้โดยตรงโดยไม่ต้องซื้อบัตร
          
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}

      {/* Search + Add */}
      <UserSearchDropdown
        organizerId={organizerId}
        onSelect={handleAdd}
        excludeIds={excludeIds}
      />

      {/* List */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="bg-white/5 rounded-xl h-14" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="space-y-1 py-8 text-center">
          <UserCheck size={32} className="mx-auto text-gray-700" />
          <p className="text-gray-500 text-sm">ยังไม่มีใครใน whitelist</p>
          <p className="text-gray-700 text-xs">ค้นหา user ด้านบนเพื่อเพิ่ม</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((entry) => (
            <WhitelistRow key={entry.id} entry={entry} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </section>
  );
}
