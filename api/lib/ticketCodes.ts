import { v4 as uuidv4 } from "uuid";

export function createTicketQrCode(): string {
  return `MT-${uuidv4()}`;
}
