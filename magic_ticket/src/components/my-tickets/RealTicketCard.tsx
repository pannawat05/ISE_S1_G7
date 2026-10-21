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
      className="z-[200] fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] shadow-2xl border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-white/10 border-b">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-violet-400" />
            <span className="font-semibold text-white text-sm">บัตรเข้างาน</span>
          </div>
          <button onClick={onClose}
            className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* Event info */}
          <div className="space-y-1 text-center">
            <p className="font-bold text-white text-base">{ticket.event_name}</p>
            <p className="text-violet-300 text-sm">
              {ticket.zone_name} · ที่นั่ง {ticket.seat_position}
            </p>
            <p className="text-gray-500 text-xs">{ticket.place_name}</p>
          </div>

          {/* QR Code */}
          {ticket.qr_data_url ? (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white shadow-lg p-4 rounded-2xl">
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
            <div className="flex justify-center items-center bg-white/5 border border-white/10 rounded-2xl h-52">
              <p className="text-gray-500 text-sm">ไม่มี QR Code</p>
            </div>
          )}

          {/* Status */}
          {ticket.status === "checked_in" && (
            <div className="flex justify-center items-center gap-2 text-blue-400 text-sm">
              <CheckCircle2 size={16} />
              <span>Check-in เรียบร้อยแล้ว</span>
            </div>
          )}

          {/* Download */}
          {ticket.qr_data_url && (
            <button
              onClick={download}
              className="flex justify-center items-center gap-2 py-2.5 border border-white/10 hover:border-violet-500/40 rounded-xl w-full text-gray-400 hover:text-violet-400 text-sm transition-colors"
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
      <article className="flex bg-surface border border-white/5 hover:border-white/10 rounded-xl overflow-hidden transition-colors">
        {/* Left accent bar */}
        <div className={`w-1 shrink-0 ${
          ticket.status === "paid" ? "bg-green-500" :
          ticket.status === "checked_in" ? "bg-blue-500" : "bg-red-500"
        }`} />

        {/* Content */}
        <div className="flex flex-1 items-center gap-3 px-4 py-3 min-w-0">
          {/* Main info */}
          <div className="flex-1 space-y-1 min-w-0">
            {/* Event name */}
            <h3 className="font-semibold text-white text-sm truncate leading-tight">
              {ticket.event_name}
            </h3>

            {/* Zone + seat + price */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-violet-500/20 px-2 py-0.5 border border-violet-500/30 rounded-full font-medium text-[11px] text-violet-300">
                {ticket.zone_name}
              </span>
              <span className="text-gray-500 text-xs">ที่นั่ง {ticket.seat_position}</span>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-400 text-xs">
                {ticket.zone_price === 0 ? "ฟรี" : `฿${Number(ticket.zone_price).toLocaleString()}`}
              </span>
            </div>

            {/* Date + location in one line */}
            <div className="flex items-center gap-3 text-gray-500 text-xs">
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-violet-400 shrink-0" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <MapPin size={11} className="text-violet-400 shrink-0" />
                <span className="max-w-[120px] truncate">{ticket.place_name}</span>
              </span>
            </div>
          </div>

          {/* Right: status + QR button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`mt-badge text-[11px] py-0.5 px-2 ${status.cls}`}>
              {status.label}
            </span>
            {(ticket.status === "paid" || ticket.status === "checked_in") && (
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg font-medium text-white text-xs transition-colors"
              >
                <QrCode size={13} />
                QR
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
