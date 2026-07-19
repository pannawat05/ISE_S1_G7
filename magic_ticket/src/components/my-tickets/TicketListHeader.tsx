export default function TicketListHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-serif text-white">
          ตั๋วเข้าชมของฉัน{" "}
          <span className="text-gray-500 font-sans text-2xl md:text-3xl">
            (My Tickets)
          </span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-xl">
          จัดการตั๋ว ที่นั่ง กิจกรรม และสถานะการชำระเงินทั้งหมดของคุณในที่เดียว
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-white/20 bg-transparent accent-purple-500"
        />
        รับใบเสร็จรับเงิน
      </label>
    </div>
  );
}
