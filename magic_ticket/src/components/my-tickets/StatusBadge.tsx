import type { TicketStatus } from "@/data/tickets";

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig = {
  paid: {
    label: "ชำระเงินแล้ว (สำเร็จ)",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  expired: {
    label: "หมดเวลาชำระเงิน",
    className: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
} as const;

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
