import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ImageIcon, Trash2, Save, AlertCircle, Menu, CreditCard, ShieldAlert, Building2 } from "lucide-react";
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
import Swal from "sweetalert2";

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function OrganizerSettingsPage() {
  const { id } = useParams<{ id: string }>();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  const MAX_DESC = 300;

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  // ── Fetch organizer ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || !id || !Number.isFinite(Number(id))) {
      const message = !token ? "กรุณาเข้าสู่ระบบก่อน" : "ไม่พบไอดี Organizer ที่ถูกต้อง";
      setFetchError(message);
      setIsLoading(false);
      return;
    }
    fetchOrganizer(token, Number(id))
      .then((org) => { setOrganizer(org); setName(org.name); setDescription(org.description ?? ""); })
      .catch(async (err: unknown) => {
        const msg = err instanceof Error && err.message.trim() ? err.message : "ไม่สามารถโหลดข้อมูลได้";
        setFetchError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  // ── File handling ────────────────────────────────────────────────────────
  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) { void Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "กรุณาเลือกไฟล์รูปภาพ", showConfirmButton: false, timer: 3000 }); return; }
    if (file.size > 2 * 1024 * 1024) { void Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "ขนาดไฟล์ต้องไม่เกิน 2MB", showConfirmButton: false, timer: 3000 }); return; }
    setLogoFile(file);
    setRemoveExistingLogo(false);
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [logoPreview]);

  function clearLogo() {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null); setLogoPreview(null); setRemoveExistingLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const displayedLogo = logoPreview ?? (!removeExistingLogo ? getLogoUrl(organizer?.logo_url ?? null) : null);

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      void Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "กรุณากรอกชื่อ Organizer", showConfirmButton: false, timer: 3000, timerProgressBar: true });
      return;
    }
    setIsSaving(true);
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
      setLogoFile(null); setLogoPreview(null); setRemoveExistingLogo(false);
      await Swal.fire({ toast: true, position: "top-end", icon: "success", title: "บันทึกข้อมูลสำเร็จ", showConfirmButton: false, timer: 2500, timerProgressBar: true });
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", confirmButtonText: "ตกลง" });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบ Organizer?",
      html: `คุณกำลังจะลบ <strong>"${organizer?.name}"</strong><br/>การกระทำนี้ไม่สามารถย้อนกลับได้`,
      showCancelButton: true,
      confirmButtonText: "ลบ Organizer",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setIsDeleting(true);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      await deleteOrganizer(token, Number(id));
      await Swal.fire({ toast: true, position: "top-end", icon: "success", title: "ลบ Organizer สำเร็จ", showConfirmButton: false, timer: 2000, timerProgressBar: true });
      window.location.href = "/profile/account";
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", confirmButtonText: "ตกลง" });
      setIsDeleting(false);
    }
  }

  // ── Stripe Connect ────────────────────────────────────────────────────────
  async function handleConnectStripe() {
    setIsConnectingStripe(true);
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      if (!id) throw new Error("ไม่พบไอดี Organizer");
      const result = await generateStripeOnboardingLink(token, Number(id));
      if (result?.onboarding_url) window.location.href = result.onboarding_url;
      else throw new Error("ไม่ได้รับ onboarding URL");
    } catch (err: unknown) {
      await Swal.fire({ icon: "error", title: "เชื่อมต่อ Stripe ไม่สำเร็จ", text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", confirmButtonText: "ตกลง" });
    } finally {
      setIsConnectingStripe(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Header ── */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-2xl">
            {isLoading ? "..." : (organizer?.name ?? "ตั้งค่า Organizer")}
          </h1>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mt-dashboard-main">
        {isLoading && (
          <div className="space-y-4 max-w-2xl">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />)}
          </div>
        )}

        {fetchError && (
          <div className="flex items-center gap-2 bg-red-500/10 p-4 border border-red-500/30 rounded-xl max-w-2xl text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && organizer && (
          <div className="space-y-5 max-w-2xl">

            {/* ── ข้อมูล Organizer ── */}
            <form onSubmit={handleSave} className="space-y-5 mt-surface p-6">
              <div className="flex items-center gap-2 pb-3 border-white/5 border-b">
                <Building2 size={16} className="text-violet-400" />
                <h2 className="font-semibold text-white text-sm">ข้อมูล Organizer</h2>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <label className="mt-label">โลโก้ Organizer</label>
                {displayedLogo ? (
                  <div className="flex items-center gap-4 bg-white/[0.03] p-4 border border-white/10 rounded-xl">
                    <img src={displayedLogo} alt="logo" className="border border-white/10 rounded-xl w-14 h-14 object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{logoFile ? logoFile.name : "โลโก้ปัจจุบัน"}</p>
                      <p className="mt-0.5 text-gray-500 text-xs">PNG, JPG ไม่เกิน 2MB</p>
                    </div>
                    <button type="button" onClick={clearLogo} className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      isDragging ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-violet-500/50"
                    }`}
                  >
                    <ImageIcon size={26} className="text-gray-500" />
                    <p className="text-gray-400 text-sm">ลากไฟล์มาวาง หรือ <span className="text-violet-400">คลิกเลือกรูป</span></p>
                    <p className="text-gray-600 text-xs">PNG, JPG ขนาดไม่เกิน 2MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="mt-label">ชื่อ Organizer <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-input"
                  placeholder="เช่น Rock Concert Organizer"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="mt-label">รายละเอียด</label>
                  <span className="text-gray-500 text-xs">{description.length}/{MAX_DESC}</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                  rows={4}
                  className="mt-input resize-none"
                  placeholder="เขียนอธิบายบทบาทหรือแนวทางงานอีเวนต์..."
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
                >
                  <Save size={15} />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </button>
              </div>
            </form>

            {/* ── Stripe Connect ── */}
            <div className="space-y-4 mt-surface p-6">
              <div className="flex items-center gap-2 pb-3 border-white/5 border-b">
                <CreditCard size={16} className="text-violet-400" />
                <h2 className="font-semibold text-white text-sm">ระบบรับเงิน Stripe Connect</h2>
                <span className="flex-1" />
                {organizer.stripe_account_id ? (
                  <span className="bg-emerald-500/15 px-2.5 py-0.5 border border-emerald-500/30 rounded-full font-medium text-emerald-400 text-xs">เชื่อมต่อแล้ว</span>
                ) : (
                  <span className="bg-amber-500/15 px-2.5 py-0.5 border border-amber-500/30 rounded-full font-medium text-amber-400 text-xs">ยังไม่ได้เชื่อมต่อ</span>
                )}
              </div>

              <p className="text-gray-500 text-xs">
                จำเป็นต้องระบุข้อมูลธนาคารเพื่อรับรายได้จากการขายตั๋วเข้างานโดยตรงเข้าบัญชีคุณ
              </p>

              {organizer.stripe_account_id ? (
                <div className="flex items-center gap-3 bg-emerald-500/5 px-4 py-3 border border-emerald-500/20 rounded-xl">
                  <CreditCard size={16} className="text-emerald-400 shrink-0" />
                  <p className="text-gray-300 text-sm">
                    Stripe ID: <span className="font-mono text-violet-400 text-xs">{organizer.stripe_account_id}</span>
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={isConnectingStripe}
                  className="flex items-center gap-2 bg-[#635BFF] hover:bg-[#5349e4] disabled:opacity-50 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
                >
                  <CreditCard size={15} />
                  {isConnectingStripe ? "กำลังติดต่อ Stripe..." : "เชื่อมต่อบัญชี Stripe Express"}
                </button>
              )}
            </div>

            {/* ── Danger Zone ── */}
            <div className="space-y-4 mt-surface p-6 border border-red-500/30">
              <div className="flex items-center gap-2 pb-3 border-red-500/10 border-b">
                <ShieldAlert size={16} className="text-red-400" />
                <h2 className="font-semibold text-red-400 text-sm">Danger Zone</h2>
              </div>

              <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 bg-red-500/5 px-4 py-3 border border-red-500/15 rounded-xl">
                <div>
                  <p className="font-medium text-white text-sm">ลบ Organizer นี้</p>
                  <p className="mt-0.5 text-gray-500 text-xs">จะลบข้อมูลและ events ที่เกี่ยวข้องทั้งหมดอย่างถาวร</p>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-xl font-semibold text-white text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed shrink-0"
                >
                  <Trash2 size={14} />
                  {isDeleting ? "กำลังลบ..." : "ลบ Organizer"}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
