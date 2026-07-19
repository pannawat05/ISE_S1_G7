import SearchBar from "./SearchBar";

export default function HeroSection() {
  return (
    <section className="relative px-6 pt-16 pb-12 text-center">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
        ค้นพบเวทมนตร์แห่ง
        <br />
        <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          กิจกรรมและคอนเสิร์ต
        </span>
      </h1>

      <p className="mt-5 text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
        จองตั๋วเข้าร่วมกิจกรรมและคอนเสิร์ตได้อย่างง่ายดาย
        <br className="hidden sm:block" />
        พร้อมระบบ Whitelist และ QR Code ที่ทันสมัย
      </p>

      <div className="mt-10">
        <SearchBar />
      </div>
    </section>
  );
}
