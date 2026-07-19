export type TicketStatus = "paid" | "expired";

export interface UserTicket {
  id: string;
  bookingRef: string;
  title: string;
  date: string;
  time: string;
  location: string;
  zone: string;
  seats: number;
  status: TicketStatus;
  image: string;
}

export const myTickets: UserTicket[] = [
  {
    id: "1",
    bookingRef: "#MT-2026-001",
    title: "Magic Harmony 2026 Concert",
    date: "20 ส.ค. 2569",
    time: "18:00 น.",
    location: "อิมแพ็ค อารีน่า เมืองทองธานี, นนทบุรี",
    zone: "โซน VIP Floor (A)",
    seats: 3,
    status: "expired",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80",
  },
  {
    id: "2",
    bookingRef: "#MT-2026-002",
    title: "Tech Innovation Summit 2026",
    date: "5 ก.ย. 2569",
    time: "09:00 น.",
    location: "ศูนย์การประชุมแห่งชาติสิริกิติ์",
    zone: "โซน Premium",
    seats: 1,
    status: "paid",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
  },
  {
    id: "3",
    bookingRef: "#MT-2026-003",
    title: "React Masterclass Workshop",
    date: "12 ก.ค. 2569",
    time: "13:00 น.",
    location: "Co-Working Space, สยามสแควร์",
    zone: "โซน General",
    seats: 2,
    status: "paid",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
  },
];
