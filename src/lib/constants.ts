export const Role = {
  VIEWER: "VIEWER",
  SUPERVISOR: "SUPERVISOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const PaymentMode = {
  CASH: "CASH",
  DK_BANK: "DK_BANK",
  HG_BANK: "HG_BANK",
  SPLIT: "SPLIT",
} as const;

export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DELETED: "DELETED",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const EditRequestStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type EditRequestStatus = (typeof EditRequestStatus)[keyof typeof EditRequestStatus];

export const TIME_SLOTS = [
  "6 AM to 7 AM",
  "7 AM to 8 AM",
  "8 AM to 9 AM",
  "9 AM to 10 AM",
  "10 AM to 11 AM",
  "11 AM to 12 PM",
  "12 PM to 1 PM",
  "1 PM to 2 PM",
  "2 PM to 3 PM",
  "3 PM to 4 PM",
  "4 PM to 5 PM",
  "5 PM to 6 PM",
  "6 PM to 7 PM",
  "7 PM to 8 PM",
  "8 PM to 9 PM",
  "9 PM to 10 PM",
  "10 PM to 11 PM",
  "11 PM to 12 AM",
  "12 AM to 1 AM",
  "1 AM to 2 AM",
] as const;

export const TURFS = [
  { number: 1, name: "Turf 1", color: "#22C55E" },
  { number: 2, name: "Turf 2", color: "#3B82F6" },
  { number: 3, name: "Turf 3", color: "#F97316" },
  { number: 4, name: "Turf 4", color: "#A855F7" },
] as const;

export const TURF_COLORS: Record<number, { border: string; bg: string; dot: string; label: string }> = {
  1: { border: "#22C55E", bg: "#052e16", dot: "#22C55E", label: "Turf 1" },
  2: { border: "#3B82F6", bg: "#0c1a3a", dot: "#3B82F6", label: "Turf 2" },
  3: { border: "#F97316", bg: "#2a1200", dot: "#F97316", label: "Turf 3" },
  4: { border: "#A855F7", bg: "#1e0a33", dot: "#A855F7", label: "Turf 4" },
};

export const POST_MIDNIGHT_SLOTS = ["12 AM to 1 AM", "1 AM to 2 AM"] as const;

export const PAYMENT_MODES: PaymentMode[] = [
  PaymentMode.CASH,
  PaymentMode.DK_BANK,
  PaymentMode.HG_BANK,
  PaymentMode.SPLIT,
];

export const PAYMENT_MODE_META: Record<PaymentMode, { label: string; color: string }> = {
  CASH: { label: "Cash", color: "#22C55E" },
  DK_BANK: { label: "DK Bank", color: "#3B82F6" },
  HG_BANK: { label: "HG Bank", color: "#8B5CF6" },
  SPLIT: { label: "Split", color: "#F59E0B" },
};

export const REFERENCE_NAMES = ["Rakesh", "Hiren", "NM", "ND", "DK", "HS"] as const;

export const STATUS_META: Record<BookingStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "#F59E0B" },
  CONFIRMED: { label: "Confirmed", color: "#22C55E" },
  DELETED: { label: "Deleted", color: "#EF4444" },
};

export const ROLE_LABELS: Record<Role, string> = {
  VIEWER: "Viewer",
  SUPERVISOR: "Supervisor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  VIEWER: "/viewer/canvas",
  SUPERVISOR: "/supervisor/canvas",
  ADMIN: "/admin/canvas",
  SUPER_ADMIN: "/superadmin/canvas",
};

export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function getAdvanceBreakdown(booking: {
  advanceAmount: number;
  advancePaymentMode?: string | null;
  paymentMode?: string | null;
  cashPortion?: number | null;
}) {
  const mode = booking.advancePaymentMode || booking.paymentMode || PaymentMode.CASH;
  const advanceAmount = Number(booking.advanceAmount || 0);
  const cashPortion = Number(booking.cashPortion || 0);

  if (mode === PaymentMode.SPLIT) {
    return {
      cash: cashPortion,
      dkBank: 0,
      hgBank: Math.max(advanceAmount - cashPortion, 0),
    };
  }

  return {
    cash: mode === PaymentMode.CASH ? advanceAmount : 0,
    dkBank: mode === PaymentMode.DK_BANK ? advanceAmount : 0,
    hgBank: mode === PaymentMode.HG_BANK ? advanceAmount : 0,
  };
}

export function formatSlotDisplay(slot: string): { from: string; to: string } {
  const [fromPart, toPart] = slot.split(" to ");
  const formatPart = (part: string) => {
    const trimmed = part.trim();
    if (trimmed.includes(":")) return trimmed;
    const [hour, period] = trimmed.split(" ");
    return `${hour}:00 ${period}`;
  };

  return {
    from: formatPart(fromPart || ""),
    to: formatPart(toPart || ""),
  };
}

export function timeRangeToSlot(from: string, to: string): string {
  const clean = (value: string) => value.replace(":00", "").trim();
  return `${clean(from)} to ${clean(to)}`;
}

export function slotToTimeRange(slot: string): { from: string; to: string } {
  return formatSlotDisplay(slot);
}
