import { useEffect, useState } from "react";
import cookie from "js-cookie";
import EventCard from "./EventCard";
import { featuredEvents } from "../../data/events";

export default function EventGrid() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
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
          if (Array.isArray(data) && data.length > 0) {
            setEvents(data);
            return; // ถ้าได้ข้อมูลจากเซิร์ฟเวอร์ ให้จบการทำงานตรงนี้
          }
        }
        // ถ้าเซิร์ฟเวอร์ตอบกลับมาแต่ไม่มีข้อมูล ให้โยน error เพื่อไปใช้ mock data
        throw new Error("No data from server"); 
      } catch (error) {
        console.log("ไม่พบ Backend จึงสลับไปใช้ข้อมูลจำลอง (Mock Data) แทน");
        setEvents(featuredEvents); // 👈 ถ้าเซิร์ฟเวอร์พัง ให้ดึง Mock Data มาใช้
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