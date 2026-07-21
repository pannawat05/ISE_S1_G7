import { useState, useRef, useCallback } from "react";
import { X, ImageIcon, Trash2 } from "lucide-react";
import Cookies from "js-cookie";
import { createOrganizer, type UserOrganizer } from "../../api/organizer";

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

      onCreated({
        id: result.organizerId,
        name: result.name,
        logo_url: result.logo_url,
        role: "owner",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal panel */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold text-white">
            สร้าง <span className="font-bold">Organizer</span> ใหม่
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-400 border border-red-500/30">
              {error}
            </p>
          )}

          {/* ชื่อ Organizer */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              ชื่อ Organizer <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Magic Ticket Events Co."
              className="w-full rounded-lg bg-[#0d0d1a] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
            />
          </div>

          {/* คำอธิบาย */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">คำอธิบาย</label>
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_DESC))
              }
              placeholder="อธิบายสั้นๆ ว่า organizer นี้จัดงานประเภทไหน"
              rows={4}
              className="w-full resize-y rounded-lg bg-[#0d0d1a] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
            />
            <p className="text-right text-xs text-gray-500">
              {description.length}/{MAX_DESC}
            </p>
          </div>

          {/* โลโก้ */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">โลโก้ (ไม่บังคับ)</label>

            {logoFile ? (
              /* Preview state */
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0d0d1a] px-4 py-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="logo preview"
                    className="h-8 w-8 rounded object-cover shrink-0"
                  />
                  <span className="truncate text-sm text-gray-300">
                    {logoFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  className="ml-2 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-red-400"
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
                <p className="text-center text-sm text-gray-400">
                  ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูป
                </p>
                <p className="text-xs text-gray-500">PNG/JPG ไม่เกิน 2MB</p>
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
              className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "กำลังสร้าง..." : "สร้าง Organizer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
