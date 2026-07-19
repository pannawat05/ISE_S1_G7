import { Calendar, Clock, MapPin, QrCode } from "lucide-react";
import type { UserTicket } from "@/data/tickets";
import StatusBadge from "./StatusBadge";

interface TicketCardProps {
  ticket: UserTicket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const isPaid = ticket.status === "paid";

  return (
    <article className="flex flex-col md:flex-row bg-surface border border-white/5 rounded-2xl overflow-hidden">
      <div className="md:w-48 lg:w-56 shrink-0">
        <img
          src={ticket.image}
          alt={ticket.title}
          className="w-full h-40 md:h-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col sm:flex-row p-5 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1">
            หมายเลขจอง: {ticket.bookingRef}
          </p>
          <h3 className="text-lg font-bold text-white mb-3">{ticket.title}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="mt-icon-accent" />
              {ticket.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="mt-icon-accent" />
              {ticket.time}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-sm text-gray-400 mb-3">
            <MapPin size={14} className="mt-icon-accent mt-0.5" />
            <span>{ticket.location}</span>
          </div>

          <p className="text-xs text-gray-500">
            {ticket.zone} • จำนวน {ticket.seats} ที่นั่ง
          </p>
        </div>

        <div className="flex flex-col items-end justify-between gap-4 sm:min-w-[180px]">
          <StatusBadge status={ticket.status} />

          {isPaid ? (
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white mt-btn-primary w-full sm:w-auto justify-center">
              <QrCode size={18} />
              แสดงตั๋วเข้างาน QR
            </button>
          ) : (
            <p className="text-xs text-gray-500">ทำรายการไม่สำเร็จ</p>
          )}
        </div>
      </div>
    </article>
  );
}
