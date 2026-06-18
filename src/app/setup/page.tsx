"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type SupervisorKey = "rakesh" | "hiren" | "nikunj" | "hardik";

const supervisors: Array<{ username: SupervisorKey; name: string }> = [
  { username: "rakesh", name: "Rakesh" },
  { username: "hiren", name: "Hiren" },
  { username: "nikunj", name: "Nikunj" },
  { username: "hardik", name: "Hardik" },
];

const initialSupervisorPasswords = supervisors.reduce(
  (values, supervisor) => ({
    ...values,
    [supervisor.username]: { password: "", confirm: "", show: false },
  }),
  {} as Record<SupervisorKey, { password: string; confirm: string; show: boolean }>,
);

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState({
    superAdminPassword: "",
    superAdminConfirm: "",
    superAdminShow: false,
    adminPassword: "",
    adminConfirm: "",
    adminShow: false,
    adminPin: "",
    adminPinConfirm: "",
  });
  const [supervisorPasswords, setSupervisorPasswords] = useState(initialSupervisorPasswords);

  const payload = useMemo(
    () => ({
      superAdminPassword: credentials.superAdminPassword,
      adminPassword: credentials.adminPassword,
      adminPin: credentials.adminPin,
      supervisorPasswords: Object.fromEntries(
        supervisors.map((supervisor) => [supervisor.username, supervisorPasswords[supervisor.username].password]),
      ),
    }),
    [credentials.adminPassword, credentials.adminPin, credentials.superAdminPassword, supervisorPasswords],
  );

  function strength(password: string) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score <= 1 ? "Weak" : score === 2 ? "Medium" : "Strong";
  }

  function validateAdminStep() {
    const nextErrors: Record<string, string> = {};
    if (credentials.superAdminPassword.length < 8) nextErrors.superAdminPassword = "Super Admin password must be at least 8 characters.";
    if (credentials.superAdminPassword !== credentials.superAdminConfirm) nextErrors.superAdminConfirm = "Super Admin passwords do not match.";
    if (credentials.adminPassword.length < 8) nextErrors.adminPassword = "Admin password must be at least 8 characters.";
    if (credentials.adminPassword !== credentials.adminConfirm) nextErrors.adminConfirm = "Admin passwords do not match.";
    if (!/^\d{4}$/.test(credentials.adminPin)) nextErrors.adminPin = "PIN must be exactly 4 digits.";
    if (credentials.adminPin !== credentials.adminPinConfirm) nextErrors.adminPinConfirm = "PIN confirmation does not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateSupervisorStep() {
    const nextErrors: Record<string, string> = {};
    for (const supervisor of supervisors) {
      const values = supervisorPasswords[supervisor.username];
      if (values.password.length < 8) nextErrors[`${supervisor.username}Password`] = `${supervisor.name}'s password must be at least 8 characters.`;
      if (values.password !== values.confirm) nextErrors[`${supervisor.username}Confirm`] = `${supervisor.name}'s passwords do not match.`;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function activate() {
    setLoading(true);
    setErrors({});
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      if (body.errors) setErrors(body.errors);
      toast.error(body.error || "Unable to complete setup");
      return;
    }

    setCompleted(true);
  }

  return (
    <main className="min-h-screen bg-[var(--infinity-dark)] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
        <Progress step={completed ? 4 : step} />
        {completed ? (
          <section className="glass-panel mx-auto w-full max-w-xl rounded-[2rem] p-8 text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[var(--infinity-lime)] text-5xl text-black">✓</div>
            <h1 className="mt-6 text-4xl font-black">Infinity Box is ready!</h1>
            <p className="mt-3 text-zinc-400">Log in with your Super Admin account to get started.</p>
            <Link href="/login?mode=password" className="mt-8 inline-flex rounded-2xl bg-[var(--infinity-lime)] px-6 py-3 font-bold text-black">
              Go to Login →
            </Link>
          </section>
        ) : null}

        {!completed && step === 1 ? (
          <section className="glass-panel mx-auto w-full max-w-xl rounded-[2rem] p-8 text-center">
            <div className="text-6xl">∞</div>
            <h1 className="mt-4 text-4xl font-black">INFINITY BOX</h1>
            <p className="mt-5 text-xl font-semibold">Welcome! Let&apos;s get your system ready.</p>
            <p className="mt-2 text-zinc-400">This takes about 2 minutes. You only do this once.</p>
            <div className="mt-8 grid gap-3 text-left text-zinc-300">
              {["Super Admin password", "Admin password & security PIN", "Supervisor login passwords", "System is secured and ready"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">✦ {item}</div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="mt-8 w-full rounded-2xl bg-[var(--infinity-lime)] px-6 py-4 text-lg font-black text-black">
              Let&apos;s Start →
            </button>
          </section>
        ) : null}

        {!completed && step === 2 ? (
          <section className="glass-panel rounded-[2rem] p-6 md:p-8">
            <Header title="Step 1 of 3 — Admin Passwords" text="These are the two most powerful accounts. Keep these passwords safe — write them down somewhere secure." />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <PasswordCard
                title="⭐ Super Admin Account"
                username="superadmin"
                password={credentials.superAdminPassword}
                confirm={credentials.superAdminConfirm}
                show={credentials.superAdminShow}
                strength={strength(credentials.superAdminPassword)}
                errors={{ password: errors.superAdminPassword, confirm: errors.superAdminConfirm }}
                onChange={(field, value) => setCredentials((prev) => ({ ...prev, [field === "password" ? "superAdminPassword" : "superAdminConfirm"]: value }))}
                onToggleShow={() => setCredentials((prev) => ({ ...prev, superAdminShow: !prev.superAdminShow }))}
              />
              <PasswordCard
                title="🔐 Admin Account"
                username="admin"
                password={credentials.adminPassword}
                confirm={credentials.adminConfirm}
                show={credentials.adminShow}
                strength={strength(credentials.adminPassword)}
                errors={{ password: errors.adminPassword, confirm: errors.adminConfirm }}
                onChange={(field, value) => setCredentials((prev) => ({ ...prev, [field === "password" ? "adminPassword" : "adminConfirm"]: value }))}
                onToggleShow={() => setCredentials((prev) => ({ ...prev, adminShow: !prev.adminShow }))}
              />
            </div>
            <div className="mt-5 rounded-[2rem] border border-white/10 bg-black/30 p-5">
              <h2 className="text-lg font-black">🔑 Admin Security PIN</h2>
              <p className="mt-2 text-sm text-zinc-400">This PIN is required when deleting a booking or clearing a supervisor&apos;s cash. It is separate from the Admin password.</p>
              <PinInput label="PIN" value={credentials.adminPin} onChange={(value) => setCredentials((prev) => ({ ...prev, adminPin: value }))} error={errors.adminPin} />
              <PinInput label="Confirm PIN" value={credentials.adminPinConfirm} onChange={(value) => setCredentials((prev) => ({ ...prev, adminPinConfirm: value }))} error={errors.adminPinConfirm} />
            </div>
            <Footer onNext={() => validateAdminStep() && setStep(3)} />
          </section>
        ) : null}

        {!completed && step === 3 ? (
          <section className="glass-panel rounded-[2rem] p-6 md:p-8">
            <Header title="Step 2 of 3 — Supervisor Passwords" text="Each supervisor gets their own login. Share each password only with that person." />
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {supervisors.map((supervisor) => {
                const values = supervisorPasswords[supervisor.username];
                return (
                  <PasswordCard
                    key={supervisor.username}
                    title={`👤 ${supervisor.name}`}
                    username={supervisor.username}
                    password={values.password}
                    confirm={values.confirm}
                    show={values.show}
                    errors={{ password: errors[`${supervisor.username}Password`], confirm: errors[`${supervisor.username}Confirm`] }}
                    onChange={(field, value) =>
                      setSupervisorPasswords((prev) => ({
                        ...prev,
                        [supervisor.username]: { ...prev[supervisor.username], [field]: value },
                      }))
                    }
                    onToggleShow={() =>
                      setSupervisorPasswords((prev) => ({
                        ...prev,
                        [supervisor.username]: { ...prev[supervisor.username], show: !prev[supervisor.username].show },
                      }))
                    }
                  />
                );
              })}
            </div>
            <Footer onBack={() => setStep(2)} onNext={() => validateSupervisorStep() && setStep(4)} />
          </section>
        ) : null}

        {!completed && step === 4 ? (
          <section className="glass-panel rounded-[2rem] p-6 md:p-8">
            <Header title="Step 3 of 3 — Confirm Setup" text="Review your choices then click Activate. You can change any of these later from Settings." />
            <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10">
              {[
                ["⭐ Super Admin", "superadmin", credentials.superAdminPassword],
                ["🔐 Admin", "admin", credentials.adminPassword],
                ["🔑 Admin PIN", "—", credentials.adminPin],
                ...supervisors.map((supervisor) => [`👤 ${supervisor.name}`, supervisor.username, supervisorPasswords[supervisor.username].password]),
              ].map(([account, username, password]) => (
                <div key={`${account}-${username}`} className="grid grid-cols-3 gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-b-0">
                  <span className="font-semibold text-white">{account}</span>
                  <span className="text-zinc-400">{username}</span>
                  <span className="font-mono text-zinc-300">{"•".repeat(String(password).length)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              ⚠️ After clicking Activate, write down all passwords. There is no &apos;forgot password&apos; for admins.
            </div>
            <Footer
              onBack={() => setStep(3)}
              nextLabel={loading ? "Setting up your system..." : "🚀 Activate Infinity Box"}
              onNext={activate}
              nextDisabled={loading}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mx-auto mb-8 flex gap-3">
      {[1, 2, 3, 4].map((item) => (
        <span key={item} className={`h-3 w-3 rounded-full ${item <= step ? "bg-[var(--infinity-lime)]" : "bg-white/20"}`} />
      ))}
    </div>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function PasswordCard({
  title,
  username,
  password,
  confirm,
  show,
  strength,
  errors,
  onChange,
  onToggleShow,
}: {
  title: string;
  username: string;
  password: string;
  confirm: string;
  show: boolean;
  strength?: string;
  errors?: { password?: string; confirm?: string };
  onChange: (field: "password" | "confirm", value: string) => void;
  onToggleShow: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">{title}</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-zinc-300">{username}</span>
      </div>
      <PasswordField label="New Password" value={password} show={show} onChange={(value) => onChange("password", value)} onToggleShow={onToggleShow} error={errors?.password} />
      <PasswordField label="Confirm Password" value={confirm} show={show} onChange={(value) => onChange("confirm", value)} onToggleShow={onToggleShow} error={errors?.confirm} />
      {strength ? (
        <div className="mt-3 text-xs text-zinc-400">
          Strength: <span className="font-bold text-[var(--infinity-lime)]">{strength}</span>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div className={`h-2 rounded-full bg-[var(--infinity-lime)] ${strength === "Strong" ? "w-full" : strength === "Medium" ? "w-2/3" : "w-1/3"}`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PasswordField({ label, value, show, error, onChange, onToggleShow }: { label: string; value: string; show: boolean; error?: string; onChange: (value: string) => void; onToggleShow: () => void }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      <div className="flex rounded-2xl border border-white/10 bg-black/40">
        <input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3 text-white" />
        <button type="button" onClick={onToggleShow} className="px-4 text-sm text-zinc-400 hover:text-white">{show ? "Hide" : "Show"}</button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </label>
  );
}

function PinInput({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        className="focus-ring w-full max-w-48 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white"
      />
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </label>
  );
}

function Footer({ onBack, onNext, nextLabel = "Next →", nextDisabled = false }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap justify-end gap-3">
      {onBack ? <button onClick={onBack} className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-300">← Back</button> : null}
      <button onClick={onNext} disabled={nextDisabled} className="rounded-2xl bg-[var(--infinity-lime)] px-6 py-3 font-black text-black disabled:opacity-60">{nextLabel}</button>
    </div>
  );
}
