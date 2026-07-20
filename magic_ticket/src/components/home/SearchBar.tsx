import { MapPin, Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full max-w-3xl mx-auto bg-elevated border border-white/10 rounded-full overflow-hidden">
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5 border-b sm:border-b-0 sm:border-r border-white/10">
        <Search size={18} className="text-gray-500 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาชื่อกิจกรรม หรือผู้จัดงาน..."
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5">
        <MapPin size={18} className="text-gray-500 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาสถานที่จัดงาน..."
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>
    </div>
  );
}
