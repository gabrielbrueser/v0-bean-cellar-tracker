"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const scanningRef = useRef(false);

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
    try {
      setError(null);
      setInitializing(true);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Please use HTTPS or a modern browser.");
      }

      // Request camera with fallback constraints for iOS compatibility
      let stream: MediaStream;
      const constraints = [
        // Try environment-facing camera first with high resolution for better QR detection
        { 
          video: { 
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }, 
          audio: false 
        },
        // Try environment without exact constraint
        { 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }, 
          audio: false 
        },
        // Fallback: any camera
        { 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
          }, 
          audio: false 
        },
        // Last resort: just any video
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

      // @ts-expect-error - stream will be defined if any constraint succeeded
      if (!stream) {
        throw new Error("Could not access any camera");
      }

      streamRef.current = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        throw new Error("Video element not ready");
      }

      // Set up video element for iOS
      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.muted = true;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Camera initialization timeout"));
        }, 15000);

        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          video.play()
            .then(() => resolve())
            .catch((e) => reject(e));
        };

        video.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("Video failed to load"));
        };
      });

      setInitializing(false);
      scanningRef.current = true;
      setScanning(true);

      // Set up canvas for QR scanning
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      // Start scanning loop using jsQR (works on all browsers)
      const scan = () => {
        if (!scanningRef.current || !video || !canvas || !ctx) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          // Use full resolution for better QR detection
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Try with attemptBoth for screens that might have inverted colors
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            stopStream();
            onScan(code.data);
            return;
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
      
      if (message.includes("Permission") || message.includes("NotAllowed") || message.includes("denied")) {
        setError(
          "Camera access denied. Please allow camera permissions in Settings > Safari > Camera, then refresh."
        );
      } else if (message.includes("NotFound") || message.includes("DevicesNotFound")) {
        setError("No camera found on this device.");
      } else if (message.includes("NotReadable") || message.includes("TrackStartError")) {
        setError("Camera is in use by another app. Please close other apps using the camera.");
      } else if (message.includes("secure") || message.includes("HTTPS")) {
        setError("Camera requires HTTPS. Please access the site via https://");
      } else {
        setError(`Camera error: ${message}`);
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
        muted
        autoPlay
        style={{ transform: "scaleX(1)" }}
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
