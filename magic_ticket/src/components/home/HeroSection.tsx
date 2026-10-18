import SearchBar from "./SearchBar";

interface HeroSectionProps {
  search: string;
  location: string;
  onSearchChange: (v: string) => void;
  onLocationChange: (v: string) => void;
}

export default function HeroSection({
  search, location, onSearchChange, onLocationChange,
}: HeroSectionProps) {
  return (
    <section className="relative px-6 pt-16 pb-12 text-center">
      <h1 className="font-bold text-slate-900 text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
        ค้นพบเวทมนตร์แห่ง
        <br />
          <span className="bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 text-transparent">
          กิจกรรมและคอนเสิร์ต
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-slate-600 text-sm md:text-base leading-relaxed">
        จองตั๋วเข้าร่วมกิจกรรมและคอนเสิร์ตได้อย่างง่ายดาย
      </p>

      <div className="mt-10">
        <SearchBar
          search={search}
          location={location}
          onSearchChange={onSearchChange}
          onLocationChange={onLocationChange}
        />
      </div>
    </section>
  );
}
