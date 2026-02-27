"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Loader2, Keyboard } from "lucide-react";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
}

// Check if BarcodeDetector is available
function isBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const scanningRef = useRef(false);

  useEffect(() => {
    setIsSupported(isBarcodeDetectorSupported());
  }, []);

  const stopStream = useCallback(() => {
    scanningRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      setShowManualEntry(true);
      return;
    }

    try {
      setError(null);
      setInitializing(true);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // Create barcode detector
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });

      // Request camera
      let stream: MediaStream | null = null;
      const constraints = [
        { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: true, audio: false },
      ];

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          break;
        } catch {
          continue;
        }
      }

      if (!stream) {
        throw new Error("Could not access camera");
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not ready");
      }

      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Camera timeout")), 15000);
        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          video.play().then(() => resolve()).catch(reject);
        };
        video.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("Video failed"));
        };
      });

      setInitializing(false);
      scanningRef.current = true;
      setScanning(true);

      // Scanning loop
      const scan = async () => {
        if (!scanningRef.current || !video || !detectorRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const codes = await detectorRef.current.detect(video);
            if (codes.length > 0 && codes[0].rawValue) {
              stopStream();
              onScan(codes[0].rawValue);
              return;
            }
          } catch {
            // Detection failed, continue scanning
          }
        }

        if (scanningRef.current) {
          animationRef.current = requestAnimationFrame(scan);
        }
      };

      animationRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setInitializing(false);
      stopStream();
      const message = err instanceof Error ? err.message : "Unknown error";
      
      if (message.includes("Permission") || message.includes("NotAllowed")) {
        setError("Camera access denied. Please allow camera permissions, then retry.");
      } else {
        setError(`Camera error: ${message}`);
      }
    }
  }, [isSupported, onScan, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (code) {
      onScan(`bc:${code}`);
    }
  };

  // Show manual entry for unsupported browsers
  if (!isSupported || showManualEntry) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="text-center">
          <p className="text-sm font-medium mb-1">Enter Vial Code Manually</p>
          <p className="text-xs text-muted-foreground">
            {!isSupported 
              ? "QR scanning requires iOS 16.4+ or Chrome 88+." 
              : "Type the code shown on your vial label."}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., ESP-001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            className="font-mono"
          />
          <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
            Go
          </Button>
        </div>
        <div className="flex gap-2">
          {isSupported && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => {
              setShowManualEntry(false);
              startScanning();
            }}>
              <Camera className="size-4 mr-2" />
              Use Camera
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setError(null); startScanning(); }}>
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

  if (!scanning && !initializing) {
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={startScanning} className="h-14 w-full gap-3 text-base font-semibold" size="lg">
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
        autoPlay
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-48 rounded-2xl border-2 border-primary/60" />
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card/80 backdrop-blur-sm"
          onClick={() => { stopStream(); setShowManualEntry(true); }}
        >
          <Keyboard className="size-4" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="bg-card/80 backdrop-blur-sm"
            onClick={() => { stopStream(); onClose(); }}
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
