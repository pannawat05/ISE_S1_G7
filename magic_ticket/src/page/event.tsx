import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Menu, Plus, Search, Calendar, MapPin, ChevronDown, Pencil } from "lucide-react";
import Cookies from "js-cookie";
import { fetchOrganizerEventsList, type OrganizerEvent } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { API_BASE } from "@/api/client";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "text-green-400 bg-green-400/10 border-green-400/20",
    pending:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  const labels: Record<string, string> = { approved: "Approved", pending: "Pending", rejected: "Rejected" };
  return (
    <span className={`mt-badge ${colors[status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event }: { event: OrganizerEvent }) {
  const start = new Date(event.start_date);
  const dateStr = start.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const lat = parseFloat(event.latitude);
  const lng = parseFloat(event.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
  const coverSrc = event.cover_image
    ? (event.cover_image.startsWith("http") ? event.cover_image : `${API_BASE}${event.cover_image}`)
    : null;

  return (
    <div className="flex flex-col mt-surface overflow-hidden">
      {coverSrc ? (
        <div className="w-full h-36 overflow-hidden">
          <img src={coverSrc} alt={event.name} className="w-full h-full object-cover" />
        </div>
      ) : hasCoords ? (
        <div className="w-full h-36 overflow-hidden">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.006},${lng + 0.008},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`}
            style={{ height: "100%", width: "100%", border: "none" }}
            title="map" loading="lazy" className="pointer-events-none" referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{event.name}</p>
            <span className="inline-flex bg-violet-600/20 mt-0.5 px-2 py-0.5 rounded text-violet-400 text-xs">
              {event.type_name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={event.status} />
            <Link
              to={`/profile/events/${event.organizer_id}/edit/${event.id}`}
              className="hover:bg-elevated p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="แก้ไข Event"
            >
              <Pencil size={14} />
            </Link>
          </div>
        </div>
        <div className="space-y-1.5 text-gray-400 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-violet-400 shrink-0" />
            <span>{dateStr} · {timeStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-violet-400 shrink-0" />
            <span className="truncate">{event.place_name}</span>
          </div>
          {hasCoords && (
            <a href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
              <MapPin size={12} /> เปิดใน Google Maps
            </a>
          )}
        </div>
        {event.description && (
          <p className="text-gray-500 text-xs line-clamp-2">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { setIsOpen } = useProfileSidebar();
  const navigate = useNavigate();
  const organizerId = Number(id);

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token || isNaN(organizerId)) { setIsLoading(false); return; }
    fetchOrganizerEventsList(token, organizerId)
      .then(setEvents)
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setIsLoading(false));
  }, [organizerId]);

  const filtered = events.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      || e.place_name.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === "all" || e.status === statusFilter);
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-2xl">Events</h1>
          {!isLoading && (
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-gray-400 text-xs">{events.length} งาน</span>
          )}
        </div>
        <button onClick={() => navigate(`/profile/events/${organizerId}/create`)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl font-semibold text-white text-sm cursor-pointer">
          <Plus size={18} /> สร้าง Event
        </button>
      </header>

      <main className="mt-dashboard-main">
        {/* Search + Filter */}
        <div className="flex sm:flex-row flex-col gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่องาน หรือสถานที่..." className="mt-input pl-9" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="mt-input pr-8 appearance-none cursor-pointer">
              <option value="all">สถานะทั้งหมด</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={16} className="top-1/2 right-3 absolute text-gray-400 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {isLoading && (
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse" />)}
          </div>
        )}
        {!isLoading && fetchError && (
          <div className="bg-red-500/10 mt-surface p-4 border border-red-500/30 text-red-400 text-sm">{fetchError}</div>
        )}
        {!isLoading && !fetchError && events.length === 0 && (
          <div className="flex flex-col items-center gap-4 mt-surface py-16 text-center">
            <div className="flex justify-center items-center bg-violet-600/10 rounded-2xl w-16 h-16">
              <Calendar size={32} className="text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">ยังไม่มี Event</p>
              <p className="mt-1 text-gray-500 text-sm">สร้าง event แรกของ organizer นี้เพื่อเริ่มต้น</p>
            </div>
            <button onClick={() => navigate(`/profile/events/${organizerId}/create`)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-5 py-2.5 rounded-xl font-semibold text-white text-sm">
              <Plus size={16} /> สร้าง Event แรก
            </button>
          </div>
        )}
        {!isLoading && !fetchError && events.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 mt-surface py-12 text-center">
            <Search size={28} className="text-gray-600" />
            <p className="text-gray-400 text-sm">ไม่พบ event ที่ตรงกับการค้นหา</p>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </main>


    </div>
  );
}
