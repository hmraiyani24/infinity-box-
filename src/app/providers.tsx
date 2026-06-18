"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#141414",
            border: "1px solid #2A2A2A",
            color: "#F5F5F5",
          },
        }}
      />
    </SessionProvider>
  );
}
