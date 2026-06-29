"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
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
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, adminPin, password, confirmPassword }),
    });
    const body = await response.json().catch(() => ({ error: "Unable to reset password" }));
    setLoading(false);

    if (!response.ok) {
      toast.error(body.error || "Unable to reset password");
      return;
    }

    toast.success("Password reset. You can log in now.");
    setComplete(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-panel w-full max-w-md rounded-[2rem] p-8">
        <div className="mb-8 text-center">
          <p className="mb-3 text-6xl leading-none">∞</p>
          <h1 className="bg-gradient-to-br from-[var(--infinity-green)] to-[var(--infinity-lime)] bg-clip-text text-3xl font-black tracking-tight text-transparent">
            Reset Password
          </h1>
          <p className="mt-3 text-sm text-zinc-400">Use the Admin PIN to reset one account password.</p>
        </div>

        {complete ? (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
              Password reset complete for <span className="font-mono">{username}</span>.
            </div>
            <Link href="/login?mode=password" className="inline-flex rounded-2xl bg-[var(--infinity-lime)] px-6 py-3 font-bold text-black">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                placeholder="hiren"
                className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Admin PIN</span>
              <input
                value={adminPin}
                onChange={(event) => setAdminPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                inputMode="numeric"
                maxLength={4}
                className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">New Password</span>
              <div className="flex rounded-2xl border border-white/10 bg-black/40">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3 text-white"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-sm text-zinc-400 hover:text-white">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Confirm Password</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
              Password strength: <span className="font-semibold text-[var(--infinity-lime)]">{strength}</span>
            </div>

            <button disabled={loading} className="w-full rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-60">
              {loading ? "Resetting..." : "Reset Password Once"}
            </button>

            <Link href="/login?mode=password" className="block w-full text-center text-sm text-zinc-400 transition hover:text-white">
              Back to Login
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
