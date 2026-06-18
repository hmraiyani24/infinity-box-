"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type SystemUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

type BackupStatus = {
  lastBackup: string | null;
  latestFilename: string | null;
  count: number;
  totalSizeMb: number;
};

export function SystemPanel({ users }: { users: SystemUser[] }) {
  const [openSection, setOpenSection] = useState<"passwords" | "pin" | "backups">("passwords");
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  async function loadBackupStatus() {
    const response = await fetch("/api/system/backup-status");
    if (!response.ok) return;
    setBackupStatus(await response.json());
  }

  useEffect(() => {
    loadBackupStatus();
  }, []);

  async function backupNow() {
    const response = await fetch("/api/system/backup-now", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error || "Unable to save backup");
      return;
    }
    toast.success("Backup saved.");
    loadBackupStatus();
  }

  return (
    <div className="space-y-5">
      <Accordion title="Change Passwords" open={openSection === "passwords"} onClick={() => setOpenSection("passwords")}>
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => <PasswordCard key={user.id} user={user} />)}
        </div>
      </Accordion>

      <Accordion title="Change Admin PIN" open={openSection === "pin"} onClick={() => setOpenSection("pin")}>
        <PinForm />
      </Accordion>

      <Accordion title="💾 Database Backups" open={openSection === "backups"} onClick={() => setOpenSection("backups")}>
        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard label="Last Backup" value={backupStatus?.lastBackup ? new Date(backupStatus.lastBackup).toLocaleString("en-IN") : "No backups yet"} />
          <InfoCard label="Backup Count" value={`${backupStatus?.count ?? 0} files saved`} />
          <InfoCard label="Backup Folder" value="prisma/backups/" />
          <InfoCard label="Space Used" value={`~${backupStatus?.totalSizeMb ?? 0} MB`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/api/system/download-backup" className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-zinc-200 hover:border-[var(--infinity-lime)]">
            📥 Download Latest Backup
          </a>
          <button onClick={backupNow} className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black">
            🔄 Back Up Now
          </button>
        </div>
      </Accordion>
    </div>
  );
}

function Accordion({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-[2rem]">
      <button onClick={onClick} className="flex w-full items-center justify-between px-6 py-5 text-left text-xl font-black text-white">
        {title}
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-white/10 p-6">{children}</div> : null}
    </section>
  );
}

function PasswordCard({ user }: { user: SystemUser }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  async function save() {
    if (values.newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
    if (values.newPassword !== values.confirmPassword) return toast.error("New passwords do not match.");
    setLoading(true);
    const response = await fetch("/api/system/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, currentPassword: values.currentPassword, newPassword: values.newPassword }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return toast.error(body.error || "Unable to change password");
    toast.success("Password updated.");
    setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setEditing(false);
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{accountLabel(user)}</h3>
          <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-zinc-300">{user.username}</span>
        </div>
        {!editing ? <button onClick={() => setEditing(true)} className="rounded-full bg-white/10 px-4 py-2 text-sm text-zinc-200">Change Password</button> : null}
      </div>
      {editing ? (
        <div className="mt-5 grid gap-3">
          <PasswordInput label="Current Password" value={values.currentPassword} onChange={(value) => setValues((prev) => ({ ...prev, currentPassword: value }))} />
          <PasswordInput label="New Password" value={values.newPassword} onChange={(value) => setValues((prev) => ({ ...prev, newPassword: value }))} />
          <PasswordInput label="Confirm New" value={values.confirmPassword} onChange={(value) => setValues((prev) => ({ ...prev, confirmPassword: value }))} />
          <div className="flex gap-2">
            <button onClick={save} disabled={loading} className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-2 font-bold text-black disabled:opacity-60">{loading ? "Saving..." : "Save"}</button>
            <button onClick={() => setEditing(false)} className="rounded-2xl border border-white/10 px-5 py-2 text-zinc-300">Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PinForm() {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ currentPin: "", newPin: "", confirmPin: "" });

  async function save() {
    if (!/^\d{4}$/.test(values.newPin)) return toast.error("New PIN must be exactly 4 digits.");
    if (values.newPin !== values.confirmPin) return toast.error("PIN confirmation does not match.");
    setLoading(true);
    const response = await fetch("/api/system/change-pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: values.currentPin, newPin: values.newPin }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return toast.error(body.error || "Unable to update PIN");
    toast.success("PIN updated.");
    setValues({ currentPin: "", newPin: "", confirmPin: "" });
  }

  return (
    <div className="grid max-w-md gap-4">
      <PinInput label="Current PIN" value={values.currentPin} onChange={(value) => setValues((prev) => ({ ...prev, currentPin: value }))} />
      <PinInput label="New PIN" value={values.newPin} onChange={(value) => setValues((prev) => ({ ...prev, newPin: value }))} />
      <PinInput label="Confirm PIN" value={values.confirmPin} onChange={(value) => setValues((prev) => ({ ...prev, confirmPin: value }))} />
      <button onClick={save} disabled={loading} className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black disabled:opacity-60">
        {loading ? "Updating..." : "Update PIN"}
      </button>
    </div>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      <input type="password" value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white" />
    </label>
  );
}

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-white" />
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function accountLabel(user: SystemUser) {
  if (user.username === "superadmin") return "⭐ Super Admin";
  if (user.username === "admin") return "🔐 Admin";
  return `👤 ${user.displayName}`;
}
