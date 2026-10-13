import { useState, useEffect, useRef } from "react";
import {
  QrCode, ChevronDown, Loader2,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, ShieldCheck,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchMyStaffAssignments, scanTicket, type StaffAssignment, type ScanResult } from "@/api/user";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_ROLE_LABEL: Record<string, string> = {
  checkin: "Check-in", security: "Security",
  registration: "Registration", backstage: "Backstage", manager: "Manager",
};

// ─── Scan Result Card ─────────────────────────────────────────────────────────
function ScanResultCard({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  const isOk        = result.status === "ok";
  const isDuplicate = result.status === "already_checked_in";

  return (
    <div className={`rounded-2xl border p-6 text-center space-y-4 ${
      isOk        ? "bg-green-500/10  border-green-500/30" :
      isDuplicate ? "bg-yellow-500/10 border-yellow-500/30" :
                   "bg-red-500/10    border-red-500/30"
    }`}>
      <div className="flex justify-center">
        {isOk        && <CheckCircle2  size={56} className="text-green-400" />}
        {isDuplicate && <AlertTriangle size={56} className="text-yellow-400" />}
        {!isOk && !isDuplicate && <XCircle size={56} className="text-red-400" />}
      </div>
      <div className="space-y-1">
        <p className={`font-bold text-xl ${isOk ? "text-green-300" : isDuplicate ? "text-yellow-300" : "text-red-300"}`}>
          {result.message}
        </p>
        {result.holder && <p className="text-white text-lg font-semibold">{result.holder}</p>}
        {result.holder_email && <p className="text-gray-400 text-sm">{result.holder_email}</p>}
        {result.zone && (
          <p className="text-gray-300 text-sm">
            {result.is_wl ? "🎫 Whitelist" : `โซน ${result.zone}`}
            {result.seat && result.seat !== "WL-00" ? ` · ที่นั่ง ${result.seat}` : ""}
          </p>
        )}
      </div>
      <button onClick={onReset}
        className="flex items-center gap-2 mx-auto bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors">
        <RefreshCw size={16} /> สแกนต่อ
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScanQRPage() {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [manualCode, setManualCode]   = useState("");
  const [cameraMode, setCameraMode]   = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load staff assignments
  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) { setLoading(false); return; }
    fetchMyStaffAssignments(token)
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Cleanup camera on unmount
  useEffect(() => { return () => stopCamera(); }, []);

  // Unique events the user is assigned to
  const uniqueEvents = Array.from(
    new Map(
      assignments.filter((a) => a.event_id != null).map((a) => [a.event_id!, a]),
    ).values(),
  );

  // ── Camera ────────────────────────────────────────────────────────────────
  async function startCamera() {
    if (!selectedEventId) return;
    setCameraMode(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      if ("BarcodeDetector" in window) {
        // @ts-expect-error BarcodeDetector not in TS lib yet
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const raw = codes[0].rawValue as string;
              clearInterval(intervalRef.current!);
              stopCamera();
              await processQR(raw);
            }
          } catch { /* ignore frame errors */ }
        }, 400);
      }
    } catch {
      setCameraMode(false);
      alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    }
  }

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraMode(false);
  }

  // ── Process QR ────────────────────────────────────────────────────────────
  async function processQR(raw: string) {
    if (!selectedEventId || scanning) return;
    setScanning(true);
    const token = Cookies.get("authToken");
    if (!token) { setScanning(false); return; }

    let qrcode = raw.trim();
    try { const p = JSON.parse(raw); if (p.code) qrcode = p.code; } catch { /* raw mode */ }

    const result = await scanTicket(token, qrcode, selectedEventId);
    setScanResult(result);
    setScanning(false);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await processQR(manualCode.trim());
    setManualCode("");
  }

  function reset() { setScanResult(null); setManualCode(""); }

  return (
    <div className="bg-black min-h-screen text-white overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2">
          <QrCode size={22} className="text-violet-400" />
          <div>
            <h1 className="font-bold text-white text-2xl">สแกน QR บัตร</h1>
            <p className="text-gray-500 text-sm">ตรวจสอบสิทธิ์เข้างาน</p>
          </div>
        </div>

        {/* Not logged in */}
        {!Cookies.get("authToken") && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
            กรุณาเข้าสู่ระบบก่อนใช้งาน
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {!loading && Cookies.get("authToken") && (
          <>
            {/* Event selector */}
            <div className="space-y-1.5">
              <label className="text-gray-400 text-sm font-medium">เลือก Event ที่จะตรวจบัตร</label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => { setSelectedEventId(Number(e.target.value)); reset(); stopCamera(); }}
                  className="mt-input w-full appearance-none cursor-pointer pr-9"
                >
                  <option value={0}>— เลือก event —</option>
                  {uniqueEvents.map((a) => (
                    <option key={a.event_id!} value={a.event_id!}>
                      {a.event_name}
                      {a.event_role ? ` (${EVENT_ROLE_LABEL[a.event_role] ?? a.event_role})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {uniqueEvents.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex gap-2">
                  <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-400 text-xs">
                    คุณยังไม่ได้ถูก assign เข้างานใด — ติดต่อ organizer เพื่อให้ assign เป็น staff
                  </p>
                </div>
              )}
            </div>

            {/* Scan UI */}
            {selectedEventId > 0 && !scanResult && (
              <>
                {/* Camera */}
                {!cameraMode ? (
                  <button onClick={startCamera}
                    className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 py-6 rounded-2xl font-bold text-white text-lg transition-colors shadow-lg shadow-violet-600/20">
                    <QrCode size={30} /> เปิดกล้องสแกน QR
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative bg-black rounded-2xl overflow-hidden border border-violet-500/40">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover" />
                      {/* Scan overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-52 h-52 rounded-xl border-2 border-violet-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <p className="bg-black/70 text-white text-sm px-4 py-1.5 rounded-full">
                          {("BarcodeDetector" in window) ? "กำลังสแกนอัตโนมัติ..." : "กรอก code ด้านล่าง"}
                        </p>
                      </div>
                    </div>
                    <button onClick={stopCamera}
                      className="w-full py-2.5 border border-white/10 rounded-xl text-gray-400 hover:text-white text-sm transition-colors">
                      ปิดกล้อง
                    </button>
                  </div>
                )}

                {/* Manual fallback */}
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs text-center">หรือกรอก QR Code ด้วยตนเอง</p>
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="MT-xxxxxxxx"
                      className="mt-input flex-1 font-mono text-sm"
                      autoComplete="off"
                    />
                    <button type="submit" disabled={!manualCode.trim() || scanning}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors">
                      {scanning ? <Loader2 size={16} className="animate-spin" /> : "ตรวจ"}
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Result */}
            {scanResult && <ScanResultCard result={scanResult} onReset={reset} />}
          </>
        )}
      </div>
    </div>
  );
}
