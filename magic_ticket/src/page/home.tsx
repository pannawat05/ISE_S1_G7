import { HeroSection, EventGrid } from "@/components/home";
import { Footer } from "@/components/navigater";

export default function Home() {
  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white font-sans">
      <HeroSection />
      <EventGrid />
      <Footer />
    </div>
  );
}
