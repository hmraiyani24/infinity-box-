import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/viewer/canvas" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--infinity-green)] to-[var(--infinity-lime)] text-2xl font-black text-black">∞</span>
            <div>
              <p className="text-lg font-black tracking-tight text-white">Infinity Box</p>
              <p className="text-xs text-zinc-500">Viewer: {session.user.name}</p>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
