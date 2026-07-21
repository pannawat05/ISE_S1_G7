import { useEffect, useState } from "react";
import cookie from "js-cookie";
import EventCard from "./EventCard";

export default function EventGrid() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // เช็กคีย์ Token ให้ครอบคลุมหลายชื่อ
        const token = cookie.get("token") || localStorage.getItem("token") || cookie.get("access_token");

        const response = await fetch("http://localhost:5001/get_events", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("👉 Data from API:", data); // ปริ้นท์เช็กโครงสร้างข้อมูลใน Console (F12)

          if (Array.isArray(data)) {
            // เอาข้อมูลทั้งหมดมาเซ็ตโดยไม่ filter ก่อน เพื่อเทสว่าการ์ดเด้งขึ้นไหม
            setEvents(data);
          }
        } else {
          console.error("Fetch failed with status:", response.status);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-6 pb-16 text-center text-gray-400">
        กำลังโหลดรายการกิจกรรม...
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id || event._id || Math.random()} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          ยังไม่มีกิจกรรมในขณะนี้
        </div>
      )}
    </section>
  );
}