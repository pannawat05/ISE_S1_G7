import { Search, MapPin } from "lucide-react";

interface SearchBarProps {
  search: string;
  location: string;
  onSearchChange: (v: string) => void;
  onLocationChange: (v: string) => void;
}

export default function SearchBar({
  search, location, onSearchChange, onLocationChange,
}: SearchBarProps) {
  return (
    <div className="flex sm:flex-row flex-col items-stretch sm:items-center bg-elevated mx-auto border border-white/10 rounded-full w-full max-w-3xl overflow-hidden">
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
  );
}
