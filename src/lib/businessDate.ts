import { addDays, format, subDays } from "date-fns";

export function getBusinessDate(calendarDate: Date): Date {
  const businessDate = new Date(calendarDate);
  const hour = businessDate.getHours();

  if (hour >= 0 && hour < 6) {
    businessDate.setDate(businessDate.getDate() - 1);
  }

  return new Date(Date.UTC(businessDate.getFullYear(), businessDate.getMonth(), businessDate.getDate()));
}

export function parseBusinessDate(value?: string | null): Date {
  if (!value) return getBusinessDate(new Date());
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function formatBusinessDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function nextBusinessDate(date: Date): Date {
  return addDays(date, 1);
}

export function previousBusinessDate(date: Date): Date {
  return subDays(date, 1);
}

export function isPostMidnightSlot(slot: string) {
  return slot.startsWith("12 AM") || slot.startsWith("1 AM") || slot.startsWith("2 AM") || slot.startsWith("3 AM") || slot.startsWith("4 AM") || slot.startsWith("5 AM");
}
