import { useRef, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";

interface ImageUploadZoneProps {
  label: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}

export default function ImageUploadZone({
  label,
  multiple = false,
  files,
  onChange,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
    );
    onChange(multiple ? [...files, ...valid] : [valid[0]].filter(Boolean));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDraggingOver(false);
    if (dragIndexRef.current === null) addFiles(e.dataTransfer.files);
  }

  function onItemDragStart(i: number) { dragIndexRef.current = i; }
  function onItemDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === i) return;
    const next = [...files];
    const [moved] = next.splice(dragIndexRef.current, 1);
    next.splice(i, 0, moved);
    dragIndexRef.current = i;
    onChange(next);
  }
  function onItemDragEnd() { dragIndexRef.current = null; }

  // Single file with existing preview
  if (!multiple && files[0]) {
    return (
      <div className="space-y-2">
        <label className="mt-label">{label}</label>
        <div className="group relative border border-white/10 rounded-xl overflow-hidden">
          <img
            src={URL.createObjectURL(files[0])}
            alt="cover preview"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 flex justify-center items-center gap-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium text-white text-xs">
              เปลี่ยนรูป
            </button>
            <button type="button" onClick={() => onChange([])}
              className="bg-red-600/80 hover:bg-red-600 p-1.5 rounded-full text-white">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="mt-label">{label}</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (dragIndexRef.current === null) setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors ${
          draggingOver
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/10 bg-black/20 hover:border-violet-500/50 hover:bg-violet-500/5"
        }`}
      >
        <ImageIcon size={26} className="text-gray-500" />
        <p className="text-gray-400 text-sm">
          {multiple
            ? "อัปโหลดได้หลายรูป — ลากรูปเพื่อเรียงลำดับ"
            : "อัปโหลด 1 รูป ใช้เป็นภาพหลักของ Event"}
        </p>
        <p className="text-gray-600 text-xs">PNG / JPG ไม่เกิน 10 MB ต่อรูป</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <div className={multiple ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "flex"}>
          {files.map((file, i) => (
            <div
              key={i}
              draggable={multiple}
              onDragStart={() => onItemDragStart(i)}
              onDragOver={(e) => onItemDragOver(e, i)}
              onDragEnd={onItemDragEnd}
              className="group relative border border-white/10 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className={multiple ? "h-20 w-full object-cover select-none" : "h-32 w-full object-cover"}
              />
              <div className="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                  className="bg-red-600/80 hover:bg-red-600 p-1 rounded-full text-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {multiple && (
                <span className="right-0 bottom-0 left-0 absolute bg-black/60 px-1 py-0.5 text-gray-300 text-xs text-center pointer-events-none">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
