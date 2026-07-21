import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockZones } from '../data/zones';

export default function BookingPage() {
  const navigate = useNavigate();
  
  // สร้างหน่วยความจำเก็บว่า "เลือกโซนไหน" และ "เลือกกี่ใบ"
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState<number>(1);

  // ฟังก์ชันเมื่อกดยืนยัน
  const handleConfirm = () => {
    const zone = mockZones.find(z => z.id === selectedZone);
    if (zone) {
      // สั่งให้เปลี่ยนหน้าไปที่ /payment พร้อมกับแนบข้อมูลตั๋วไปด้วย!
      navigate('/payment', { 
        state: { 
          zoneName: zone.name, 
          price: zone.price, 
          ticketCount: ticketCount,
          totalPrice: zone.price * ticketCount
        } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-neutral-800 p-8 rounded-2xl shadow-xl border border-white/5">
        <h1 className="text-3xl font-bold mb-2">เลือกโซนที่นั่ง</h1>
        <p className="text-gray-400 mb-8">โปรเจค Magic Tickets - Prototype</p>

        <div className="space-y-4 mb-8">
          {mockZones.map((zone) => (
            <div 
              key={zone.id} 
              // ถ้าตั๋วไม่หมด (availableSeats > 0) ถึงจะยอมให้คลิกเลือกได้
              onClick={() => zone.availableSeats > 0 && setSelectedZone(zone.id)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedZone === zone.id 
                  ? 'border-violet-500 bg-violet-500/10' // สีตอนถูกเลือก
                  : 'border-white/10 bg-neutral-900 hover:border-white/30' // สีปกติ
              } ${zone.availableSeats === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{zone.name}</h3>
                  <p className="text-gray-400">เหลือที่นั่ง: {zone.availableSeats} / {zone.totalSeats}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-400">฿{zone.price.toLocaleString()}</p>
                  {zone.availableSeats === 0 && <span className="text-red-400 text-sm font-bold">บัตรหมด</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ถ้ามีการเลือกโซนแล้ว ถึงจะโชว์ปุ่มเพิ่ม/ลด จำนวนตั๋ว */}
        {selectedZone && (
          <div className="bg-neutral-900 p-6 rounded-xl border border-white/10 mb-8">
            <h3 className="text-lg font-bold mb-4">จำนวนบัตร</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center font-bold hover:bg-neutral-600 cursor-pointer"
              >-</button>
              <span className="text-2xl font-bold w-12 text-center">{ticketCount}</span>
              <button 
                onClick={() => setTicketCount(ticketCount + 1)}
                className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center font-bold hover:bg-neutral-600 cursor-pointer"
              >+</button>
            </div>
          </div>
        )}

        {/* ปุ่มยืนยันการจอง */}
        <button 
          onClick={handleConfirm}
          disabled={!selectedZone} // ถ้ายังไม่เลือกโซน จะกดไม่ได้
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all cursor-pointer ${
            selectedZone 
              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30' 
              : 'bg-neutral-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          ยืนยันการจองและไปหน้าชำระเงิน
        </button>
      </div>
    </div>
  );
}