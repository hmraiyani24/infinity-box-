"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Role } from "@/lib/constants";

export function BookingActions({
  bookingId,
  role,
  ownsBooking,
  hasPendingEdit,
  bookingStatus,
  onDirectEdit,
}: {
  bookingId: string;
  role: Role;
  ownsBooking: boolean;
  hasPendingEdit: boolean;
  bookingStatus?: string;
  onDirectEdit?: () => void;
}) {
  const router = useRouter();

  async function verify() {
    const response = await fetch(`/api/bookings/${bookingId}/verify`, { method: "PATCH" });
    if (!response.ok) return toast.error("Unable to verify booking");
    toast.success("Confirmed");
    router.refresh();
  }

  async function remove() {
    const pin = window.prompt("Enter admin PIN to delete this booking");
    if (!pin) return;
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, reason: "Deleted from canvas" }),
    });
    if (!response.ok) return toast.error("Delete failed. Check PIN.");
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {(role === "ADMIN" || role === "SUPER_ADMIN") ? (
        <>
          {bookingStatus === "PENDING" ? (
            <button onClick={verify} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/25">
              Verify
            </button>
          ) : null}
          <button onClick={remove} className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-400/25">
            Delete
          </button>
        </>
      ) : null}
      {role === "SUPER_ADMIN" ? (
        <button type="button" onClick={onDirectEdit} className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-400/25">
          Edit
        </button>
      ) : null}
      {role === "SUPERVISOR" && ownsBooking ? (
        <Link
          aria-disabled={hasPendingEdit}
          href={hasPendingEdit ? "#" : `/supervisor/my-bookings?edit=${bookingId}`}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${hasPendingEdit ? "cursor-not-allowed bg-zinc-500/15 text-zinc-500" : "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"}`}
        >
          {hasPendingEdit ? "Edit Pending" : "Request Edit"}
        </Link>
      ) : null}
    </div>
  );
}
