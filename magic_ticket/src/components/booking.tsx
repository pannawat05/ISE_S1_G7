/**
 * BookingDrawer — slide-in panel จากด้านขวา
 * เปิดจากหน้า event_detail เมื่อกด "ซื้อบัตร"
 *
 * Flow:
 *   1. เลือกโซน     → แสดง zone list พร้อม available/total seats + ราคา
 *   2. เลือกที่นั่ง  → แสดง seat grid (available / taken / selected)
 *   3. ยืนยัน        → navigate ไป /payment พร้อม state
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, ArrowLeft, Loader2, Users } from "lucide-react";
import { API_BASE } from "@/api/client";
import {
  fetchEventZones, fetchZoneSeats,
  type PublicZone, type PublicSeat,
} from "@/api/events";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeColor(type: string) {
  switch (type) {
    case "VIP":  return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "VVIP": return "bg-amber-500/20  text-amber-300  border-amber-500/30";
    case "ฟรี": return "bg-green-500/20  text-green-300  border-green-500/30";
    default:     return "bg-violet-500/20 text-violet-300 border-violet-500/30";
  }
}

function availabilityColor(available: number, total: number) {
  if (total === 0) return "text-gray-500";
  const ratio = available / total;
  if (available === 0)   return "text-red-400";
  if (ratio <= 0.2)      return "text-orange-400";
  if (ratio <= 0.5)      return "text-yellow-400";
  return "text-green-400";
}

// ─── Zone Card ────────────────────────────────────────────────────────────────
function ZoneCard({ zone, selected, onSelect }: {
  zone: PublicZone;
  selected: boolean;
  onSelect: () => void;
}) {
  const isSoldOut = zone.total_seats > 0 && zone.available_seats === 0;
  const hasSeats  = zone.total_seats > 0;
  const imgSrc = zone.images[0]
    ? (zone.images[0].url.startsWith("http") ? zone.images[0].url : `${API_BASE}${zone.images[0].url}`)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isSoldOut}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? "border-violet-500 bg-violet-500/10"
          : isSoldOut
            ? "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed"
            : "border-white/10 bg-white/[0.02] hover:border-violet-500/40 hover:bg-violet-500/5"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Zone image thumbnail */}
        {imgSrc ? (
          <img src={imgSrc} alt={zone.name}
            className="border border-white/10 rounded-lg w-16 h-12 object-cover shrink-0" />
        ) : (
          <div className="flex justify-center items-center bg-white/5 border border-white/10 rounded-lg w-16 h-12 shrink-0">
            <Users size={18} className="text-gray-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-white text-sm">{zone.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${typeColor(zone.type)}`}>
              {zone.type}
            </span>
            <span className="text-gray-500 text-xs">{zone.category}</span>
          </div>
          {hasSeats && (
            <p className={`text-xs ${availabilityColor(zone.available_seats, zone.total_seats)}`}>
              {isSoldOut
                ? "บัตรหมด"
                : `เหลือ ${zone.available_seats.toLocaleString()} / ${zone.total_seats.toLocaleString()} ที่นั่ง`}
            </p>
          )}
          {!hasSeats && (
            <p className="text-gray-600 text-xs">ไม่กำหนดที่นั่ง</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="font-bold text-violet-300 text-base">
            {zone.price === 0 ? "ฟรี" : `฿${zone.price.toLocaleString()}`}
          </p>
          {!isSoldOut && <ChevronRight size={14} className="mt-0.5 ml-auto text-gray-500" />}
        </div>
      </div>
    </button>
  );
}

// ─── Seat Grid ────────────────────────────────────────────────────────────────
function SeatGrid({ seats, selected, onToggle, maxSelect = 10 }: {
  seats: PublicSeat[];
  selected: Set<number>;
  onToggle: (seatId: number) => void;
  maxSelect?: number;
}) {
  if (!seats.length) {
    return (
      <div className="py-8 text-gray-500 text-sm text-center">
        โซนนี้ไม่ได้กำหนดที่นั่งแบบระบุตำแหน่ง
      </div>
    );
  }

  // Group seats by row letter (A, B, C...)
  const rowMap = new Map<string, PublicSeat[]>();
  for (const seat of seats) {
    const row = seat.position.replace(/\d+$/, "") || "?";
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row)!.push(seat);
  }
  const rows = Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-gray-500 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block bg-violet-600/30 border border-violet-500/50 rounded w-4 h-4" />ว่าง
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block bg-violet-600 border border-violet-500 rounded w-4 h-4" />เลือกแล้ว
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block bg-white/5 border border-white/10 rounded w-4 h-4" />ถูกจองแล้ว
        </span>
      </div>

      {/* Stage indicator */}
      <div className="flex justify-center">
        <div className="bg-white/5 px-8 py-1.5 border border-white/10 rounded-full text-gray-500 text-xs tracking-widest">
          STAGE
        </div>
      </div>

      {/* Seat rows */}
      <div className="space-y-1.5 pb-2 overflow-x-auto">
        {rows.map(([rowLetter, rowSeats]) => (
          <div key={rowLetter} className="flex justify-center items-center gap-1.5 mx-auto min-w-max">
            <span className="w-5 text-gray-600 text-xs text-right shrink-0">{rowLetter}</span>
            {rowSeats
              .sort((a, b) => {
                const na = parseInt(a.position.replace(/\D/g, "")) || 0;
                const nb = parseInt(b.position.replace(/\D/g, "")) || 0;
                return na - nb;
              })
              .map((seat) => {
                const isSelected = selected.has(seat.id);
                const canSelect = seat.is_available || isSelected;
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => canSelect && onToggle(seat.id)}
                    title={`${seat.position}${!seat.is_available ? " (ถูกจองแล้ว)" : ""}`}
                    className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-violet-600 border border-violet-500 text-white scale-105 shadow-lg shadow-violet-500/30"
                        : seat.is_available
                          ? "bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/40 hover:scale-105"
                          : "bg-white/5 border border-white/10 text-gray-700 cursor-not-allowed"
                    } ${!canSelect ? "opacity-60" : ""}`}
                  >
                    {parseInt(seat.position.replace(/\D/g, "")) || seat.position.slice(-2)}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {selected.size >= maxSelect && (
        <p className="text-orange-400 text-xs text-center">
          เลือกได้สูงสุด {maxSelect} ที่นั่งต่อครั้ง
        </p>
      )}
    </div>
  );
}

// ─── Main BookingDrawer ───────────────────────────────────────────────────────
interface BookingDrawerProps {
  eventId: number;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
}

type Step = "zone" | "seat" | "confirm";

export default function BookingDrawer({ eventId, eventName, isOpen, onClose }: BookingDrawerProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("zone");
  const [zones, setZones] = useState<PublicZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [selectedZone, setSelectedZone] = useState<PublicZone | null>(null);
  const [seats, setSeats] = useState<PublicSeat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set());

  // Load zones when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setStep("zone");
    setSelectedZone(null);
    setSelectedSeats(new Set());
    setZonesLoading(true);
    fetchEventZones(eventId)
      .then(setZones)
      .catch((e: Error) => setZonesError(e.message))
      .finally(() => setZonesLoading(false));
  }, [isOpen, eventId]);

  // Load seats when zone selected
  const handleSelectZone = useCallback(async (zone: PublicZone) => {
    setSelectedZone(zone);
    setSelectedSeats(new Set());

    if (zone.total_seats > 0) {
      setSeatsLoading(true);
      setStep("seat");
      try {
        const data = await fetchZoneSeats(eventId, zone.id);
        setSeats(data);
      } catch { setSeats([]); }
      finally { setSeatsLoading(false); }
    } else {
      // No specific seats — go straight to confirm
      setSeats([]);
      setStep("confirm");
    }
  }, [eventId]);

  function toggleSeat(seatId: number) {
    setSelectedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else if (next.size < 10) {
        next.add(seatId);
      }
      return next;
    });
  }

  function handleConfirm() {
    if (!selectedZone) return;
    const seatList = seats.filter((s) => selectedSeats.has(s.id));
    navigate("/payment", {
      state: {
        eventId,
        eventName,
        zone: { id: selectedZone.id, name: selectedZone.name, type: selectedZone.type, price: selectedZone.price },
        seats: seatList.map((s) => ({ id: s.id, position: s.position, name: s.name })),
        totalPrice: selectedZone.price * (seatList.length || 1),
      },
    });
    onClose();
  }

  const canConfirm = selectedZone && (
    selectedZone.total_seats === 0 || selectedSeats.size > 0
  );

  const totalPrice = selectedZone
    ? selectedZone.price * (selectedSeats.size || (selectedZone.total_seats === 0 ? 1 : 0))
    : 0;

  // ── Render ──
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-[100] flex flex-col w-full max-w-lg bg-[#0e0e0e] border-l border-white/10 shadow-2xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-white/10 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {step !== "zone" && (
              <button type="button"
                onClick={() => setStep(step === "confirm" && selectedZone?.total_seats === 0 ? "zone" : step === "seat" ? "zone" : "seat")}
                className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white text-base truncate">
                {step === "zone" && "เลือกโซนที่นั่ง"}
                {step === "seat" && `โซน ${selectedZone?.name ?? ""}`}
                {step === "confirm" && "ยืนยันการจอง"}
              </p>
              <p className="text-gray-500 text-xs truncate">{eventName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="hover:bg-white/10 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-5 py-3 shrink-0">
          {(["zone", "seat", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              step === s ? "bg-violet-500" : i < ["zone","seat","confirm"].indexOf(step) ? "bg-violet-500/40" : "bg-white/10"
            }`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 px-5 py-4 min-h-0 overflow-y-auto">

          {/* ── STEP 1: Zone list ── */}
          {step === "zone" && (
            <>
              {zonesLoading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 size={24} className="text-violet-400 animate-spin" />
                </div>
              )}
              {!zonesLoading && zonesError && (
                <p className="py-8 text-red-400 text-sm text-center">{zonesError}</p>
              )}
              {!zonesLoading && !zonesError && zones.length === 0 && (
                <div className="space-y-2 py-12 text-center">
                  <p className="text-gray-400">ยังไม่มีโซนที่นั่ง</p>
                  <p className="text-gray-600 text-xs">ผู้จัดงานยังไม่ได้กำหนดโซน</p>
                </div>
              )}
              {!zonesLoading && zones.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  selected={selectedZone?.id === zone.id}
                  onSelect={() => handleSelectZone(zone)}
                />
              ))}
            </>
          )}

          {/* ── STEP 2: Seat picker ── */}
          {step === "seat" && selectedZone && (
            <div className="space-y-4">
              {/* Zone summary */}
              <div className="flex justify-between items-center bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                <div>
                  <p className="font-semibold text-white">{selectedZone.name}</p>
                  <p className={`text-xs ${availabilityColor(selectedZone.available_seats, selectedZone.total_seats)}`}>
                    {selectedZone.available_seats} ที่ว่าง
                  </p>
                </div>
                <p className="font-bold text-violet-300 text-lg">
                  {selectedZone.price === 0 ? "ฟรี" : `฿${selectedZone.price.toLocaleString()}`}
                </p>
              </div>

              {/* Zone layout images */}
              {selectedZone.images.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-gray-500 text-xs">ผังที่นั่ง</p>
                  <div className="flex gap-2 pb-1 overflow-x-auto">
                    {selectedZone.images.map((img) => {
                      const src = img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`;
                      return (
                        <a key={img.id} href={src} target="_blank" rel="noopener noreferrer">
                          <img src={src} alt={img.name}
                            className="bg-white/5 border border-white/10 rounded-xl h-40 object-contain cursor-zoom-in shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {seatsLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={22} className="text-violet-400 animate-spin" />
                </div>
              )}
              {!seatsLoading && (
                <>
                  <SeatGrid
                    seats={seats}
                    selected={selectedSeats}
                    onToggle={toggleSeat}
                  />
                  {selectedSeats.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep("confirm")}
                      className="bg-violet-600 hover:bg-violet-700 py-3 rounded-xl w-full font-semibold text-white text-sm transition-colors"
                    >
                      ยืนยันที่นั่ง ({selectedSeats.size} ที่) →
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === "confirm" && selectedZone && (
            <div className="space-y-4">
              <div className="space-y-4 bg-white/[0.02] p-5 border border-white/5 rounded-xl">
                <h3 className="font-semibold text-white text-base">สรุปการจอง</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">งาน</span>
                    <span className="max-w-[60%] font-medium text-white text-right truncate">{eventName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">โซน</span>
                    <span className="text-white">{selectedZone.name} ({selectedZone.type})</span>
                  </div>
                  {selectedSeats.size > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-400">ที่นั่ง</span>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
                        {seats
                          .filter((s) => selectedSeats.has(s.id))
                          .map((s) => (
                            <span key={s.id} className="bg-violet-500/20 px-2 py-0.5 border border-violet-500/30 rounded-full text-violet-300 text-xs">
                              {s.position}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">ราคา/ที่</span>
                    <span className="text-white">
                      {selectedZone.price === 0 ? "ฟรี" : `฿${selectedZone.price.toLocaleString()}`}
                    </span>
                  </div>
                  {selectedSeats.size > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">จำนวน</span>
                      <span className="text-white">{selectedSeats.size} ที่</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-white/10 border-t">
                  <span className="font-semibold text-gray-300">ยอดรวม</span>
                  <span className="font-bold text-violet-300 text-xl">
                    {totalPrice === 0 ? "ฟรี" : `฿${totalPrice.toLocaleString()}`}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 text-xs text-center">
                กดยืนยันเพื่อดำเนินการชำระเงิน — ที่นั่งจะถูกจองเมื่อชำระเสร็จสิ้น
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {step === "confirm" && (
          <div className="px-5 py-4 border-white/10 border-t shrink-0">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 py-3.5 rounded-xl w-full font-bold text-white text-base transition-colors disabled:cursor-not-allowed"
            >
              {totalPrice === 0 ? "จองฟรี →" : `ชำระ ฿${totalPrice.toLocaleString()} →`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
