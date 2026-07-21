import { HeroSection } from "@/components/home";
import EventGrid from "@/components/home/EventGrid"; // 👈 Import ตรงจากไฟล์ EventGrid
import { Footer } from "@/components/navigater";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <HeroSection />
      <EventGrid />
      <Footer />
    </div>
  );
}