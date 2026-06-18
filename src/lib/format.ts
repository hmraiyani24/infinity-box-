export function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(0, 15);
}

export function shortPhone(phone: string) {
  const clean = normalizePhone(phone);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}...`;
}

export function formatPhone(phone: string) {
  const clean = normalizePhone(phone);
  return clean.length === 10 ? `${clean.slice(0, 5)} ${clean.slice(5)}` : clean;
}

export function titlePaymentMode(value: string) {
  return value.replace("_", " ");
}
