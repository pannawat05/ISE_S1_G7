/**
 * DocumentUploader — ใช้ใน create_event และ event_edit
 *
 * สองโหมด:
 * - create (eventId = null): เก็บ File[] ส่งกลับผ่าน onFilesChange — upload หลัง event ถูกสร้าง
 * - edit   (eventId = number): upload / delete ผ่าน API ทันที
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { FileText, Upload, X, Loader2, Download, Trash2, File } from "lucide-react";
import Cookies from "js-cookie";
import { API_BASE } from "@/api/client";
import {
  fetchEventDocuments, uploadEventDocuments, deleteEventDocument,
  type EventDocument,
} from "@/api/organizer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPT = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".png", ".jpg", ".jpeg",
].join(",");

const MIME_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "application/vnd.ms-powerpoint": "📋",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "📋",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/jpg": "🖼️",
};

function fileIcon(mimeOrName: string): string {
  return MIME_ICON[mimeOrName] ?? (mimeOrName.startsWith("image/") ? "🖼️" : "📎");
}

function fmtSize(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentUploaderProps {
  organizerId: number;
  eventId: number | null;              // null = create mode
  onFilesChange?: (files: File[]) => void; // create mode only
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocumentUploader({ organizerId, eventId, onFilesChange }: DocumentUploaderProps) {
  // CREATE MODE state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // EDIT MODE state
  const [docs, setDocs] = useState<EventDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const inputRef  = useRef<HTMLInputElement>(null);
  const dropRef   = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  // Load existing docs in edit mode
  const loadDocs = useCallback(async () => {
    if (!eventId) return;
    const token = Cookies.get("authToken");
    if (!token) return;
    setLoadingDocs(true);
    try { setDocs(await fetchEventDocuments(token, organizerId, eventId)); }
    catch { /* silent */ }
    finally { setLoadingDocs(false); }
  }, [organizerId, eventId]);

  useEffect(() => { if (eventId) loadDocs(); }, [loadDocs]);

  // ── Handle file selection ──
  function handleFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const valid = Array.from(newFiles).filter((f) => f.size <= 20 * 1024 * 1024);

    if (eventId === null) {
      // Create mode: accumulate
      const next = [...pendingFiles, ...valid];
      setPendingFiles(next);
      onFilesChange?.(next);
    } else {
      // Edit mode: upload immediately
      handleUpload(valid);
    }
  }

  async function handleUpload(files: File[]) {
    if (!eventId) return;
    const token = Cookies.get("authToken");
    if (!token) return;
    setUploading(true);
    try {
      const updated = await uploadEventDocuments(token, organizerId, eventId, files);
      setDocs(updated);
      flash("✅ อัปโหลดสำเร็จ");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
    finally { setUploading(false); }
  }

  async function handleDelete(docId: number, docName: string) {
    if (!eventId) return;
    if (!confirm(`ลบ "${docName}"?`)) return;
    const token = Cookies.get("authToken");
    if (!token) return;
    try {
      setDocs(await deleteEventDocument(token, organizerId, eventId, docId));
      flash("✅ ลบเอกสารแล้ว");
    } catch (e) { flash(`❌ ${e instanceof Error ? e.message : "Error"}`); }
  }

  function removePending(idx: number) {
    const next = pendingFiles.filter((_, i) => i !== idx);
    setPendingFiles(next);
    onFilesChange?.(next);
  }

  // ── Drag & drop handlers ──
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const isCreateMode = eventId === null;
  const existingDocs = isCreateMode ? [] : docs;
  const totalItems   = existingDocs.length + pendingFiles.length;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <FileText size={15} />
          เอกสารประกอบงาน
          {totalItems > 0 && (
            <span className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-2 py-0.5 rounded-full">
              {totalItems} ไฟล์
            </span>
          )}
        </h2>
        <p className="text-gray-600 text-xs">PDF, Word, Excel, PowerPoint, รูปภาพ · สูงสุด 20 MB/ไฟล์</p>
      </div>

      {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors ${
          dragging
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/10 bg-black/20 hover:border-violet-500/40 hover:bg-violet-500/5"
        }`}
      >
        {uploading ? (
          <Loader2 size={24} className="animate-spin text-violet-400" />
        ) : (
          <Upload size={24} className="text-gray-500" />
        )}
        <p className="text-gray-400 text-sm">
          {uploading ? "กำลังอัปโหลด..." : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Loading */}
      {loadingDocs && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
        </div>
      )}

      {/* Existing docs (edit mode) */}
      {existingDocs.length > 0 && (
        <div className="space-y-2">
          {existingDocs.map((doc) => {
            const fileUrl = doc.file_url.startsWith("http") ? doc.file_url : `${API_BASE}${doc.file_url}`;
            return (
              <div key={doc.id}
                className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <span className="text-2xl shrink-0">{fileIcon(doc.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-gray-500 text-xs">{fmtSize(doc.file_size)}</p>
                </div>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={doc.name}
                  className="p-1.5 text-gray-400 hover:text-violet-400 transition-colors shrink-0"
                  title="ดาวน์โหลด">
                  <Download size={15} />
                </a>
                <button type="button" onClick={() => handleDelete(doc.id, doc.name)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                  title="ลบ">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending files (create mode) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs">ไฟล์ที่รอ upload (จะถูก upload หลังสร้าง Event)</p>
          {pendingFiles.map((file, i) => (
            <div key={i}
              className="flex items-center gap-3 bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
              <span className="text-2xl shrink-0">{fileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <p className="text-gray-500 text-xs">{fmtSize(file.size)}</p>
              </div>
              <button type="button" onClick={() => removePending(i)}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors shrink-0">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalItems === 0 && !loadingDocs && (
        <p className="text-center text-gray-700 text-xs py-2">
          ยังไม่มีเอกสาร — ลากไฟล์หรือคลิกด้านบนเพื่ออัปโหลด
        </p>
      )}
    </section>
  );
}
