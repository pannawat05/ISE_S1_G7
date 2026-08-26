import SearchBar from "./SearchBar";

interface HeroSectionProps {
  search: string;
  location: string;
  onSearchChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onOpenFilter?: () => void;
  activeFilterCount?: number;
}

export default function HeroSection({
  search,
  location,
  onSearchChange,
  onLocationChange,
  onOpenFilter,
  activeFilterCount,
}: HeroSectionProps) {
  return (
    /* เพิ่ม relative z-10 เพื่อยกระดับชั้นของ Hero Section */
    <div className="relative z-10 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
        ค้นพบเวทมนตร์แห่ง<br />กิจกรรมและคอนเสิร์ต
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        จองตั๋วเข้าร่วมกิจกรรมและคอนเสิร์ตได้อย่างง่ายดาย
      </p>

      {/* ครอบ div เพิ่ม z-index และ pointer-events-auto ชัวร์ๆ */}
      <div className="relative z-20 pointer-events-auto">
        <SearchBar
          search={search}
          location={location}
          onSearchChange={onSearchChange}
          onLocationChange={onLocationChange}
          onOpenFilter={onOpenFilter}
          activeFilterCount={activeFilterCount}
        />
      </div>
    </div>
  );
}