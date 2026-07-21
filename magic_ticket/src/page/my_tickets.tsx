import { TicketListHeader, TicketList } from "@/components/my-tickets";

export default function MyTickets() {
  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <TicketListHeader />
        <TicketList />
      </div>
    </div>
  );
}
