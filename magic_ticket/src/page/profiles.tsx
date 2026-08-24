import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";
import {
  Menu, Mail, User, Building2, Plus, Settings,
  ChevronRight, Pencil, X, Check, Loader2,
} from "lucide-react";
import { fetchUser, updateProfile, type UserProfile } from "@/api/user";
import { fetchMyOrganizers, getLogoUrl, type UserOrganizer } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import CreateOrganizerModal from "@/components/organizer/CreateOrganizerModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// ─── Organizer Card ───────────────────────────────────────────────────────────
function OrganizerCard({ org }: { org: UserOrganizer }) {
  const logoSrc = getLogoUrl(org.logo_url);
  const roleBadge = {
    owner:   { label: "เจ้าของ",  cls: "text-green-400 bg-green-400/10 border-green-400/20" },
    manager: { label: "Manager", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    staff:   { label: "Staff",   cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
  }[org.role] ?? { label: org.role, cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

  return (
    <div className="flex justify-between items-center gap-4 mt-surface p-4">
      <div className="flex items-center gap-3 min-w-0">
        {logoSrc ? (
          <img src={logoSrc} alt={org.name}
            className="rounded-xl w-11 h-11 object-cover shrink-0" />
        ) : (
          <div className="flex justify-center items-center bg-violet-600 rounded-xl w-11 h-11 font-bold text-white text-sm shrink-0">
            {getInitials(org.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{org.name}</p>
          {org.description && (
            <p className="text-gray-500 text-xs truncate">{org.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`mt-badge hidden sm:inline-flex ${roleBadge.cls}`}>
          {roleBadge.label}
        </span>
        {org.role === "owner" && (
          <Link to={`/profile/organizer/${org.id}`}
            className="flex items-center gap-1.5 hover:bg-elevated px-3 py-1.5 border border-white/10 hover:border-violet-500/40 rounded-lg font-medium text-gray-300 hover:text-white text-xs transition-colors">
            <Settings size={13} /> จัดการ
          </Link>
        )}
        <ChevronRight size={16} className="text-gray-600" />
      </div>
    </div>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────
function EditableField({
  label, value, icon: Icon, inputType = "text",
  onSave,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  inputType?: string;
  onSave: (newVal: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync draft if parent value changes
  useEffect(() => { setDraft(value); }, [value]);

  async function handleSave() {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setDraft(value); setEditing(false); setError(null); }
  }

  return (
    <div className="flex items-start gap-3 text-gray-300">
      <Icon size={18} className="mt-1 text-violet-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        {editing ? (
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2">
              <input
                type={inputType}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 mt-input py-1.5 text-sm"
              />
              <button
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 p-1.5 rounded-lg text-white shrink-0"
                title="บันทึก"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                onClick={() => { setDraft(value); setEditing(false); setError(null); }}
                className="hover:bg-white/5 p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white shrink-0"
                title="ยกเลิก"
              >
                <X size={14} />
              </button>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-medium text-white text-sm">{value || "—"}</p>
            <button
              onClick={() => { setDraft(value); setEditing(true); setError(null); }}
              className="p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors"
              title={`แก้ไข${label}`}
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Profiles() {
  const { setIsOpen } = useProfileSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizers, setOrganizers] = useState<UserOrganizer[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const token = Cookies.get("authToken");

    // Force fresh fetch (bypass localStorage cache on mount)
    localStorage.removeItem("user");
    fetchUser(token)
      .then((profile) => {
        if (!profile) { setError("ไม่พบข้อมูลผู้ใช้"); return; }
        setUser(profile);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setUserLoading(false));

    if (token) {
      fetchMyOrganizers(token)
        .then(setOrganizers)
        .catch((err: Error) => console.error("Failed to load organizers:", err))
        .finally(() => setOrgLoading(false));
    } else {
      setOrgLoading(false);
    }
  }, []);

  const isLoading = userLoading || orgLoading;

  // Generic field saver — calls PATCH /users/me
  function makeSaver(field: "firstname" | "lastname" | "email") {
    return async (value: string) => {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const updated = await updateProfile(token, { [field]: value });
      setUser(updated);
    };
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsOpen(true)}
            className="md:hidden focus:outline-none text-gray-400 hover:text-white cursor-pointer"
            aria-label="Open menu">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-2xl">บัญชีของฉัน</h1>
        </div>
      </header>

      <main className="mt-dashboard-main w-full">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-4 w-full">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 w-full w-full text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-6 w-full">

            {/* ── User info card ── */}
            {user && (
              <div className="mt-surface p-6">
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex justify-center items-center bg-gradient-to-br from-violet-600 to-purple-600 border border-white/10 rounded-full w-16 h-16 font-bold text-white text-xl">
                    {user.firstname?.[0]}{user.lastname?.[0]}
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-xl">{user.name}</h2>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="gap-5 grid grid-cols-1 sm:grid-cols-2">
                  <EditableField
                    label="ชื่อ"
                    value={user.firstname}
                    icon={User}
                    onSave={makeSaver("firstname")}
                  />
                  <EditableField
                    label="นามสกุล"
                    value={user.lastname}
                    icon={User}
                    onSave={makeSaver("lastname")}
                  />
                  <div className="sm:col-span-2">
                    <EditableField
                      label="อีเมล"
                      value={user.email}
                      icon={Mail}
                      inputType="email"
                      onSave={makeSaver("email")}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ── Organizer section ── */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-violet-400" />
                  <h2 className="font-semibold text-gray-300 text-sm">Organizer ของฉัน</h2>
                  {organizers.length > 0 && (
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-gray-400 text-xs">
                      {organizers.length}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 bg-violet-600/20 hover:bg-violet-600/30 px-3 py-1.5 rounded-lg font-semibold text-violet-300 text-xs transition-colors">
                  <Plus size={14} /> สร้างใหม่
                </button>
              </div>

              {organizers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 mt-surface py-10 text-center">
                  <Building2 size={32} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-400 text-sm">ยังไม่มี Organizer</p>
                    <p className="mt-0.5 text-gray-600 text-xs">สร้าง organizer เพื่อเริ่มจัดงาน</p>
                  </div>
                  <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 bg-violet-600/20 hover:bg-violet-600/30 px-4 py-2 rounded-lg font-semibold text-violet-300 text-sm transition-colors">
                    <Plus size={16} /> สร้าง Organizer ใหม่
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {organizers.map((org) => (
                    <OrganizerCard key={org.id} org={org} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateOrganizerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newOrg) => {
            setOrganizers((prev) => [...prev, newOrg]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
