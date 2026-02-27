"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const scanningRef = useRef(false);

  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
      setInitializing(true);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Please use a modern browser.");
      }

      // iOS-friendly camera constraints - start simple, fallback if needed
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic constraints for older iOS versions
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready - important for iOS
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video
              .play()
              .then(() => resolve())
              .catch(reject);
          };
          video.onerror = () => reject(new Error("Video failed to load"));
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error("Camera initialization timeout")), 10000);
        });

        setInitializing(false);
        scanningRef.current = true;
        setScanning(true);

        // Check for BarcodeDetector support (iOS 16.4+, Chrome 88+)
        if ("BarcodeDetector" in window) {
          try {
            // Check if QR code format is supported
            const formats = await (window as any).BarcodeDetector.getSupportedFormats();
            if (formats.includes("qr_code")) {
              const detector = new (window as any).BarcodeDetector({
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
                  // Ignore detection errors, continue scanning
                }
                if (scanningRef.current) {
                  animationRef.current = requestAnimationFrame(scan);
                }
              };
              animationRef.current = requestAnimationFrame(scan);
            } else {
              setError(
                "QR code scanning not supported on this device. Please enter the vial code manually."
              );
            }
          } catch {
            setError(
              "Could not initialize barcode scanner. Try updating your browser or use a different device."
            );
          }
        } else {
          // BarcodeDetector not available
          setError(
            "QR scanning requires iOS 16.4+ or Chrome 88+. Please update your browser or enter the vial code manually."
          );
        }
      }
    } catch (err) {
      setInitializing(false);
      const message = err instanceof Error ? err.message : "Unknown error";
      
      if (message.includes("Permission") || message.includes("NotAllowed")) {
        setError(
          "Camera access denied. Please allow camera permissions in your browser settings and refresh the page."
        );
      } else if (message.includes("NotFound") || message.includes("DevicesNotFound")) {
        setError("No camera found on this device.");
      } else {
        setError(`Could not start camera: ${message}`);
      }
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
          <Button variant="outline" size="sm" onClick={() => {
            setError(null);
            startScanning();
          }}>
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

  if (!scanning && !initializing) {
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
        webkit-playsinline="true"
        muted
        autoPlay
      />
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
