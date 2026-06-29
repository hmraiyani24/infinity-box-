"use client";

import { useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const dashboardByRole: Record<string, string> = {
  VIEWER: "/viewer/canvas",
  SUPERVISOR: "/supervisor/canvas",
  ADMIN: "/admin/canvas",
  SUPER_ADMIN: "/superadmin/canvas",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: "otp" | "password" = searchParams.get("mode") === "password" ? "password" : "otp";
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      username,
      ...(mode === "otp" ? { otp: otpValue } : { password }),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      const message = result.error === "OTP_EXPIRED"
        ? "Login code has expired. Contact your Super Admin."
        : mode === "otp"
          ? "Invalid or expired login code."
          : "Invalid username or password.";
      setError(message);
      toast.error(message);
      return;
    }

    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json();

    if (session?.user?.needsPasswordSetup) {
      router.push("/set-password");
      router.refresh();
      return;
    }

    router.push(dashboardByRole[session?.user?.role] ?? "/supervisor/canvas");
    router.refresh();
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function pasteOtp(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = ["", "", "", "", "", ""];
    digits.forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Username</label>
        <input
          name="username"
          required
          autoComplete="username"
          className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-600"
          placeholder="superadmin"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">{mode === "otp" ? "Login Code" : "Password"}</label>
        {mode === "otp" ? (
          <div className="grid grid-cols-6 gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  otpRefs.current[index] = node;
                }}
                value={digit}
                onChange={(event) => updateOtp(index, event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  pasteOtp(event.clipboardData.getData("text"));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
                }}
                inputMode="numeric"
                maxLength={1}
                className="focus-ring h-14 rounded-2xl border border-white/10 bg-black/40 text-center text-xl font-bold text-white"
              />
            ))}
          </div>
        ) : (
          <div className="flex rounded-2xl border border-white/10 bg-black/40">
            <input
              name="password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3 text-white placeholder:text-zinc-600"
              placeholder="Enter password"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-sm text-zinc-400 hover:text-white">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        )}
      </div>

      {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-r from-[var(--infinity-green)] to-[var(--infinity-lime)] px-5 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Checking..." : mode === "otp" ? "Continue" : "Login"}
      </button>

      <a
        href={mode === "otp" ? "/login?mode=password" : "/login"}
        onClick={() => setError("")}
        className="block w-full text-center text-sm text-zinc-400 transition hover:text-white"
      >
        {mode === "otp" ? "Have a password? Sign in" : "First time? Use your login code"}
      </a>
    </form>
  );
}
