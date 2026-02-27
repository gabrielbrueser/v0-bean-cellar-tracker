"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanningRef = useRef(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    scanningRef.current = false;
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanningRef.current = true;
        setScanning(true);

        // Use BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({
            formats: ["qr_code"],
          });
          const scan = async () => {
            if (!scanningRef.current || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const value = barcodes[0].rawValue;
                stopStream();
                onScan(value);
                return;
              }
            } catch {
              // ignore detection errors
            }
            if (scanningRef.current) {
              requestAnimationFrame(scan);
            }
          };
          requestAnimationFrame(scan);
        } else {
          setError(
            "QR scanning is not supported in this browser. Try Chrome on Android or Safari on iOS."
          );
        }
      }
    } catch {
      setError(
        "Could not access camera. Please allow camera permissions."
      );
    }
  }, [onScan, stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startScanning()}>
            Retry
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

  if (!scanning) {
    return (
      <Button
        onClick={startScanning}
        className="h-14 w-full gap-3 text-base font-semibold"
        size="lg"
      >
        <Camera className="size-5" />
        Scan QR Code
      </Button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* Scan overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-48 rounded-2xl border-2 border-primary/60" />
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm text-foreground"
          onClick={() => {
            stopStream();
            onClose();
          }}
        >
          <X className="size-4" />
          <span className="sr-only">Close scanner</span>
        </Button>
      )}
      <p className="bg-card/80 backdrop-blur-sm py-2 text-center text-sm text-muted-foreground">
        Point camera at a vial QR code
      </p>
    </div>
  );
}
