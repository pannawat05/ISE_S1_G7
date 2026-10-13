import { useState } from "react";
import { HeroSection, EventGrid } from "@/components/home";
import { Footer } from "@/components/navigater";

export default function Home() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div className="bg-slate-50 w-full h-full overflow-y-auto font-sans text-slate-900">
      <HeroSection
        search={search}
        location={location}
        onSearchChange={setSearch}
        onLocationChange={setLocation}
      />
      <EventGrid search={search} location={location} />
      <Footer />
    </div>
  );
}
