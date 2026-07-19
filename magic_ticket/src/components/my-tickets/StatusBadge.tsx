import type { TicketStatus } from "@/data/tickets";

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig = {
  paid: {
    label: "ชำระเงินแล้ว (สำเร็จ)",
    className: "mt-badge mt-badge-success",
  },
  expired: {
    label: "หมดเวลาชำระเงิน",
    className: "mt-badge mt-badge-muted",
  },
} as const;

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${config.className}`}
    >
      {config.label}
    </span>
  );
}
