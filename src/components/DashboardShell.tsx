import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ROLE_LABELS, type Role } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
};

const navByRole: Record<Role, NavItem[]> = {
  VIEWER: [
    { href: "/viewer/canvas", label: "Canvas" },
  ],
  SUPERVISOR: [
    { href: "/supervisor/canvas", label: "Canvas" },
    { href: "/supervisor/new-booking", label: "New Booking" },
    { href: "/supervisor/my-bookings", label: "My Bookings" },
    { href: "/supervisor/my-cash", label: "My Cash" },
  ],
  ADMIN: [
    { href: "/admin/canvas", label: "Canvas" },
    { href: "/admin/new-booking", label: "New Booking" },
    { href: "/admin/bookings", label: "All Bookings" },
    { href: "/admin/verify", label: "Verify" },
    { href: "/admin/settlements", label: "Cash" },
    { href: "/admin/edit-requests", label: "Edit Requests" },
  ],
  SUPER_ADMIN: [
    { href: "/superadmin/canvas", label: "Canvas" },
    { href: "/superadmin/new-booking", label: "New Booking" },
    { href: "/superadmin/bookings", label: "Bookings" },
    { href: "/superadmin/edit-requests", label: "Edit Requests" },
    { href: "/superadmin/cash-overview", label: "Cash Overview" },
    { href: "/superadmin/analytics", label: "Analytics" },
    { href: "/superadmin/export", label: "Export" },
    { href: "/superadmin/users", label: "Users" },
    { href: "/superadmin/settings", label: "Settings" },
    { href: "/superadmin/system", label: "⚙️ System" },
    { href: "/superadmin/audit", label: "Audit" },
  ],
};

export function DashboardShell({
  role,
  displayName,
  children,
}: {
  role: Role;
  displayName: string;
  children: React.ReactNode;
}) {
  const items = navByRole[role];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href={items[0].href} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--infinity-green)] to-[var(--infinity-lime)] text-2xl font-black text-black">
              ∞
            </span>
            <div>
              <p className="text-lg font-black tracking-tight text-white">Infinity Box</p>
              <p className="text-xs text-zinc-500">{ROLE_LABELS[role]} · {displayName}</p>
            </div>
          </Link>
          <SignOutButton />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300 transition hover:border-[var(--infinity-lime)] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--infinity-lime)]">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
