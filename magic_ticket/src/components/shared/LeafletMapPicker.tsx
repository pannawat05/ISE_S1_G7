import { useState, useEffect, useRef } from "react";
import { Crosshair } from "lucide-react";
import { useLeaflet } from "@/hooks/useLeaflet";

declare global {
  interface Window { L: typeof import("leaflet"); }
}

interface LeafletMapPickerProps {
  lat: number;
  lng: number;
  height?: number;
  onChange: (lat: number, lng: number) => void;
  onPlaceName?: (name: string) => void;
}

async function reverseGeocode(
  lat: number,
  lng: number,
  onPlaceName: (name: string) => void,
) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "th,en" } },
    );
    const data = await res.json();
    if (data?.display_name) onPlaceName(data.display_name.split(",")[0].trim());
  } catch { /* silent */ }
}

export default function LeafletMapPicker({
  lat,
  lng,
  height = 260,
  onChange,
  onPlaceName,
}: LeafletMapPickerProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const { ready } = useLeaflet();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Init map once Leaflet CDN is ready
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = window.L;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    const map = L.map(mapDivRef.current).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    marker.on("dragend", () => {
      const { lat: mLat, lng: mLng } = marker.getLatLng();
      const rLat = Math.round(mLat * 1e6) / 1e6;
      const rLng = Math.round(mLng * 1e6) / 1e6;
      onChange(rLat, rLng);
      if (onPlaceName) reverseGeocode(rLat, rLng, onPlaceName);
    });

    map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
      const rLat = Math.round(e.latlng.lat * 1e6) / 1e6;
      const rLng = Math.round(e.latlng.lng * 1e6) / 1e6;
      marker.setLatLng([rLat, rLng]);
      onChange(rLat, rLng);
      if (onPlaceName) reverseGeocode(rLat, rLng, onPlaceName);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [ready]);

  // Sync marker when lat/lng changes from outside
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  async function doSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "th,en" } },
      );
      const data = await res.json();
      if (!data.length) { setSearchError("ไม่พบสถานที่นี้"); return; }
      const rLat = parseFloat(data[0].lat);
      const rLng = parseFloat(data[0].lon);
      onChange(rLat, rLng);
      mapRef.current?.setView([rLat, rLng], 15);
      if (onPlaceName && data[0].display_name) {
        onPlaceName(data[0].display_name.split(",")[0].trim());
      }
    } catch { setSearchError("ค้นหาไม่สำเร็จ"); }
    finally { setSearching(false); }
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const rLat = Math.round(coords.latitude * 1e6) / 1e6;
      const rLng = Math.round(coords.longitude * 1e6) / 1e6;
      onChange(rLat, rLng);
      mapRef.current?.setView([rLat, rLng], 15);
      if (onPlaceName) reverseGeocode(rLat, rLng, onPlaceName);
    });
  }

  return (
    <div className="space-y-2">
      {/* Search row */}
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
          placeholder="ค้นหาสถานที่ เช่น Impact Arena..."
          className="flex-1 mt-input text-sm"
        />
        <button type="button" onClick={doSearch} disabled={searching}
          className="bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium text-violet-300 text-xs shrink-0">
          {searching ? "..." : "ค้นหา"}
        </button>
        <button type="button" onClick={locateMe} title="ตำแหน่งของฉัน"
          className="hover:bg-white/5 p-2 border border-white/10 rounded-lg text-gray-400 hover:text-white shrink-0">
          <Crosshair size={15} />
        </button>
      </div>

      {searchError && <p className="text-red-400 text-xs">{searchError}</p>}

      {!ready && (
        <div className="flex justify-center items-center border border-white/10 rounded-xl h-60 text-gray-500 text-sm">
          กำลังโหลดแผนที่...
        </div>
      )}

      <div
        ref={mapDivRef}
        className={`overflow-hidden rounded-xl border border-white/10 transition-opacity ${ready ? "opacity-100" : "opacity-0 h-0"}`}
        style={{ height }}
      />

      {/* Coordinate inputs */}
      <div className="gap-2 grid grid-cols-2">
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Latitude</label>
          <input type="number" step="any" value={lat}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v, lng); }}
            className="mt-input font-mono text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-gray-500 text-xs">Longitude</label>
          <input type="number" step="any" value={lng}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(lat, v); }}
            className="mt-input font-mono text-sm" />
        </div>
      </div>
      <p className="text-gray-600 text-xs">คลิก/ลากหมุด หรือค้นหาสถานที่ — ชื่อจะถูกเติมอัตโนมัติ</p>
    </div>
  );
}
