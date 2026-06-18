"use client";

export function SignOutButton() {
  return (
    <button
      onClick={() => {
        window.location.href = "/api/logout";
      }}
      className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-400/50 hover:text-red-200"
    >
      Logout
    </button>
  );
}
