export interface Event {
  id: string;
  title: string;
  description: string;
  price: number;
  date: string;
  location: string;
  image: string;
}

export const featuredEvents: Event[] = [
  {
    id: "1",
    title: "Magic Harmony 2026 Concert",
    description:
      "คอนเสิร์ตสุดยิ่งใหญ่แห่งปี พบกับศิลปินชั้นนำระดับโลกและแสงสีสุดตระการตา",
    price: 1500,
    date: "วันพฤหัสบดีที่ 20 สิงหาคม 2569",
    location: "อิมแพ็ค อารีน่า เมืองทองธานี, นนทบุรี",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
  },
  {
    id: "2",
    title: "Tech Innovation Summit 2026",
    description:
      "Summit เทคโนโลยีที่ยิ่งใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ พบกับผู้เชี่ยวชาญจากทั่วโลก",
    price: 2500,
    date: "วันเสาร์ที่ 5 กันยายน 2569",
    location: "ศูนย์การประชุมแห่งชาติสิริกิติ์",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  },
  {
    id: "3",
    title: "React Masterclass Workshop",
    description:
      "Workshop เชิงลึกสำหรับนักพัฒนา React เรียนรู้เทคนิคขั้นสูงและ Best Practices",
    price: 890,
    date: "วันอาทิตย์ที่ 12 กรกฎาคม 2569",
    location: "Co-Working Space, สยามสแควร์",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
  },
];
