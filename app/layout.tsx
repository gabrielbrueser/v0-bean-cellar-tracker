import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BottomNav } from "@/components/bottom-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Bean Cellar Tracker",
  description:
    "Track your specialty coffee vials, inventory, and brewing history",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3d2514",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <main className="min-h-screen pb-20">{children}</main>
          <BottomNav />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
