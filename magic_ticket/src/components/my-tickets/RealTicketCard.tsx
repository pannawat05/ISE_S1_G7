import { useState } from "react";
import {
  Calendar, MapPin, QrCode, X, Download,
  CheckCircle2, Ticket,
} from "lucide-react";
import type { MyTicket } from "@/api/payment";

interface Props { ticket: MyTicket }

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  paid:       { label: "ชำระแล้ว",     cls: "bg-green-500/10 text-green-400 border-green-500/20" },
  checked_in: { label: "Check-in แล้ว", cls: "bg-blue-500/10  text-blue-400  border-blue-500/20"  },
  reserved:   { label: "รอชำระเงิน",   cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  cancelled:  { label: "ยกเลิก",       cls: "bg-red-500/10   text-red-400   border-red-500/20"   },
};

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ ticket, onClose }: { ticket: MyTicket; onClose: () => void }) {
  function download() {
    if (!ticket.qr_data_url) return;
    const a = document.createElement("a");
    a.href = ticket.qr_data_url;
    a.download = `ticket-${ticket.id}-${ticket.qrcode}.png`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-violet-400" />
            <span className="font-semibold text-white text-sm">บัตรเข้างาน</span>
          </div>
          <button onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Event info */}
          <div className="text-center space-y-1">
            <p className="font-bold text-white text-base">{ticket.event_name}</p>
            <p className="text-violet-300 text-sm">
              {ticket.zone_name} · ที่นั่ง {ticket.seat_position}
            </p>
            <p className="text-gray-500 text-xs">{ticket.place_name}</p>
          </div>

          {/* QR Code */}
          {ticket.qr_data_url ? (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img
                  src={ticket.qr_data_url}
                  alt="QR Code"
                  className="w-52 h-52"
                />
              </div>
              <p className="font-mono text-gray-600 text-xs tracking-wider">
                {ticket.qrcode}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-52 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-gray-500 text-sm">ไม่มี QR Code</p>
            </div>
          )}

          {/* Status */}
          {ticket.status === "checked_in" && (
            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
              <CheckCircle2 size={16} />
              <span>Check-in เรียบร้อยแล้ว</span>
            </div>
          )}

          {/* Download */}
          {ticket.qr_data_url && (
            <button
              onClick={download}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/10 hover:border-violet-500/40 rounded-xl text-gray-400 hover:text-violet-400 text-sm transition-colors"
            >
              <Download size={15} />
              บันทึก QR Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────
export default function RealTicketCard({ ticket }: Props) {
  const [showQR, setShowQR] = useState(false);
  const status = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.cancelled;

  const eventDate = new Date(ticket.event_start);
  const dateStr = eventDate.toLocaleDateString("th-TH", {
    day: "numeric", month: "short", year: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      <article className="flex flex-col sm:flex-row bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
        {/* Left accent bar */}
        <div className={`sm:w-1.5 h-1.5 sm:h-auto shrink-0 ${
          ticket.status === "paid" ? "bg-green-500" :
          ticket.status === "checked_in" ? "bg-blue-500" : "bg-red-500"
        }`} />

        {/* Content */}
        <div className="flex flex-1 flex-col sm:flex-row p-5 gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Booking ref */}
            <p className="text-xs text-gray-600 font-mono">
              #{ticket.qrcode.slice(0, 20)}...
            </p>

            {/* Event name */}
            <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">
              {ticket.event_name}
            </h3>

            {/* Zone + seat */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-2.5 py-1 rounded-full font-medium">
                {ticket.zone_name}
              </span>
              <span className="text-gray-400 text-xs">
                ที่นั่ง {ticket.seat_position}
              </span>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-400 text-xs">
                {ticket.zone_price === 0 ? "ฟรี" : `฿${Number(ticket.zone_price).toLocaleString()}`}
              </span>
            </div>

            {/* Date + location */}
            <div className="space-y-1.5 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-violet-400 shrink-0" />
                <span>{dateStr} · {timeStr}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-violet-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{ticket.place_name}</span>
              </div>
            </div>
          </div>

          {/* Right: status + QR button */}
          <div className="flex flex-col items-end justify-between gap-4 sm:min-w-[160px] shrink-0">
            <span className={`mt-badge ${status.cls}`}>
              {status.label}
            </span>

            {(ticket.status === "paid" || ticket.status === "checked_in") && (
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold transition-colors w-full sm:w-auto justify-center"
              >
                <QrCode size={16} />
                แสดง QR
              </button>
            )}
          </div>
        </div>
      </article>

      {/* QR Modal */}
      {showQR && <QRModal ticket={ticket} onClose={() => setShowQR(false)} />}
    </>
  );
}
