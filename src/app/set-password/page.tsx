import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/app/set-password/SetPasswordForm";
import { authOptions } from "@/lib/auth";
import { dashboardForRole } from "@/lib/permissions";

export default async function SetPasswordPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (!session.user.needsPasswordSetup) redirect(dashboardForRole(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-panel w-full max-w-md rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--infinity-lime)]">Account Setup</p>
        <h1 className="mt-3 text-3xl font-black text-white">Welcome, {session.user.name || session.user.username}</h1>
        <p className="mb-8 mt-3 text-sm text-zinc-400">Set your password to complete your account setup.</p>
        <SetPasswordForm role={session.user.role} username={session.user.username} />
      </section>
    </main>
  );
}
