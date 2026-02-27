"use client";

import { QRCodeSVG as QRCodeReact } from "qrcode.react";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * QR Code component that generates scannable QR codes.
 * Uses qrcode.react library for proper QR code generation.
 */
export function QRCodeSVG({ value, size = 200, className }: QRCodeSVGProps) {
  if (!value) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">No QR code</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white p-2 inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <QRCodeReact
        value={value}
        size={size - 16}
        level="H"
        marginSize={1}
      />
    </div>
  );
}

/**
 * Generate the full URL for a vial QR code.
 */
export function getVialQRUrl(vialCode: string): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://bean-cellar.vercel.app";

  return `${baseUrl}/vials/code/${encodeURIComponent(vialCode)}`;
}
