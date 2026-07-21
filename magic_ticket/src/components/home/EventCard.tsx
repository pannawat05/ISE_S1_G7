import { Calendar, MapPin, Building2 } from "lucide-react";
import type { PublicEvent } from "@/api/events";
import { getCoverUrl } from "@/api/events";

const PLACEHOLDER = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80";

const TYPE_COLORS: Record<string, string> = {
  Concert:     "bg-violet-500/20 text-violet-300",
  Conference:  "bg-blue-500/20 text-blue-300",
  Exhibition:  "bg-cyan-500/20 text-cyan-300",
  Party:       "bg-pink-500/20 text-pink-300",
  Festival:    "bg-orange-500/20 text-orange-300",
  Sport:       "bg-green-500/20 text-green-300",
  Other:       "bg-gray-500/20 text-gray-300",
};

interface EventCardProps {
  event: PublicEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const coverSrc = getCoverUrl(event.cover_image) ?? PLACEHOLDER;

  const start = new Date(event.start_date);
  const dateStr = start.toLocaleDateString("th-TH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const timeStr = start.toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit",
  });

  const typeColor = TYPE_COLORS[event.type_name] ?? TYPE_COLORS.Other;

  return (
    <article className="group flex flex-col bg-surface hover:shadow-lg hover:shadow-purple-900/20 border border-white/5 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 duration-300">
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={coverSrc}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
        />
        {/* Type badge */}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${typeColor}`}>
          {event.type_name}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="mb-1.5 font-bold text-white text-base line-clamp-2 leading-snug">
          {event.name}
        </h3>

        {event.description && (
          <p className="mb-4 text-gray-400 text-sm line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        <div className="space-y-2 mt-auto text-gray-500 text-xs">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-violet-400 shrink-0" />
            <span>{dateStr} · {timeStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-violet-400 shrink-0" />
            <span className="truncate">{event.place_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-violet-400 shrink-0" />
            <span className="truncate">{event.organizer_name}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
