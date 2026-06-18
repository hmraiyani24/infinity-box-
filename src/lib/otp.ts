import bcrypt from "bcryptjs";
import crypto from "crypto";

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function getOtpExpiry() {
  const date = new Date();
  date.setHours(date.getHours() + 72);
  return date;
}

export function hashSecret(value: string) {
  return bcrypt.hash(value, 10);
}

export function compareSecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}
