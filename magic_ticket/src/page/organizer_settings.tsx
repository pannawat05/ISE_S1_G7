import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Menu, ArrowLeft, ImageIcon, Trash2, Save, AlertTriangle, X } from "lucide-react";
import Cookies from "js-cookie";
import {
  fetchOrganizer,
  updateOrganizer,
  deleteOrganizer,
  getLogoUrl,
  type OrganizerDetail,
} from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────
function DeleteConfirmDialog({
  organizerName,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  organizerName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="z-[110] fixed inset-0 flex justify-center items-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[#1a1a2e] shadow-2xl p-6 border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="flex justify-center items-center bg-red-500/15 mb-4 rounded-full w-12 h-12">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className="mb-2 font-bold text-white text-lg">ลบ Organizer?</h3>
        <p className="mb-1 text-gray-400 text-sm">
          คุณกำลังจะลบ <span className="font-semibold text-white">"{organizerName}"</span>
        </p>
        <p className="mb-6 text-gray-500 text-sm">
          การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบ events ทั้งหมดที่เกี่ยวข้อง
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-2.5 border border-white/10 rounded-xl font-semibold text-white text-sm transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
          >
            {isDeleting ? "กำลังลบ..." : "ลบ Organizer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function OrganizerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useProfileSidebar();

  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save/delete state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const MAX_DESC = 300;

  // ── Fetch organizer ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || !id) return;

    fetchOrganizer(token, Number(id))
      .then((org) => {
        setOrganizer(org);
        setName(org.name);
        setDescription(org.description ?? "");
      })
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ── File handling ────────────────────────────────────────────────────────
  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setSaveError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("ขนาดไฟล์ต้องไม่เกิน 2MB");
      return;
    }
    setSaveError(null);
    setLogoFile(file);
    setRemoveExistingLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveExistingLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Current displayed logo ───────────────────────────────────────────────
  const displayedLogo = logoPreview
    ?? (!removeExistingLogo ? getLogoUrl(organizer?.logo_url ?? null) : null);

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setSaveError("กรุณากรอกชื่อ Organizer"); return; }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      if (logoFile) formData.append("logo", logoFile);
      if (removeExistingLogo) formData.append("remove_logo", "1");

      const { organizer: updated } = await updateOrganizer(token, Number(id), formData);
      setOrganizer((prev) => prev ? { ...prev, ...updated } : prev);
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveExistingLogo(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    setIsDeleting(true);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      await deleteOrganizer(token, Number(id));
      // Reload full page so sidebar re-fetches organizer list
      window.location.href = "/profile/account";
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden text-gray-400 hover:text-white cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-2xl">
            {isLoading ? "..." : (organizer?.name ?? "Organizer Settings")}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="mt-dashboard-main">
        {isLoading && (
          <div className="space-y-4 w-full max-w-4xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {fetchError && (
          <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 rounded-xl w-full max-w-4xl text-red-400">
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && organizer && (
          <div className="space-y-6 w-full max-w-4xl">
            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-5 mt-surface p-6 rounded-xl">
              <h2 className="font-semibold text-white text-base">ข้อมูล Organizer</h2>

              {/* Success banner */}
              {saveSuccess && (
                <div className="flex justify-between items-center bg-green-500/10 px-4 py-3 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  <span>บันทึกข้อมูลสำเร็จ</span>
                  <button onClick={() => setSaveSuccess(false)}><X size={16} /></button>
                </div>
              )}

              {/* Error banner */}
              {saveError && (
                <div className="flex justify-between items-center bg-red-500/10 px-4 py-3 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <span>{saveError}</span>
                  <button onClick={() => setSaveError(null)}><X size={16} /></button>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm">
                  ชื่อ Organizer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น Magic Ticket Events Co."
                  className="bg-black/30 px-4 py-3 border border-white/10 focus:border-violet-500 rounded-lg outline-none focus:ring-1 focus:ring-violet-500/40 w-full text-white text-sm transition-colors placeholder-gray-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm">คำอธิบาย</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                  placeholder="อธิบายสั้นๆ ว่า organizer นี้จัดงานประเภทไหน"
                  rows={4}
                  className="bg-black/30 px-4 py-3 border border-white/10 focus:border-violet-500 rounded-lg outline-none focus:ring-1 focus:ring-violet-500/40 w-full text-white text-sm transition-colors resize-y placeholder-gray-500"
                />
                <p className="text-gray-500 text-xs text-right">
                  {description.length}/{MAX_DESC}
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm">โลโก้</label>

                {displayedLogo ? (
                  <div className="flex justify-between items-center bg-black/30 px-4 py-3 border border-white/10 rounded-lg">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={displayedLogo}
                        alt="logo"
                        className="rounded-lg w-10 h-10 object-cover shrink-0"
                      />
                      <span className="text-gray-300 text-sm truncate">
                        {logoFile ? logoFile.name : "โลโก้ปัจจุบัน"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="hover:bg-white/10 ml-2 p-1.5 rounded text-gray-400 hover:text-red-400 transition-colors shrink-0"
                      aria-label="ลบโลโก้"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
                      isDragging
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 bg-black/30 hover:border-violet-500/50 hover:bg-violet-500/5"
                    }`}
                  >
                    <ImageIcon size={28} className="text-gray-500" />
                    <p className="text-gray-400 text-sm text-center">
                      ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูป
                    </p>
                    <p className="text-gray-500 text-xs">PNG/JPG ไม่เกิน 2MB</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </button>
              </div>
            </form>

            {/* Danger zone */}
            <div className="bg-red-500/5 p-6 border border-red-500/20 rounded-xl">
              <h2 className="mb-1 font-semibold text-red-400 text-base">Danger Zone</h2>
              <p className="mb-4 text-gray-500 text-sm">
                การลบ organizer จะลบข้อมูลทั้งหมดที่เกี่ยวข้อง รวมถึง events ทั้งหมด
              </p>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 hover:bg-red-500/10 px-4 py-2.5 border border-red-500/40 rounded-xl font-semibold text-red-400 text-sm transition-colors"
              >
                <Trash2 size={16} />
                ลบ Organizer
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirm dialog */}
      {showDeleteDialog && organizer && (
        <DeleteConfirmDialog
          organizerName={organizer.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
