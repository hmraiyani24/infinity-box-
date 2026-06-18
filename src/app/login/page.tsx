import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { authOptions } from "@/lib/auth";
import { dashboardForRole } from "@/lib/permissions";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user && !session.user.needsPasswordSetup) {
    redirect(dashboardForRole(session.user.role));
  }

  if (session?.user?.needsPasswordSetup) {
    redirect("/set-password");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-panel w-full max-w-md rounded-[2rem] p-8">
        <div className="mb-8 text-center">
          <p className="mb-3 text-6xl leading-none">∞</p>
          <h1 className="bg-gradient-to-br from-[var(--infinity-green)] to-[var(--infinity-lime)] bg-clip-text text-4xl font-black tracking-tight text-transparent">
            INFINITY BOX
          </h1>
          <p className="mt-3 text-sm text-zinc-400">Booking, cash, and finance operations</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
