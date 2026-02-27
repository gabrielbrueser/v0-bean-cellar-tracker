"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeSVG({ value, size = 200, className }: QRCodeSVGProps) {
  const [svgString, setSvgString] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setError("No value provided");
      return;
    }

    QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "H", // High error correction for reliability
      margin: 4, // Quiet zone - critical for scanning
      width: size,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((svg) => {
        setSvgString(svg);
        setError(null);
      })
      .catch((err) => {
        console.error("QR generation error:", err);
        setError("Failed to generate QR code");
      });
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">{error}</span>
      </div>
    );
  }

  if (!svgString) {
    return (
      <div
        className={`flex items-center justify-center bg-white ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">Loading...</span>
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
      }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
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
