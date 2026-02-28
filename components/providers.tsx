"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CellarProvider } from "@/lib/cellar-context";

function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  
  // Only wrap with CellarProvider when authenticated
  if (status === "authenticated") {
    return <CellarProvider>{children}</CellarProvider>;
  }
  
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthenticatedProviders>
          {children}
        </AuthenticatedProviders>
        <Toaster position="top-center" richColors closeButton />
      </ThemeProvider>
    </SessionProvider>
  );
}
