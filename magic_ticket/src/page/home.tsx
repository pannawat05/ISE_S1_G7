import { HeroSection, EventGrid } from "@/components/home";
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
