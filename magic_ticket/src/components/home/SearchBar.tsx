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
      {/* Search input wrapper */}
      <div
        className="flex sm:flex-row flex-col flex-1 items-stretch sm:items-center border rounded-full overflow-hidden"
        style={{
          backgroundColor: "var(--mt-surface)",
          borderColor: "var(--mt-border)",
        }}
      >
        {/* ค้นหาชื่อ */}
        <div
          className="flex flex-1 items-center gap-3 px-5 py-3.5 sm:border-r border-b sm:border-b-0"
          style={{ borderColor: "var(--mt-border)" }}
        >
          <Search size={18} style={{ color: "var(--mt-text-muted)" }} className="shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อกิจกรรม หรือผู้จัดงาน..."
            className="bg-transparent outline-none w-full text-sm"
            style={{ color: "var(--mt-text)", caretColor: "var(--mt-accent)" }}
          />
        </div>
        {/* ค้นหาสถานที่ */}
        <div className="flex flex-1 items-center gap-3 px-5 py-3.5">
          <MapPin size={18} style={{ color: "var(--mt-text-muted)" }} className="shrink-0" />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="ค้นหาสถานที่จัดงาน..."
            className="bg-transparent outline-none w-full text-sm"
            style={{ color: "var(--mt-text)", caretColor: "var(--mt-accent)" }}
          />
        </div>
      </div>

      {/* Filter button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenFilter?.(); }}
        className="z-20 relative flex justify-center items-center hover:opacity-80 p-4 border rounded-full transition cursor-pointer pointer-events-auto shrink-0"
        style={{
          backgroundColor: "var(--mt-surface)",
          borderColor: "var(--mt-border)",
          color: "var(--mt-text)",
        }}
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
