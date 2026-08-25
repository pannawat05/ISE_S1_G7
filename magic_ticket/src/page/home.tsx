import { useState, useEffect } from "react";
import HeroSection from "@/components/home/HeroSection";
import EventGrid from "@/components/home/EventGrid";
import FilterModal from "@/components/home/FilterModal";
import type { FilterState } from "@/components/home/FilterModal";
import { fetchEventTypes, type EventType } from "@/api/sysadmin";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State เก็บรายการประเภทกิจกรรมที่ดึงมาจาก DB
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  // ค่า Filter เริ่มต้น
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    sortBy: "start_date",
    order: "ASC",
  });

  // Fetch ดึงประเภทกิจกรรมจาก Database เมื่อ Component โหลด
  useEffect(() => {
    fetchEventTypes()
      .then((types) => {
        setEventTypes(types);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section + SearchBar */}
      <HeroSection
        search={search}
        location={location}
        onSearchChange={setSearch}
        onLocationChange={setLocation}
        onOpenFilter={() => setIsFilterOpen(true)}
        activeFilterCount={filters.types.length}
      />

      {/* Grid แสดงกิจกรรม */}
      <EventGrid search={search} location={location} filters={filters} />

      {/* Pop-up Modal ตัวกรอง */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialFilters={filters}
        eventTypes={eventTypes}
        onApply={(newFilters) => {
          // 📌 ใช้ Spread operator เพื่อสร้าง Object reference ใหม่เสมอ
          setFilters({ ...newFilters });
        }}
      />
    </div>
  );
}