import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Menu, ArrowLeft, ImageIcon, Trash2, Save, AlertTriangle, X, CheckCircle2, AlertCircle } from "lucide-react";
import Cookies from "js-cookie";
import {
  fetchOrganizer,
  updateOrganizer,
  deleteOrganizer,
  getLogoUrl,
  generateStripeOnboardingLink,
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
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 hover:bg-white/5 disabled:opacity-50 px-4 py-2.5 border border-white/10 rounded-xl font-semibold text-white text-sm transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed cursor-pointer"
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

  // Stripe Onboarding States
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const MAX_DESC = 300;

  // Revoke object URL on cleanup to prevent memory leak
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

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

    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [logoPreview]);

  function clearLogo() {
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
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
      setOrganizer((prev) => (prev ? { ...prev, ...updated } : prev));
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
      window.location.href = "/profile/account";
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  // ── Trigger Stripe Connect Onboarding Flow ──────────────────────────────
  async function handleConnectStripe() {
    setIsConnectingStripe(true);
    setStripeError(null);

    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      if (!id) throw new Error("ไม่พบไอดี Organizer");

      const result = await generateStripeOnboardingLink(token, Number(id));

      if (result && result.onboarding_url) {
        window.location.href = result.onboarding_url;
      } else {
        throw new Error("เซิร์ฟเวอร์ไม่ได้ส่ง onboarding_url กลับมา");
      }
    } catch (err: any) {
      console.error("Stripe Connection Setup Failed:", err);
      setStripeError(err.message || "เชื่อมต่อกับระบบ Stripe ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsConnectingStripe(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden text-white">
      {/* Header */}
      <header className="shrink-0 pb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="md:hidden text-gray-400 hover:text-white cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-white text-2xl">
            {isLoading ? "..." : (organizer?.name ?? "Organizer Settings")}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pr-2 pb-12">
        {isLoading && (
          <div className="space-y-4 w-full max-w-4xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {fetchError && (
          <div className="bg-red-500/10 p-4 border border-red-500/30 rounded-xl w-full max-w-4xl text-red-400">
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && organizer && (
          <div className="space-y-6 w-full max-w-4xl">
            {/* Main Form */}
            <form onSubmit={handleSave} className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
              <h3 className="text-md font-bold text-gray-200 border-b border-white/5 pb-2">ข้อมูล Organizer</h3>

              {saveError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>✨ บันทึกการเปลี่ยนแปลงข้อมูลเรียบร้อยแล้ว</span>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  ชื่อ Organizer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-[#0d0d1a] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
                  placeholder="เช่น Rock Concert Organizer"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">รายละเอียดเกี่ยวกับ Organizer</label>
                  <span className="text-xs text-gray-400">{description.length}/{MAX_DESC}</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                  rows={4}
                  className="w-full resize-none rounded-lg bg-[#0d0d1a] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
                  placeholder="เขียนอธิบายบทบาทหรือแนวทางงานอีเวนต์..."
                />
              </div>

              {/* Logo Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">โลโก้ Organizer</label>
                {displayedLogo ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-[#0d0d1a]">
                    <img
                      src={displayedLogo}
                      alt="Organizer Logo"
                      className="w-16 h-16 rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 font-medium">โลโก้ปัจจุบัน</p>
                      <p className="text-xs text-gray-500">รองรับไฟล์ PNG, JPG ขนาดไม่เกิน 2MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
                      isDragging ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-[#0d0d1a] hover:border-violet-500/50"
                    }`}
                  >
                    <ImageIcon size={28} className="text-gray-400" />
                    <span className="text-sm text-gray-300">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูป</span>
                    <span className="text-xs text-gray-500">PNG, JPG ขนาดไม่เกิน 2MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={16} />
                  <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}</span>
                </button>
              </div>
            </form>

            {/* Stripe Connect Panel */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-md font-bold text-gray-200">💳 ระบบรับเงินผ่าน Stripe Connect</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    จำเป็นต้องระบุข้อมูลธนาคารเพื่อรับรายได้จากการขายตั๋วเข้างานโดยตรงเข้าบัญชีคุณ
                  </p>
                </div>
                {organizer.stripe_account_id ? (
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-full font-medium">
                    เชื่อมต่อสำเร็จ
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs rounded-full font-medium">
                    ยังไม่ได้เชื่อมต่อ
                  </span>
                )}
              </div>

              {stripeError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{stripeError}</span>
                </div>
              )}

              {!organizer.stripe_account_id ? (
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={isConnectingStripe}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#635BFF] hover:bg-[#5349e4] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  {isConnectingStripe ? "กำลังติดต่อเซิร์ฟเวอร์ Stripe..." : "🔗 เชื่อมต่อบัญชี Stripe Express"}
                </button>
              ) : (
                <p className="text-sm text-gray-300 bg-[#0d0d1a] border border-white/5 p-3 rounded-xl">
                  🎉 ตรวจพบรหัสประจำตัวร้านค้า Stripe: <span className="font-mono text-violet-400">{organizer.stripe_account_id}</span> บัญชีนี้พร้อมเปิดใช้งานสำหรับการรับยอดชำระเงินในระบบ Checkout แล้ว
                </p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-[#1a1a2e] border border-red-500/20 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-md font-bold text-red-400">Danger Zone</h3>
                <p className="text-xs text-gray-400 mt-1">
                  การลบ Organizer จะลบข้อมูลทั้งหมดที่เกี่ยวข้อง รวมถึงงานกิจกรรม (events) ทั้งหมดอย่างถาวร
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                ลบ Organizer
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
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