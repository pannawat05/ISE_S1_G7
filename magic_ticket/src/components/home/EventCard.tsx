import { Calendar, MapPin } from "lucide-react";
import type { Event } from "@/data/events";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <article className="group bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 right-3 px-3 py-1 text-xs font-medium text-white bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          เริ่มต้น ฿{event.price.toLocaleString()}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
          {event.description}
        </p>

        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="mt-icon-accent" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="mt-icon-accent" />
            <span>{event.location}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
