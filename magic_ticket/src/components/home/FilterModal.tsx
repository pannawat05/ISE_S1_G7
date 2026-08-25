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
  // กำหนด initial state จาก initialFilters ตรงๆ (ไม่ใช้ useEffect เพื่อเลี่ยง ESLint error)
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6 shadow-2xl text-white relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-400" />
            <span className="font-semibold text-base">ตัวกรองกิจกรรม</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 py-4">
          {/* หมวดหมู่กิจกรรม */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              ประเภทกิจกรรม
            </label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((t) => {
                // 📌 ใช้ t.name เพราะ t เป็น Object { id, name }
                const selected = draft.types.includes(t.name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.name)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      selected
                        ? "bg-blue-600 text-white font-medium"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {t.name}
                    {selected && <X size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* การเรียงลำดับ */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              เรียงลำดับตาม
            </label>
            <select
              value={draft.sortBy}
              onChange={(e) => setDraft({ ...draft, sortBy: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-sm text-white outline-none mb-3 cursor-pointer"
            >
              <option value="start_date">วันที่เริ่มจัดงาน</option>
              <option value="name">ชื่อกิจกรรม</option>
            </select>

            <select
              value={draft.order}
              onChange={(e) =>
                setDraft({ ...draft, order: e.target.value as "ASC" | "DESC" })
              }
              className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-white/10 text-sm text-white outline-none cursor-pointer"
            >
              <option value="ASC">เก่าไปใหม่</option>
              <option value="DESC">ใหม่ไปเก่า</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 font-medium rounded-xl transition cursor-pointer"
          >
            ใช้ตัวกรอง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}