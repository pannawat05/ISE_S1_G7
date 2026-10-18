import { useState } from "react";
import { createPortal } from "react-dom";
import { Filter, X } from "lucide-react";
import type { EventType } from "@/api/sysadmin";

export interface FilterState {
  types: string[];
  sortBy: string;
  order: "ASC" | "DESC";
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: FilterState;
  eventTypes: EventType[];
  onApply: (filters: FilterState) => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  initialFilters,
  eventTypes,
  onApply,
}: FilterModalProps) {
  const [draft, setDraft] = useState<FilterState>(initialFilters);

  if (!isOpen) return null;

  const toggleType = (typeName: string) => {
    setDraft((prev) => ({
      ...prev,
      types: prev.types.includes(typeName)
        ? prev.types.filter((item) => item !== typeName)
        : [...prev.types, typeName],
    }));
  };

  return createPortal(
    <div
      className="z-[9999] fixed inset-0 flex justify-center items-center backdrop-blur-sm p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="z-[10000] relative shadow-2xl p-6 border rounded-2xl w-full max-w-md"
        style={{
          backgroundColor: "var(--mt-surface)",
          borderColor: "var(--mt-border)",
          color: "var(--mt-text)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center pb-4 border-b"
          style={{ borderColor: "var(--mt-border)" }}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="font-semibold text-base">ตัวกรองกิจกรรม</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 p-1 transition cursor-pointer"
            style={{ color: "var(--mt-text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 py-4">
          {/* ประเภทกิจกรรม */}
          <div>
            <label
              className="block mb-2 font-medium text-xs"
              style={{ color: "var(--mt-text-secondary)" }}
            >
              ประเภทกิจกรรม
            </label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((t) => {
                const selected = draft.types.includes(t.name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.name)}
                    className="flex items-center gap-1 px-3 py-1.5 border rounded-full text-xs transition cursor-pointer"
                    style={
                      selected
                        ? {
                            backgroundColor: "var(--mt-accent-strong)",
                            color: "#ffffff",
                            borderColor: "var(--mt-accent-strong)",
                          }
                        : {
                            backgroundColor: "var(--mt-elevated)",
                            color: "var(--mt-text-secondary)",
                            borderColor: "var(--mt-border)",
                          }
                    }
                  >
                    {t.name}
                    {selected && <X size={12} />}
                  </button>
                );
              })}
              {eventTypes.length === 0 && (
                <p className="text-xs" style={{ color: "var(--mt-text-muted)" }}>
                  ไม่มีประเภทกิจกรรม
                </p>
              )}
            </div>
          </div>

          {/* เรียงลำดับ */}
          <div>
            <label
              className="block mb-2 font-medium text-xs"
              style={{ color: "var(--mt-text-secondary)" }}
            >
              เรียงลำดับตาม
            </label>
            <select
              value={draft.sortBy}
              onChange={(e) => setDraft({ ...draft, sortBy: e.target.value })}
              className="mb-3 px-3 py-2 border rounded-xl outline-none w-full text-sm cursor-pointer"
              style={{
                backgroundColor: "var(--mt-elevated)",
                borderColor: "var(--mt-border)",
                color: "var(--mt-text)",
              }}
            >
              <option value="start_date">วันที่เริ่มจัดงาน</option>
              <option value="name">ชื่อกิจกรรม</option>
            </select>

            <select
              value={draft.order}
              onChange={(e) =>
                setDraft({ ...draft, order: e.target.value as "ASC" | "DESC" })
              }
              className="px-3 py-2 border rounded-xl outline-none w-full text-sm cursor-pointer"
              style={{
                backgroundColor: "var(--mt-elevated)",
                borderColor: "var(--mt-border)",
                color: "var(--mt-text)",
              }}
            >
              <option value="ASC">เก่าไปใหม่</option>
              <option value="DESC">ใหม่ไปเก่า</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 pt-4 border-t"
          style={{ borderColor: "var(--mt-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 px-4 py-2 text-sm transition cursor-pointer"
            style={{ color: "var(--mt-text-secondary)" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => { onApply(draft); onClose(); }}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-medium text-white text-sm transition cursor-pointer"
          >
            ใช้ตัวกรอง
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
