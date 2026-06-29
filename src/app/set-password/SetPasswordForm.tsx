"use client";

import { useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const dashboardByRole: Record<string, string> = {
  VIEWER: "/viewer/canvas",
  SUPERVISOR: "/supervisor/canvas",
  ADMIN: "/admin/canvas",
  SUPER_ADMIN: "/superadmin/canvas",
};

export function SetPasswordForm({ role, username }: { role: string; username: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score <= 1 ? "Weak" : score === 2 ? "Medium" : "Strong";
  }, [password]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    setLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Unable to set password" }));
      toast.error(body.error || "Unable to set password");
      return;
    }

    toast.success("Account activated");
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    await update();
    router.push(dashboardByRole[role] ?? "/supervisor/canvas");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">New Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          type="password"
          className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-300">Confirm Password</span>
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          type="password"
          className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
        />
      </label>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
        Password strength: <span className="font-semibold text-[var(--infinity-lime)]">{strength}</span>
      </div>
      <button
        disabled={loading}
        className="w-full rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Activating..." : "Activate Account"}
      </button>
    </form>
  );
}
