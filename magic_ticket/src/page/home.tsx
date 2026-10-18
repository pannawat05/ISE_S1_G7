import { useState } from "react";
import { HeroSection, EventGrid } from "@/components/home";
import { Footer } from "@/components/navigater";

export default function Home() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

  return (
    <div className="bg-slate-50 w-full h-full overflow-y-auto font-sans text-slate-900">
      <HeroSection
        search={search}
        location={location}
        type={type}
        onSearchChange={setSearch}
        onLocationChange={setLocation}
        onTypeChange={setType}
      />
      <EventGrid search={search} location={location} type={type} />
      <Footer />
    </div>
  );
}
