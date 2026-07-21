import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // รับข้อมูลตั๋วที่ส่งมาจากหน้า Booking
  const bookingData = location.state;
  
  // สร้าง State จำลองการเลือกวิธีชำระเงิน
  const [paymentMethod, setPaymentMethod] = useState<string>('promptpay');
  const [isProcessing, setIsProcessing] = useState(false);

  // ถ้าไม่มีข้อมูลส่งมา (เช่น แอบพิมพ์ URL เข้ามาตรงๆ) ให้เด้งกลับไปหน้าแรก
  if (!bookingData) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center">
        <h2>ไม่พบข้อมูลการจอง</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-violet-600 rounded">กลับหน้าหลัก</button>
      </div>
    );
  }

  // ฟังก์ชันจำลองการกดจ่ายเงิน
  const handlePayment = () => {
    setIsProcessing(true);
    
    // จำลองเวลารอโหลด (หน่วงเวลา 1.5 วินาที)
    setTimeout(() => {
      alert(`ชำระเงินสำเร็จแล้ว!\n\nยอดรวม: ฿${bookingData.totalPrice.toLocaleString()}\nโซน: ${bookingData.zoneName}\nจำนวน: ${bookingData.ticketCount} ใบ`);
      
      // จ่ายเสร็จแล้ว เด้งไปหน้า "ตั๋วของฉัน"
      navigate('/my-tickets');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-neutral-800 p-8 rounded-2xl shadow-xl border border-white/5">
        <h1 className="text-3xl font-bold mb-6">สรุปการสั่งซื้อและชำระเงิน</h1>
        
        {/* ส่วนแสดงข้อมูลตั๋วที่จองมา */}
        <div className="bg-neutral-900 p-6 rounded-xl border border-white/10 mb-8 space-y-3">
          <div className="flex justify-between text-gray-300">
            <span>โซนที่เลือก:</span>
            <span className="text-white font-bold">{bookingData.zoneName}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>จำนวนบัตร:</span>
            <span className="text-white font-bold">{bookingData.ticketCount} ใบ</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>ราคาต่อใบ:</span>
            <span className="text-white">฿{bookingData.price.toLocaleString()}</span>
          </div>
          <hr className="border-white/10 my-4" />
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">ยอดชำระสุทธิ:</span>
            <span className="text-3xl font-extrabold text-violet-400">฿{bookingData.totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* ส่วนเลือกวิธีชำระเงิน */}
        <h3 className="text-lg font-bold mb-4">ช่องทางการชำระเงิน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {['promptpay', 'credit_card'].map((method) => (
            <div 
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                paymentMethod === method 
                  ? 'border-violet-500 bg-violet-500/10' 
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === method ? 'border-violet-500' : 'border-gray-500'}`}>
                {paymentMethod === method && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />}
              </div>
              <span className="font-medium">
                {method === 'promptpay' ? 'สแกน QR Code (พร้อมเพย์)' : 'บัตรเครดิต/เดบิต'}
              </span>
            </div>
          ))}
        </div>

        {/* พื้นที่จำลอง QR Code (ถ้าเลือกพร้อมเพย์) */}
        {paymentMethod === 'promptpay' && (
          <div className="flex flex-col items-center justify-center mb-8 p-6 bg-white rounded-xl">
            {/* กล่องดำๆ จำลองเป็น QR Code */}
            <div className="w-48 h-48 bg-neutral-800 mb-4 flex items-center justify-center text-gray-400 text-sm">
              [ จำลองรูปภาพ QR Code ]
            </div>
            <p className="text-black font-bold">สแกนเพื่อจ่ายเงิน</p>
          </div>
        )}

        {/* ปุ่มยืนยัน */}
        <button 
          onClick={handlePayment}
          disabled={isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            isProcessing 
              ? 'bg-neutral-600 text-gray-400 cursor-not-allowed' 
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30'
          }`}
        >
          {isProcessing ? 'กำลังประมวลผลการชำระเงิน...' : 'ยืนยันการชำระเงิน'}
        </button>
      </div>
    </div>
  );
}