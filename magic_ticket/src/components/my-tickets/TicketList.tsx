import { myTickets } from "@/data/tickets";
import TicketCard from "./TicketCard";

export default function TicketList() {
  return (
    <div className="space-y-4">
      {myTickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
