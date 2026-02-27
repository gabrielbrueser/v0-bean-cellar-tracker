"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Loader2, Keyboard } from "lucide-react";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<import("@zxing/browser").BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<import("@zxing/browser").IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setScanning(false);
  }, []);

  const parseQRValue = useCallback((rawValue: string): string | null => {
    // Accept multiple QR payload formats:
    // 1. bc:ESP-001 or bc:FLT-001 (original format)
    // 2. vial:ESP-001 (alternative prefix)
    // 3. Full URL like https://.../vials/ESP-001 or /vials/code/ESP-001
    // 4. Plain code like ESP-001 or FLT-001

    const value = rawValue.trim();

    // Format: bc:CODE or vial:CODE
    if (value.startsWith("bc:") || value.startsWith("vial:")) {
      return value;
    }

    // Format: URL containing vial code
    const urlMatch = value.match(/\/vials\/(?:code\/)?([A-Z]{2,3}-\d{3})/i);
    if (urlMatch) {
      return `bc:${urlMatch[1].toUpperCase()}`;
    }

    // Format: Plain vial code (ESP-001, FLT-001, etc.)
    const codeMatch = value.match(/^([A-Z]{2,3}-\d{3})$/i);
    if (codeMatch) {
      return `bc:${codeMatch[1].toUpperCase()}`;
    }

    // Return original value if it looks like a valid payload
    if (value.length > 0) {
      return value;
    }

    return null;
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setInitializing(true);

      // Dynamically import @zxing/browser to avoid SSR issues
      const { BrowserQRCodeReader } = await import("@zxing/browser");

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available on this device");
      }

      // Create reader if not exists
      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader();
      }

      const reader = readerRef.current;

      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length === 0) {
        throw new Error("No camera found on this device");
      }

      // Prefer back camera (environment-facing)
      const backCamera = videoDevices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
      );
      const deviceId = backCamera?.deviceId || videoDevices[0]?.deviceId;

      setInitializing(false);
      setScanning(true);

      // Start decoding from video device
      controlsRef.current = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const parsed = parseQRValue(result.getText());
            if (parsed) {
              stopScanning();
              onScan(parsed);
            }
          }
          // Ignore errors during scanning (they happen continuously when no QR is visible)
          if (error && error.name !== "NotFoundException") {
            // Only log unexpected errors
            console.warn("QR scan warning:", error.message);
          }
        }
      );
    } catch (err) {
      setInitializing(false);
      stopScanning();
      const message = err instanceof Error ? err.message : "Unknown error";

      if (
        message.includes("Permission") ||
        message.includes("NotAllowed") ||
        message.includes("denied")
      ) {
        setError("Camera access denied. Please allow camera permissions in your browser settings, then tap Retry.");
      } else if (message.includes("No camera") || message.includes("not available")) {
        setError(message);
      } else {
        setError(`Could not start camera: ${message}`);
      }
    }
  }, [onScan, parseQRValue, stopScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (code) {
      const parsed = parseQRValue(code);
      if (parsed) {
        onScan(parsed);
      }
    }
  };

  // Manual entry view
  if (showManualEntry) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="text-center">
          <p className="text-sm font-medium mb-1">Enter Vial Code Manually</p>
          <p className="text-xs text-muted-foreground">
            Type the code shown on your vial label (e.g., ESP-001)
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="ESP-001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            className="font-mono"
            autoFocus
          />
          <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
            Go
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setShowManualEntry(false);
              startScanning();
            }}
          >
            <Camera className="size-4 mr-2" />
            Use Camera
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Error view
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              startScanning();
            }}
          >
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(true)}>
            <Keyboard className="size-4 mr-2" />
            Enter Manually
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Initial state - show scan button
  if (!scanning && !initializing) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={startScanning}
          className="h-14 w-full gap-3 text-base font-semibold"
          size="lg"
        >
          <Camera className="size-5" />
          Scan QR Code
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(true)}>
          <Keyboard className="size-4 mr-2" />
          Enter code manually
        </Button>
      </div>
    );
  }

  // Scanning view
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      {initializing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover bg-muted"
        playsInline
        muted
      />
      {/* Scanning frame overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-48 rounded-2xl border-2 border-primary/60" />
      </div>
      {/* Control buttons */}
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card/80 backdrop-blur-sm"
          onClick={() => {
            stopScanning();
            setShowManualEntry(true);
          }}
        >
          <Keyboard className="size-4" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="bg-card/80 backdrop-blur-sm"
            onClick={() => {
              stopScanning();
              onClose();
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <p className="bg-card/80 backdrop-blur-sm py-2 text-center text-sm text-muted-foreground">
        Point camera at a vial QR code
      </p>
    </div>
  );
}
