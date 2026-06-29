import type { TIME_SLOTS } from "@/lib/constants";

export type Role = "VIEWER" | "SUPERVISOR" | "ADMIN" | "SUPER_ADMIN";
export type PaymentMode = "CASH" | "DK_BANK" | "HG_BANK" | "SPLIT";
export type BookingStatus = "PENDING" | "CONFIRMED" | "DELETED";
export type EditRequestStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type TimeSlot = (typeof TIME_SLOTS)[number];

export interface BookingRow {
  id: string;
  businessDate: string;
  turfNumber: number;
  timeSlot: string;
  timeOverride: string | null;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  advancePaymentMode: string;
  paymentMode?: string;
  cashPortion: number | null;
  cashAmount: number;
  referenceName: string | null;
  staffName: string;
  notes: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  verifiedAt: string | null;
  verifiedBy?: { displayName: string } | null;
  createdBy?: { displayName: string; role?: string } | null;
  lastEditedByName?: string | null;
  lastEditedAt?: string | null;
  editRequests?: { id: string }[];
}

export interface NewBookingPayload {
  businessDate: string;
  turfNumber: number;
  timeSlot: string;
  timeOverride?: string;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  advancePaymentMode: PaymentMode;
  cashPortion?: number | null;
  referenceName?: string | null;
  notes?: string;
}
