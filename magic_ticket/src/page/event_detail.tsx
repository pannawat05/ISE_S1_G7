import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, MapPin, Building2, Tag,
  Ticket, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import { fetchPublicEventById, getCoverUrl, type PublicEvent } from "@/api/events";
import { API_BASE } from "@/api/client";
import BookingDrawer from "@/components/booking";

const PLACEHOLDER = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80";

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ cover, images, name }: {
  cover: string;
  images: { id: number; url: string }[];
  name: string;
}) {
  const allImages = [
    { id: 0, url: cover },
    ...images.map((img) => ({
      id: img.id,
      url: img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`,
    })),
  ].filter((img) => img.url);

  const [current, setCurrent] = useState(0);

  function prev() { setCurrent((c) => (c - 1 + allImages.length) % allImages.length); }
  function next() { setCurrent((c) => (c + 1) % allImages.length); }

  if (!allImages.length) return null;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative bg-white/5 rounded-2xl w-full aspect-[16/9] overflow-hidden">
        <img
          src={allImages[current].url}
          alt={`${name} - รูปที่ ${current + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
        />
        {allImages.length > 1 && (
          <>
            <button onClick={prev}
              className="top-1/2 left-3 absolute bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors -translate-y-1/2">
              <ChevronLeft size={20} />
            </button>
            <button onClick={next}
              className="top-1/2 right-3 absolute bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors -translate-y-1/2">
              <ChevronRight size={20} />
            </button>
            <div className="bottom-3 left-1/2 absolute flex gap-1.5 -translate-x-1/2">
              {allImages.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 pb-1 overflow-x-auto">
          {allImages.map((img, i) => (
            <button key={img.id} onClick={() => setCurrent(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? "border-violet-500" : "border-white/10 hover:border-white/30"
              }`}>
              <img src={img.url} alt="" className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map embed ────────────────────────────────────────────────────────────────
function MapEmbed({ lat, lng, placeName }: { lat: number; lng: number; placeName: string }) {
  const delta = 0.012;
  return (
    <div className="space-y-2">
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta * 0.8},${lng + delta},${lat + delta * 0.8}&layer=mapnik&marker=${lat},${lng}`}
          style={{ height: 220, width: "100%", border: "none" }}
          title={placeName}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <a href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs transition-colors">
        <ExternalLink size={13} />
        เปิดใน Google Maps
      </a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const eventId = Number(id);
    if (isNaN(eventId)) { setError("Invalid event ID"); setLoading(false); return; }
    fetchPublicEventById(eventId)
      .then(setEvent)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-black w-full h-full overflow-y-auto text-white">
        <div className="space-y-6 mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white/5 rounded-lg w-32 h-8 animate-pulse" />
          <div className="bg-white/5 rounded-2xl aspect-[16/9] animate-pulse" />
          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg w-3/4 h-8 animate-pulse" />
            <div className="bg-white/5 rounded w-1/2 h-4 animate-pulse" />
            <div className="bg-white/5 rounded-xl h-24 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (error || !event) {
    return (
      <div className="bg-black w-full h-full overflow-y-auto text-white">
        <div className="mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-4 mt-surface p-12 rounded-2xl text-center">
            <p className="text-gray-400">{error ?? "ไม่พบกิจกรรมนี้"}</p>
            <button onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm">
              <ArrowLeft size={16} /> กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coverSrc = getCoverUrl(event.cover_image) ?? PLACEHOLDER;
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const lat = parseFloat(event.latitude);
  const lng = parseFloat(event.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

  const dateStr = start.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const startTime = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const endDateStr = end.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const sameDay = start.toDateString() === end.toDateString();

  const orgLogoSrc = event.organizer_logo
    ? (event.organizer_logo.startsWith("http") ? event.organizer_logo : `${API_BASE}${event.organizer_logo}`)
    : null;

  return (
    <div className="bg-black w-full h-full overflow-y-auto text-white">
      <div className="space-y-8 mx-auto px-4 py-8 max-w-4xl">

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={18} />
          กลับ
        </button>

        <div className="gap-8 grid grid-cols-1 lg:grid-cols-3">
          {/* ── Left: Images + Description ── */}
          <div className="space-y-6 lg:col-span-2">
            <ImageGallery
              cover={coverSrc}
              images={event.images ?? []}
              name={event.name}
            />

            {/* Title + type + theme */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border `}>
                  <Tag size={11} />
                  {event.type_name}
                </span>
                {event.theme && (
                  <span className="px-2.5 py-1 border border-white/10 rounded-full text-gray-400 text-xs">
                    ธีม: {event.theme}
                  </span>
                )}
              </div>
              <h1 className="font-bold text-white text-2xl md:text-3xl leading-tight">
                {event.name}
              </h1>
            </div>

            {/* Description */}
            {event.description && (
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">เกี่ยวกับงาน</h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* Map */}
            {hasCoords && (
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">สถานที่จัดงาน</h2>
                <MapEmbed lat={lat} lng={lng} placeName={event.place_name} />
              </div>
            )}
          </div>

          {/* ── Right: Info card ── */}
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="space-y-4 mt-surface p-5 rounded-2xl">
              <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">วันเวลา</h2>
              <div className="space-y-2.5">
                <div className="flex gap-3">
                  <Calendar size={16} className="mt-0.5 text-violet-400 shrink-0" />
                  <div>
                    <p className="font-medium text-white text-sm">{dateStr}</p>
                    <p className="mt-0.5 text-gray-400 text-xs">
                      {startTime} – {sameDay ? endTime : `${endTime} (${endDateStr})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3 mt-surface p-5 rounded-2xl">
              <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">สถานที่</h2>
              <div className="flex gap-3">
                <MapPin size={16} className="mt-0.5 text-violet-400 shrink-0" />
                <div>
                  <p className="font-medium text-white text-sm">{event.place_name}</p>
                  {event.address && (
                    <p className="mt-0.5 text-gray-400 text-xs leading-relaxed">{event.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Organizer */}
            <div className="space-y-3 mt-surface p-5 rounded-2xl">
              <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">จัดโดย</h2>
              <div className="flex items-center gap-3">
                {orgLogoSrc ? (
                  <img src={orgLogoSrc} alt={event.organizer_name}
                    className="border border-white/10 rounded-lg w-10 h-10 object-cover" />
                ) : (
                  <div className="flex justify-center items-center bg-white/10 rounded-lg w-10 h-10 shrink-0">
                    <Building2 size={16} className="text-gray-500" />
                  </div>
                )}
                <p className="font-medium text-white text-sm">{event.organizer_name}</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setBookingOpen(true)}
              className="flex justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 py-3 rounded-xl w-full font-semibold text-white text-sm transition-colors"
            >
              <Ticket size={18} />
              ซื้อบัตร
            </button>
            <p className="text-gray-600 text-xs text-center">เลือกโซนและที่นั่งที่ต้องการ</p>
          </div>
        </div>

      </div>

      {/* Booking Drawer */}
      {event && (
        <BookingDrawer
          eventId={event.id}
          eventName={event.name}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
}
