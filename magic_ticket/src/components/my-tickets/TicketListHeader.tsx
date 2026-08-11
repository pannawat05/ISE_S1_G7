export default function TicketListHeader() {
  return (
    <div className="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4 mb-8">
      <div>
        <h1 className="font-serif text-white text-3xl md:text-4xl">
          ตั๋วเข้าชมของฉัน{" "}
          <span className="font-sans text-gray-500 text-2xl md:text-3xl">
            (My Tickets)
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-gray-500 text-sm">
          จัดการตั๋ว ที่นั่ง กิจกรรม และสถานะการชำระเงินทั้งหมดของคุณในที่เดียว
        </p>
      </div>
    </div>
  );
}
