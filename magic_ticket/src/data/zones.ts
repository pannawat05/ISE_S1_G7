export interface Zone {
  id: string;
  name: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
}

export const mockZones: Zone[] = [
  { id: "VIP", name: "โซน VIP (ติดเวที)", price: 3500, totalSeats: 50, availableSeats: 12 },
  { id: "A", name: "โซน A (ยืน)", price: 2000, totalSeats: 200, availableSeats: 150 },
  { id: "B", name: "โซน B (นั่ง)", price: 1500, totalSeats: 100, availableSeats: 0 }, // โซนนี้แกล้งทำเป็นเต็ม
];