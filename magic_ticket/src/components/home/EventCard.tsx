import { Calendar, MapPin, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicEvent } from "@/api/events";
import { getCoverUrl } from "@/api/events";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80";

const TYPE_COLORS: Record<string, string> = {
  Concert: "bg-violet-50 text-violet-700 border border-violet-200",
  Conference: "bg-blue-50 text-blue-700 border border-blue-200",
  Exhibition: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  Party: "bg-pink-50 text-pink-700 border border-pink-200",
  Festival: "bg-orange-50 text-orange-700 border border-orange-200",
  Sport: "bg-green-50 text-green-700 border border-green-200",
  Other: "bg-gray-50 text-gray-600 border border-gray-200",
};

interface EventCardProps {
  event: PublicEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const coverSrc = getCoverUrl(event.cover_image) ?? PLACEHOLDER;

  const start = new Date(event.start_date);

  const dateStr = start.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeStr = start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const typeColor =
    TYPE_COLORS[event.type_name] ?? TYPE_COLORS.Other;

  return (
    <Link to={`/events/${event.id}`} className="group block">
      <article
        className="
          flex flex-col
          bg-white
          hover:bg-white
          border border-purple-100
          hover:border-purple-300
          rounded-2xl
          h-full
          overflow-hidden
          shadow-sm
          hover:shadow-lg
          hover:shadow-purple-200/50
          transition-all
          hover:-translate-y-1
          duration-300
        "
      >
        {/* Cover */}
        <div className="relative aspect-16/10 overflow-hidden">
          <img
            src={coverSrc}
            alt={event.name}
            className="
              w-full
              h-full
              object-cover
              group-hover:scale-105
              transition-transform
              duration-500
            "
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
            }}
          />

          {/* Event Type */}
          <span
            className={`
              absolute
              left-3
              top-3
              rounded-full
              px-2.5
              py-1
              text-xs
              font-medium
              backdrop-blur-sm
              ${typeColor}
            `}
          >
            {event.type_name}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5">

          {/* Title */}
          <h3
            className="
              mb-1.5
              font-bold
              text-gray-900
              group-hover:text-violet-600
              text-base
              line-clamp-2
              leading-snug
              transition-colors
            "
          >
            {event.name}
          </h3>

          {/* Description */}
          {event.description && (
            <p
              className="
                mb-4
                text-gray-500
                text-sm
                line-clamp-2
                leading-relaxed
              "
            >
              {event.description}
            </p>
          )}

          {/* Event Information */}
          <div className="space-y-2 mt-auto text-gray-500 text-xs">

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar
                size={13}
                className="text-violet-600 shrink-0"
              />

              <span>
                {dateStr} · {timeStr}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin
                size={13}
                className="text-violet-600 shrink-0"
              />

              <span className="truncate">
                {event.place_name}
              </span>
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-2">
              <Building2
                size={13}
                className="text-violet-600 shrink-0"
              />

              <span className="truncate">
                {event.organizer_name}
              </span>
            </div>

          </div>
        </div>
      </article>
    </Link>
  );
}