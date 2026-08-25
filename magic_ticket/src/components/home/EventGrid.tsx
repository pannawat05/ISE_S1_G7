import { useState, useEffect } from "react";
import { Calendar, Search } from "lucide-react";
import EventCard from "./EventCard";
import { fetchPublicEvents, type PublicEvent } from "@/api/events";
import type { FilterState } from "./FilterModal";

interface EventGridProps {
  search: string;
  location: string;
  filters?: FilterState;
}

export default function EventGrid({ search, location, filters }: EventGridProps) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Debounce search 300ms
    const timer = setTimeout(() => {
      fetchPublicEvents({
        search,
        location,
        limit: 20,
        type: filters?.types?.join(","), // แปลง array ['Concert', 'Sport'] เป็น string เช่น "Concert,Sport"
        sortBy: filters?.sortBy,
        order: filters?.order,
      })
        .then((data) => {
          setEvents(data.events);
          setTotal(data.total);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, location, filters]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="mx-auto px-6 pb-16 max-w-6xl">
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="mx-auto px-6 pb-16 max-w-6xl">
        <div className="bg-red-500/5 p-8 border border-red-500/20 rounded-2xl text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </section>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <section className="mx-auto px-6 pb-16 max-w-6xl">
        <div className="flex flex-col items-center gap-4 bg-surface py-16 border border-white/5 rounded-2xl text-center">
          {search || location || (filters?.types && filters.types.length > 0) ? (
            <>
              <Search size={36} className="text-gray-600" />
              <div>
                <p className="font-semibold text-white">ไม่พบกิจกรรมที่ค้นหา</p>
                <p className="mt-1 text-gray-500 text-sm">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง</p>
              </div>
            </>
          ) : (
            <>
              <Calendar size={36} className="text-gray-600" />
              <div>
                <p className="font-semibold text-white">ยังไม่มีกิจกรรมในขณะนี้</p>
                <p className="mt-1 text-gray-500 text-sm">กลับมาดูใหม่เร็วๆ นี้</p>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  return (
    <section className="mx-auto px-6 pb-16 max-w-6xl">
      {/* Result count */}
      {(search || location || (filters?.types && filters.types.length > 0)) && (
        <p className="mb-4 text-gray-400 text-sm">
          พบ <span className="font-semibold text-white">{total}</span> กิจกรรม
        </p>
      )}

      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}