import { Calendar, MapPin } from "lucide-react";

interface EventCardProps {
  event: {
    id?: string | number;
    name?: string;
    title?: string;
    description?: string;
    price?: number | string;
    start_date?: string;
    date?: string;
    place?: string;
    location?: string;
    thumbnail?: string;
    image?: string;
  };
}

export default function EventCard({ event }: EventCardProps) {
  if (!event) return null;

  // รองรับทั้งชื่อฟิลด์แบบใหม่และแบบเก่า
  const titleText = event.name || event.title || "ไม่มีชื่อกิจกรรม";
  const placeText = event.place || event.location || "ไม่ระบุสถานที่";
  const dateText = event.start_date || event.date || "ไม่ระบุวัน";
  
  const imageUrl = event.thumbnail
    ? `http://localhost:5001/organizer/image/${event.thumbnail}`
    : event.image || "https://via.placeholder.com/600x400?text=No+Image";

  // แปลงราคาอย่างปลอดภัย ไม่พังแม้อยู่ในรูป undefined/null
  const priceVal = event.price !== undefined && event.price !== null ? Number(event.price) : 0;

  return (
    <article className="group bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-800">
        <img
          src={imageUrl}
          alt={titleText}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 right-3 px-3 py-1 text-xs font-medium text-white bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
          {!isNaN(priceVal) && priceVal > 0 
            ? `เริ่มต้น ฿${priceVal.toLocaleString()}` 
            : "ฟรี"}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
          {titleText}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
          {event.description || "ไม่มีรายละเอียดเพิ่มเติม"}
        </p>

        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="mt-icon-accent" />
            <span>{dateText}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="mt-icon-accent" />
            <span>{placeText}</span>
          </div>
        </div>
      </div>
    </article>
  );
}