import { useEffect, useState } from "react";
import { Check, ChevronDown, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { fetchEventTypes, type EventType } from "@/api/sysadmin";

interface SearchBarProps {
  search: string;
  location: string;
  type: string;
  onSearchChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onTypeChange: (v: string) => void;
}

export default function SearchBar({
  search, location, type, onSearchChange, onLocationChange, onTypeChange,
}: SearchBarProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchEventTypes().then(setEventTypes).catch(console.error);
  }, []);

  return (
    <div className="relative flex sm:flex-row flex-col items-stretch sm:items-center bg-white shadow-sm mx-auto border border-slate-200 rounded-xl md:rounded-full w-full max-w-3xl">
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5 border-slate-200 sm:border-r border-b sm:border-b-0">
        <Search size={18} className="text-gray-500 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาชื่อกิจกรรม หรือผู้จัดงาน..."
          className="bg-transparent outline-none w-full text-slate-900 placeholder:text-slate-400 text-sm"
        />
      </div>
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5 border-slate-200 border-b sm:border-b-0">
        <MapPin size={18} className="text-gray-500 shrink-0" />
        <input
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="ค้นหาสถานที่จัดงาน..."
          className="bg-transparent outline-none w-full text-slate-900 placeholder:text-slate-400 text-sm"
        />
      </div>
      <div className="relative flex justify-end px-3 py-2 sm:py-0 sm:border-slate-200 sm:border-l">
        <button
          type="button"
          aria-label="กรองตามประเภทกิจกรรม"
          aria-haspopup="menu"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen((open) => !open)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${type ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <SlidersHorizontal size={16} />
          <span className="max-w-32 truncate">{type || "ตัวกรอง"}</span>
          <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
        </button>
        {isFilterOpen && (
          <div role="menu" className="top-full right-2 z-20 absolute bg-white shadow-lg mt-2 p-1 border border-slate-200 rounded-xl w-56 max-h-64 overflow-y-auto">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!type}
              onClick={() => { onTypeChange(""); setIsFilterOpen(false); }}
              className="flex justify-between items-center hover:bg-slate-50 px-3 py-2 rounded-lg w-full text-slate-700 text-sm text-left"
            >
              ทุกประเภท
              {!type && <Check size={15} className="text-violet-600" />}
            </button>
            {eventTypes.map((eventType) => (
              <button
                key={eventType.id}
                type="button"
                role="menuitemradio"
                aria-checked={type === eventType.name}
                onClick={() => { onTypeChange(eventType.name); setIsFilterOpen(false); }}
                className="flex justify-between items-center hover:bg-slate-50 px-3 py-2 rounded-lg w-full text-slate-700 text-sm text-left"
              >
                <span className="truncate">{eventType.name}</span>
                {type === eventType.name && <Check size={15} className="text-violet-600 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
