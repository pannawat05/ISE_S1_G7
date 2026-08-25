import type { RowDataPacket } from "mysql2";

export type UserRole = "admin" | "customer";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password: string;
  f_name: string;
  l_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizerRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface EventTypeRow extends RowDataPacket {
  id: number;
  name: string;
}

export type EventStatus = "pending" | "approved" | "rejected" | "deleted";

export interface EventRow extends RowDataPacket {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  latitude: string;
  longitude: string;
  cover_image: string;
  description: string | null;
  theme: string | null;
  status: EventStatus;
  is_active: boolean;
  start_date: Date;
  end_date: Date;
  organizer_id: number;
  type_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface PublicEvent extends RowDataPacket {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  description: string | null;
  cover_image: string;
  start_date: string;
  end_date: string;
  type_name: string;
  organizer_name: string;
  organizer_logo: string | null;
  latitude: string;
  longitude: string;
  theme: string | null;
}

export interface PublicEventList extends RowDataPacket {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  description: string | null;
  cover_image: string;
  start_date: string;
  end_date: string;
  type_name: string;
  organizer_name: string;
  latitude: string;
  longitude: string;
}

export interface EventImages extends RowDataPacket {
  id: number;
  url: string;
  display_order: number; 
}

export interface ListEvent extends RowDataPacket {
  id: number;
  name: string;
}

export interface CreateEventInput {
  name: string;
  place_name: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;
  cover_image?: string;
  description?: string | null;
  theme?: string | null;
  status?: EventStatus;
  is_active?: boolean;
  start_date: string;
  end_date: string;
  organizer_id: number;
  type_id: number;
}

export interface Total extends RowDataPacket {
  total: number;
}