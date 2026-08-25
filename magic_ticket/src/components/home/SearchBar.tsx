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
    <div className="z-10 relative flex items-center gap-2 mx-auto px-4 w-full max-w-3xl">
      <div className="flex sm:flex-row flex-col flex-1 items-stretch sm:items-center bg-gray-900 border border-white/10 rounded-full overflow-hidden">
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
        className="z-20 relative flex justify-center items-center bg-gray-900 hover:bg-gray-800 p-4 border border-white/10 rounded-full text-white transition cursor-pointer pointer-events-auto shrink-0"
      >
        <SlidersHorizontal size={18} />
        {activeFilterCount > 0 && (
          <span className="-top-1 -right-1 absolute flex justify-center items-center bg-blue-600 rounded-full w-5 h-5 font-bold text-[10px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}