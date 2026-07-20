import { featuredEvents } from "@/data/events";
import EventCard from "./EventCard";

export default function EventGrid() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
