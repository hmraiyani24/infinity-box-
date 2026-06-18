"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function EditRequestControls({ id }: { id: string }) {
  const router = useRouter();

  async function approve() {
    const response = await fetch(`/api/edit-requests/${id}/approve`, { method: "PATCH" });
    if (!response.ok) return toast.error("Unable to approve request");
    toast.success("Edit approved");
    router.refresh();
  }

  async function reject() {
    const reason = window.prompt("Reason for rejection");
    if (!reason) return;
    const response = await fetch(`/api/edit-requests/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) return toast.error("Unable to reject request");
    toast.success("Edit rejected");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button onClick={reject} className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-semibold text-red-200">Reject</button>
      <button onClick={approve} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Approve</button>
    </div>
  );
}

export function VerifyBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();

  async function verify() {
    const response = await fetch(`/api/bookings/${bookingId}/verify`, { method: "PATCH" });
    if (!response.ok) return toast.error("Unable to confirm booking");
    toast.success("Confirmed");
    router.refresh();
  }

  return <button onClick={verify} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Confirm</button>;
}

export function CashSettleButton({ supervisorId }: { supervisorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Array<{ id: string; cashAmount: number; businessDate: string; booking: { customerName: string; timeSlot: string } }>>([]);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function openModal() {
    const response = await fetch(`/api/cash/ledger?supervisorId=${supervisorId}`);
    const body = await response.json().catch(() => ({ entries: [] }));
    const unsettled = (body.entries || []).filter((entry: { isSettled?: boolean }) => !entry.isSettled);
    setEntries(unsettled);
    setOpen(true);
  }

  async function settle() {
    setLoading(true);
    const response = await fetch("/api/cash/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supervisorId, pin }),
    });
    setLoading(false);
    if (!response.ok) return toast.error("Unable to settle cash");
    toast.success("Cash settled");
    setOpen(false);
    router.refresh();
  }

  const total = entries.reduce((sum, entry) => sum + entry.cashAmount, 0);

  return (
    <>
      <button onClick={openModal} className="rounded-full bg-[var(--infinity-lime)] px-3 py-1 text-xs font-bold text-black">Clear Cash</button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-white">Cash Clearance</h2>
              <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300">Close</button>
            </div>
            <div className="mt-5 max-h-64 space-y-2 overflow-auto">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
                  {new Date(entry.businessDate).toLocaleDateString("en-IN")} · {entry.booking.customerName} · Rs {entry.cashAmount.toLocaleString("en-IN")}
                  <p className="text-xs text-zinc-500">{entry.booking.timeSlot}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-2xl font-black text-white">Total: Rs {total.toLocaleString("en-IN")}</p>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter Admin PIN"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            />
            <button onClick={settle} disabled={loading || !pin} className="mt-4 w-full rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black disabled:opacity-60">
              {loading ? "Clearing..." : "Confirm & Zero Cash"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function UserCreateForm() {
  const router = useRouter();
  const [otp, setOtp] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: String(form.get("displayName")),
        username: String(form.get("username")),
        role: String(form.get("role")),
      }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error || "Unable to create user");
    setOtp(body.otp);
    toast.success("User created");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel mb-6 grid gap-4 rounded-[2rem] p-5 md:grid-cols-4">
      <input name="displayName" required placeholder="Display name" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white" />
      <input name="username" required placeholder="username" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white" />
      <select name="role" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white">
        <option value="SUPERVISOR">Supervisor</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button className="rounded-2xl bg-[var(--infinity-lime)] px-4 py-3 font-bold text-black">Create User</button>
      {otp ? <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 md:col-span-4">One-time login code: <span className="font-mono text-2xl font-black">{otp}</span>. Show it now; it will not be displayed again.</p> : null}
    </form>
  );
}

export function RegenOtpButton({ userId }: { userId: string }) {
  const [otp, setOtp] = useState("");

  async function regenerate() {
    const response = await fetch(`/api/users/${userId}/generate-otp`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(body.error || "Unable to regenerate code");
    setOtp(body.otp);
    toast.success("New login code generated");
  }

  return (
    <div className="space-y-2">
      <button onClick={regenerate} className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
        Regen Code
      </button>
      {otp ? <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 font-mono text-lg font-black text-amber-100">{otp}</p> : null}
    </div>
  );
}
