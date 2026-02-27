"use client";

import QRCode from "react-qr-code";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeSVG({ value, size = 200, className }: QRCodeSVGProps) {
  if (!value) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">No value</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: "#FFFFFF",
        padding: 8,
      }}
    >
      <QRCode
        value={value}
        size={size - 16}
        level="H"
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}

/**
 * Generate the full URL for a vial QR code.
 * Using a URL makes the QR code directly openable by phone cameras.
 */
export function getVialQRUrl(vialCode: string): string {
  // Use window.location.origin on client, fallback to env var for SSR
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://bean-cellar.vercel.app";

  return `${baseUrl}/vials/code/${encodeURIComponent(vialCode)}`;
}
