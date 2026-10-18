import { useState, useRef, useCallback } from "react";
import { X, ImageIcon, Trash2 } from "lucide-react";
import Cookies from "js-cookie";
import { createOrganizer, type UserOrganizer } from "../../api/organizer";
import Swal from "sweetalert2";

interface CreateOrganizerModalProps {
  onClose: () => void;
  onCreated: (organizer: UserOrganizer) => void;
}

export default function CreateOrganizerModal({
  onClose,
  onCreated,
}: CreateOrganizerModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_DESC = 200;

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องไม่เกิน 2MB");
      return;
    }
    setError(null);
    setLogoFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("กรุณากรอกชื่อ Organizer");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      if (logoFile) formData.append("logo", logoFile);

      const result = await createOrganizer(token, formData);

      await Swal.fire({
        icon: "success",
        title: "สร้าง Organizer สำเร็จ",
        text: result.message || "สร้าง Organizer เรียบร้อยแล้ว",
        confirmButtonText: "ตกลง",
      });

      onCreated({
        id: result.organizerId,
        name: result.name,
        logo_url: result.logo_url,
        role: "owner",
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่";

      await Swal.fire({
        icon: "error",
        title: "สร้าง Organizer ไม่สำเร็จ",
        text: message,
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="z-[100] fixed inset-0 flex justify-center items-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal panel */}
      <div className="bg-[#1a1a2e] shadow-2xl border border-white/10 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <h2 className="font-bold text-white text-lg">
            สร้าง <span className="font-bold">Organizer</span> ใหม่
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6">
          {/* Error */}
          {error && (
            <p className="bg-red-500/15 px-4 py-3 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </p>
          )}

          {/* ชื่อ Organizer */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">
              ชื่อ Organizer <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Magic Ticket Events Co."
              className="bg-[#0d0d1a] px-4 py-3 border border-white/10 focus:border-violet-500 rounded-lg outline-none focus:ring-1 focus:ring-violet-500/40 w-full text-white text-sm transition-colors placeholder-gray-500"
            />
          </div>

          {/* คำอธิบาย */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">คำอธิบาย</label>
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_DESC))
              }
              placeholder="อธิบายสั้นๆ ว่า organizer นี้จัดงานประเภทไหน"
              rows={4}
              className="bg-[#0d0d1a] px-4 py-3 border border-white/10 focus:border-violet-500 rounded-lg outline-none focus:ring-1 focus:ring-violet-500/40 w-full text-white text-sm transition-colors resize-y placeholder-gray-500"
            />
            <p className="text-gray-500 text-xs text-right">
              {description.length}/{MAX_DESC}
            </p>
          </div>

          {/* โลโก้ */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">โลโก้ (ไม่บังคับ)</label>

            {logoFile ? (
              /* Preview state */
              <div className="flex justify-between items-center bg-[#0d0d1a] px-4 py-3 border border-white/10 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="logo preview"
                    className="rounded w-8 h-8 object-cover shrink-0"
                  />
                  <span className="text-gray-300 text-sm truncate">
                    {logoFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  className="hover:bg-white/10 ml-2 p-1 rounded text-gray-400 hover:text-red-400 transition-colors shrink-0"
                  aria-label="ลบไฟล์"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              /* Drop zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
                  isDragging
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-[#0d0d1a] hover:border-violet-500/50 hover:bg-violet-500/5"
                }`}
              >
                <ImageIcon size={32} className="text-gray-500" />
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

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-transparent hover:bg-white/5 disabled:opacity-50 px-4 py-3 border border-white/10 rounded-xl font-semibold text-white text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-3 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? "กำลังสร้าง..." : "สร้าง Organizer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
