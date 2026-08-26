import { Search, MapPin, SlidersHorizontal } from "lucide-react";

interface SearchBarProps {
  search: string;
  location: string;
  onSearchChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onOpenFilter?: () => void;
  activeFilterCount?: number;
}

export default function SearchBar({
  search,
  location,
  onSearchChange,
  onLocationChange,
  onOpenFilter,
  activeFilterCount = 0,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 mx-auto w-full max-w-3xl px-4 relative z-10">
      <div className="flex flex-1 sm:flex-row flex-col items-stretch sm:items-center bg-gray-900 border border-white/10 rounded-full overflow-hidden">
        <div className="flex flex-1 items-center gap-3 px-5 py-3.5 border-white/10 sm:border-r border-b sm:border-b-0">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อกิจกรรม หรือผู้จัดงาน..."
            className="bg-transparent outline-none w-full text-white placeholder:text-gray-500 text-sm"
          />
        </div>
        <div className="flex flex-1 items-center gap-3 px-5 py-3.5">
          <MapPin size={18} className="text-gray-500 shrink-0" />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="ค้นหาสถานที่จัดงาน..."
            className="bg-transparent outline-none w-full text-white placeholder:text-gray-500 text-sm"
          />
        </div>
      </div>

      {/* เพิ่ม relative z-20 และ pointer-events-auto เพื่อป้องกันโดนบัง */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          console.log("Filter button clicked directly!");
          onOpenFilter?.();
        }}
        className="relative z-20 pointer-events-auto flex items-center justify-center p-4 bg-gray-900 hover:bg-gray-800 border border-white/10 rounded-full text-white transition shrink-0 cursor-pointer"
      >
        <SlidersHorizontal size={18} />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}