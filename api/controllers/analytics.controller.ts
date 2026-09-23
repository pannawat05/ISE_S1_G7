import type { Response } from "express";
import type { RowDataPacket } from "mysql2";
import type { AuthRequest } from "../middlewares/types.js";
import { query } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";
import { findUserById } from "../model/user.model.js";

type AnalyticsFilters = {
  eventId?: number;
  from?: string;
  to?: string;
  ticketType?: string;
  whitelist?: "all" | "whitelisted" | "general";
  zoneId?: number;
  paymentStatus?: string;
  ticketStatus?: string;
};

type AnalyticsRow = RowDataPacket & Record<string, unknown>;

function filtersFromRequest(req: AuthRequest): AnalyticsFilters {
  const eventId = Number(req.query.eventId);
  const zoneId = Number(req.query.zoneId);
  const whitelist = String(req.query.whitelist ?? "all");
  return {
    eventId: Number.isFinite(eventId) && eventId > 0 ? eventId : undefined,
    from: String(req.query.from ?? "").trim() || undefined,
    to: String(req.query.to ?? "").trim() || undefined,
    ticketType: String(req.query.ticketType ?? "").trim() || undefined,
    whitelist: ["all", "whitelisted", "general"].includes(whitelist)
      ? whitelist as AnalyticsFilters["whitelist"]
      : "all",
    zoneId: Number.isFinite(zoneId) && zoneId > 0 ? zoneId : undefined,
    paymentStatus: String(req.query.paymentStatus ?? "").trim() || undefined,
    ticketStatus: String(req.query.ticketStatus ?? "").trim() || undefined,
  };
}

function buildWhere(organizerId: number, filters: AnalyticsFilters) {
  const conditions = ["e.organizer_id = ?", "t.status <> 'cancelled'"];
  const params: unknown[] = [organizerId];

  if (filters.eventId) { conditions.push("e.id = ?"); params.push(filters.eventId); }
  if (filters.from) { conditions.push("COALESCE(tx.payment_time, t.created_at) >= ?"); params.push(filters.from); }
  if (filters.to) {
    conditions.push("COALESCE(tx.payment_time, t.created_at) < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(filters.to);
  }
  if (filters.ticketType) { conditions.push("z.type = ?"); params.push(filters.ticketType); }
  if (filters.zoneId) { conditions.push("z.id = ?"); params.push(filters.zoneId); }
  if (filters.paymentStatus) {
    conditions.push("COALESCE(tx.payment_status, 'unpaid') = ?");
    params.push(filters.paymentStatus);
  }
  if (filters.ticketStatus) { conditions.push("t.status = ?"); params.push(filters.ticketStatus); }
  if (filters.whitelist === "whitelisted") { conditions.push("wl.id IS NOT NULL"); }
  if (filters.whitelist === "general") { conditions.push("wl.id IS NULL"); }

  return { where: conditions.join(" AND "), params };
}

const rowSelect = `
  SELECT t.id AS ticket_id, t.status AS ticket_status, t.created_at,
         e.id AS event_id, e.name AS event_name, z.id AS zone_id,
         z.name AS zone_name, z.type AS ticket_type, u.email,
         CONCAT(u.f_name, ' ', u.l_name) AS attendee_name,
         CASE WHEN wl.id IS NULL THEN 0 ELSE 1 END AS is_whitelisted,
         COALESCE(tx.payment_status, 'unpaid') AS payment_status,
         COALESCE(tx.paid_amount, 0) AS paid_amount,
         tx.payment_time,
         (SELECT MAX(ci.time_stamp) FROM check_in_history ci WHERE ci.ticket_id = t.id) AS checked_in_at
    FROM tickets t
    JOIN seats s ON s.id = t.seat_id
    JOIN zones z ON z.id = s.zone_id
    JOIN events e ON e.id = z.event_id
    JOIN users u ON u.id = t.users_id
    LEFT JOIN white_list wl ON wl.event_id = e.id AND wl.users_id = t.users_id
    LEFT JOIN (
      SELECT ticket_id, MAX(status) AS payment_status,
             SUM(CASE WHEN status = 'paid' THEN gross_amount ELSE 0 END) AS paid_amount,
             MAX(time_stamp) AS payment_time
        FROM transactions
       GROUP BY ticket_id
    ) tx ON tx.ticket_id = t.id
`;

async function resolveOwner(req: AuthRequest, res: Response, organizerId: number) {
  if (!req.user?.id) { res.status(401).json({ message: "Unauthorized" }); return false; }
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return false; }
  if (organizer.owner_id !== req.user.id) { res.status(403).json({ message: "Forbidden" }); return false; }
  return true;
}

export async function getOrganizerAnalytics(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!Number.isFinite(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    if (!await resolveOwner(req, res, organizerId)) return;
    const filters = filtersFromRequest(req);
    const { where, params } = buildWhere(organizerId, filters);
    const rows = await query<AnalyticsRow[]>(
      `${rowSelect} WHERE ${where} ORDER BY COALESCE(tx.payment_time, t.created_at) DESC`,
      params,
    );
    const views = await query<{ views: number }[]>(
      "SELECT COALESCE(SUM(v.view_count), 0) AS views FROM event_views v JOIN events e ON e.id = v.event_id WHERE e.organizer_id = ? AND (? IS NULL OR e.id = ?)",
      [organizerId, filters.eventId ?? null, filters.eventId ?? null],
    );

    const registered = rows.length;
    const sold = rows.filter((r) => r.ticket_status === "paid" || r.ticket_status === "checked_in").length;
    const paid = rows.filter((r) => r.payment_status === "paid");
    const checkins = rows.filter((r) => r.ticket_status === "checked_in").length;
    const paidAmount = paid.reduce((sum, row) => sum + Number(row.paid_amount ?? 0), 0);

    return res.json({
      filters,
      kpi: {
        views: Number(views[0]?.views ?? 0),
        registered,
        sold,
        paid_amount: paidAmount,
        checkins,
        no_show: Math.max(sold - checkins, 0),
        no_show_rate: sold ? Math.round(((sold - checkins) / sold) * 100) : 0,
        checkin_rate: sold ? Math.round((checkins / sold) * 100) : 0,
      },
      rows,
    });
  } catch (err) {
    console.error("ORGANIZER ANALYTICS ERROR:", err);
    return res.status(500).json({ message: "Error fetching analytics" });
  }
}

export async function exportOrganizerAnalytics(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!Number.isFinite(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });
  try {
    if (!await resolveOwner(req, res, organizerId)) return;
    const { where, params } = buildWhere(organizerId, filtersFromRequest(req));
    const rows = await query<AnalyticsRow[]>(
      `${rowSelect} WHERE ${where} ORDER BY COALESCE(tx.payment_time, t.created_at) DESC`,
      params,
    );
    const csvRows = [
      ["ticket_id", "event", "attendee", "email", "zone", "ticket_type", "whitelist", "ticket_status", "payment_status", "amount", "checked_in_at"],
      ...rows.map((row) => [
        row.ticket_id, row.event_name, row.attendee_name, row.email, row.zone_name,
        row.ticket_type, Number(row.is_whitelisted) ? "yes" : "no", row.ticket_status,
        row.payment_status, row.paid_amount, row.checked_in_at ?? "",
      ]),
    ];
    const csv = csvRows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=event-analytics.csv");
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    console.error("EXPORT ANALYTICS ERROR:", err);
    return res.status(500).json({ message: "Error exporting analytics" });
  }
}

export async function getPlatformAnalytics(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  try {
    const user = await findUserById(req.user.id);
    if (user?.role !== "sysadmin") return res.status(403).json({ message: "Sysadmin access required" });
    const [users] = await query<{ total: number }[]>("SELECT COUNT(*) AS total FROM users");
    const [organizers] = await query<{ total: number }[]>("SELECT COUNT(*) AS total FROM organizers");
    const [events] = await query<{ total: number }[]>("SELECT COUNT(*) AS total FROM events");
    const [transactions] = await query<{ total: number; amount: number }[]>("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'paid' THEN gross_amount ELSE 0 END), 0) AS amount FROM transactions");
    const [tickets] = await query<{ sold: number; checked_in: number }[]>("SELECT COUNT(CASE WHEN status IN ('paid', 'checked_in') THEN 1 END) AS sold, COUNT(CASE WHEN status = 'checked_in' THEN 1 END) AS checked_in FROM tickets");
    const [views] = await query<{ total: number }[]>("SELECT COALESCE(SUM(view_count), 0) AS total FROM event_views");
    const sold = Number(tickets?.sold ?? 0);
    const checkedIn = Number(tickets?.checked_in ?? 0);
    return res.json({
      users: Number(users?.total ?? 0),
      organizers: Number(organizers?.total ?? 0),
      events: Number(events?.total ?? 0),
      transactions: Number(transactions?.total ?? 0),
      transaction_amount: Number(transactions?.amount ?? 0),
      views: Number(views?.total ?? 0),
      checkins: checkedIn,
      checkin_rate: sold ? Math.round((checkedIn / sold) * 100) : 0,
    });
  } catch (err) {
    console.error("PLATFORM ANALYTICS ERROR:", err);
    return res.status(500).json({ message: "Error fetching platform analytics" });
  }
}