import { useState } from "react";
import { Loader2, Mail, RefreshCw, Users } from "lucide-react";
import Swal from "sweetalert2";
import {
  createGoogleGroupTicketBatch,
  fetchBulkTicketBatch,
  previewGoogleGroupMembers,
  retryBulkTicketEmail,
  type BulkTicketBatch,
  type BulkTicketPreview,
} from "@/api/organizer";

interface Props {
  token: string;
  organizerId: number;
  eventId: number;
}

export default function BulkTicketDistribution({ token, organizerId, eventId }: Props) {
  const [groupEmail, setGroupEmail] = useState("");
  const [preview, setPreview] = useState<BulkTicketPreview | null>(null);
  const [batch, setBatch] = useState<BulkTicketBatch | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);
    setBatch(null);
    try {
      setPreview(await previewGoogleGroupMembers(token, organizerId, eventId, groupEmail));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดึงรายชื่อสมาชิกไม่สำเร็จ");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSend() {
    if (!preview) return;
    const result = await Swal.fire({
      icon: "question",
      title: "ส่งคำเชิญชำระเงิน?",
      text: `ระบบจะส่งอีเมลแยกให้สมาชิก ${preview.members.filter((member) => member.status === "will_invite").length} คน โดยแต่ละคำเชิญใช้ซื้อบัตรได้ 1 ใบ`,
      showCancelButton: true,
      confirmButtonText: "ส่งคำเชิญ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    setSending(true);
    setError(null);
    try {
      setBatch(await createGoogleGroupTicketBatch(token, organizerId, eventId, groupEmail));
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างคำเชิญไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  async function handleRetry(invitationId: number) {
    setRetryingId(invitationId);
    try {
      const result = await retryBulkTicketEmail(token, organizerId, eventId, invitationId);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: result.sent ? "success" : "error",
        title: result.message,
        showConfirmButton: false,
        timer: 2500,
      });
      if (batch?.batch_id) {
        const refreshed = await fetchBulkTicketBatch(token, organizerId, eventId, batch.batch_id);
        setBatch((prev) => prev ? { ...prev, invitations: refreshed.invitations } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งอีเมลซ้ำไม่สำเร็จ");
    } finally {
      setRetryingId(null);
    }
  }

  const statusText: Record<string, string> = {
    already_ticketed: "มีบัตรแล้ว — ข้าม",
    already_invited: "มีคำเชิญที่ยังใช้งานได้ — ข้าม",
    will_invite: "จะส่งคำเชิญ",
  };

  return (
    <section className="space-y-4 mt-surface p-5 rounded-2xl">
      <div className="flex items-center gap-2">
        <Users size={17} className="text-violet-400" />
        <h2 className="font-semibold text-white text-sm">ส่งคำเชิญซื้อบัตรจาก Google Group</h2>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">
        ดึงอีเมลสมาชิกแต่ละคนจาก Google Workspace แล้วส่งคำเชิญส่วนตัว สมาชิกต้องเข้าสู่ระบบหรือสมัครด้วยอีเมลที่ได้รับคำเชิญและชำระเงินก่อน ระบบจึงออก QR code เฉพาะบุคคล
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={groupEmail}
          onChange={(event) => {
            setGroupEmail(event.target.value);
            setPreview(null);
            setBatch(null);
          }}
          placeholder="event-staff@kmitl.ac.th"
          className="mt-input flex-1"
        />
        <button
          type="button"
          onClick={handlePreview}
          disabled={loadingPreview || sending || !groupEmail.trim()}
          className="flex justify-center items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 px-4 py-2 rounded-xl text-white text-sm"
        >
          {loadingPreview ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
          ดูตัวอย่างสมาชิก
        </button>
      </div>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      {preview && (
        <div className="space-y-3 bg-white/[0.02] p-4 border border-white/5 rounded-xl">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-white">สมาชิก: {preview.total}</span>
            <span className="text-gray-400">อีเมลซ้ำ/ไม่ถูกต้อง: {preview.duplicateEmails}</span>
            <span className="text-gray-400">มีบัตรแล้ว: {preview.existingTickets}</span>
            <span className="text-gray-400">มีคำเชิญแล้ว: {preview.activeInvitations}</span>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
            {preview.members.slice(0, 30).map((member) => (
              <li key={member.email} className="flex justify-between gap-3 text-gray-300">
                <span className="truncate">{member.email}</span>
                <span className="text-gray-500 shrink-0">{statusText[member.status]}</span>
              </li>
            ))}
            {preview.members.length > 30 && (
              <li className="text-gray-500">แสดง 30 จาก {preview.members.length} รายชื่อ</li>
            )}
          </ul>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || preview.members.every((member) => member.status !== "will_invite")}
            className="flex justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-xl font-semibold text-white text-sm"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            {sending ? "กำลังส่งคำเชิญ..." : "ยืนยันและส่งคำเชิญ"}
          </button>
        </div>
      )}

      {batch && (
        <div className="space-y-3 bg-white/[0.02] p-4 border border-white/5 rounded-xl">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-white">รายการ: {batch.total_records}</span>
            <span className="text-green-400">สร้างคำเชิญ: {batch.invitations_created}</span>
            <span className="text-gray-400">ข้าม: {batch.skipped_duplicates}</span>
            <span className={batch.email_failures ? "text-red-400" : "text-gray-400"}>
              ส่งอีเมลไม่สำเร็จ: {batch.email_failures}
            </span>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {batch.invitations.map((invitation) => {
              const failedEmailStatus = invitation.status === "paid"
                ? invitation.ticket_email_status === "failed"
                : invitation.invitation_email_status === "failed";
              return (
                <li key={invitation.id} className="flex flex-wrap justify-between items-center gap-2 text-xs">
                  <span className="text-gray-300">{invitation.invited_email}</span>
                  <span className="text-gray-500">
                    {invitation.status === "paid"
                      ? "ชำระแล้ว"
                      : invitation.status === "cancelled"
                        ? "ยกเลิก"
                        : invitation.invitation_email_status === "sent"
                          ? "ส่งคำเชิญแล้ว · รอชำระ"
                          : "ส่งคำเชิญไม่สำเร็จ"}
                  </span>
                  {failedEmailStatus && (
                    <button
                      type="button"
                      onClick={() => handleRetry(invitation.id)}
                      disabled={retryingId === invitation.id}
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 disabled:opacity-50"
                    >
                      {retryingId === invitation.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <RefreshCw size={13} />}
                      ส่งซ้ำ
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
