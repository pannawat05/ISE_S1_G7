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
    <div className="z-10 relative py-20 text-center">
      <h1 className="mb-4 font-extrabold text-4xl sm:text-5xl">
        ค้นพบเวทมนตร์แห่ง<br />กิจกรรมและคอนเสิร์ต
      </h1>
      <p className="mb-8 text-gray-400 text-sm">
        จองตั๋วเข้าร่วมกิจกรรมและคอนเสิร์ตได้อย่างง่ายดาย
      </p>

      {/* ครอบ div เพิ่ม z-index และ pointer-events-auto ชัวร์ๆ */}
      <div className="z-20 relative pointer-events-auto">
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