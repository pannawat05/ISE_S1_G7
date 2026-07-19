import { Ticket } from 'lucide-react';


export default function Logo({size = 20} : {size?: number}) {
    return (
        <div
            className="flex flex-col justify-center items-center rounded-xl py-1 pl-1.5 pr-1"
            style={{ background: "var(--logo-color)" }}
        >
            <Ticket size={size} strokeWidth={1.5} color="white" />
        </div>
    );
}

