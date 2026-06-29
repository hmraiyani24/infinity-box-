import type { Role } from "@/lib/constants";

export function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role?: string | null) {
  return role === "SUPER_ADMIN";
}

export function canAccessRoute(role: Role, path: string) {
  if (path.startsWith("/superadmin")) return role === "SUPER_ADMIN";
  if (path.startsWith("/admin")) return role === "ADMIN" || role === "SUPER_ADMIN";
  if (path.startsWith("/supervisor")) return role === "SUPERVISOR" || role === "ADMIN" || role === "SUPER_ADMIN";
  if (path.startsWith("/viewer")) return role === "VIEWER" || role === "SUPERVISOR" || role === "ADMIN" || role === "SUPER_ADMIN";
  return true;
}

export function dashboardForRole(role: string) {
  if (role === "SUPER_ADMIN") return "/superadmin/canvas";
  if (role === "ADMIN") return "/admin/canvas";
  if (role === "VIEWER") return "/viewer/canvas";
  return "/supervisor/canvas";
}
