"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2, Check, RotateCcw } from "lucide-react";

interface ExtractedCoffeeData {
  coffeeName: string | null;
  roaster: string | null;
  origin: string | null;
  producer: string | null;
  variety: string | null;
  altitude: string | null;
  processMethod: string | null;
  tastingNotes: string | null;
  score: number | null;
}

interface LabelScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: ExtractedCoffeeData) => void;
}

export function LabelScanner({
  open,
  onOpenChange,
  onDataExtracted,
}: LabelScannerProps) {
  const [mode, setMode] = useState<"select" | "camera" | "preview" | "result">(
    "select"
  );
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] =
    useState<ExtractedCoffeeData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // iOS-friendly camera constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic constraints
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
            video.play().then(resolve).catch(reject);
          };
          video.onerror = () => reject(new Error("Video failed to load"));
          setTimeout(() => reject(new Error("Camera timeout")), 10000);
        });
      }
      
      setMode("camera");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Permission") || message.includes("NotAllowed")) {
        toast.error("Camera access denied", {
          description: "Please allow camera permissions in your browser settings.",
        });
      } else {
        toast.error("Could not access camera", {
          description: "Please try uploading a photo instead.",
        });
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    stopCamera();
    setMode("preview");
  }, [stopCamera]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
        setMode("preview");
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/scan-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze");
      }

      setExtractedData(result.data);
      setMode("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to analyze label", {
        description: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedImage]);

  const handleConfirm = useCallback(() => {
    if (extractedData) {
      onDataExtracted(extractedData);
      handleClose();
    }
  }, [extractedData, onDataExtracted]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setExtractedData(null);
    setMode("select");
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setExtractedData(null);
    setMode("select");
    onOpenChange(false);
  }, [stopCamera, onOpenChange]);

  const fieldLabels: Record<keyof ExtractedCoffeeData, string> = {
    coffeeName: "Coffee Name",
    roaster: "Roaster",
    origin: "Origin",
    producer: "Producer",
    variety: "Variety",
    altitude: "Altitude",
    processMethod: "Process",
    tastingNotes: "Tasting Notes",
    score: "Score",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && "Scan Coffee Label"}
            {mode === "camera" && "Take Photo"}
            {mode === "preview" && "Review Photo"}
            {mode === "result" && "Extracted Data"}
          </DialogTitle>
          <DialogDescription>
            {mode === "select" &&
              "Take a photo or upload an image of the coffee bag label."}
            {mode === "camera" && "Position the label in frame and capture."}
            {mode === "preview" && "Review the image before analyzing."}
            {mode === "result" &&
              "Review the extracted data and confirm to autofill."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Select Mode */}
          {mode === "select" && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-24"
                onClick={startCamera}
              >
                <Camera className="size-6" />
                <span className="text-sm">Use Camera</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-24"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-6" />
                <span className="text-sm">Upload Photo</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Camera Mode */}
          {mode === "camera" && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted
                className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    stopCamera();
                    setMode("select");
                  }}
                >
                  <X className="size-4" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full size-14"
                  onClick={capturePhoto}
                >
                  <Camera className="size-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview Mode */}
          {mode === "preview" && capturedImage && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured label"
                  className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleRetake}
                >
                  <RotateCcw className="size-4" />
                  Retake
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Result Mode */}
          {mode === "result" && extractedData && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="grid gap-2 text-sm">
                  {(
                    Object.entries(extractedData) as [
                      keyof ExtractedCoffeeData,
                      string | number | null
                    ][]
                  ).map(([key, value]) => {
                    if (value === null || value === "") return null;
                    return (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {fieldLabels[key]}:
                        </span>
                        <span className="text-foreground text-right truncate font-medium">
                          {String(value)}
                        </span>
                      </div>
                    );
                  })}
                  {Object.values(extractedData).every(
                    (v) => v === null || v === ""
                  ) && (
                    <p className="text-center text-muted-foreground py-2">
                      No data could be extracted. Try a clearer image.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRetake}
                >
                  Try Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={Object.values(extractedData).every(
                    (v) => v === null || v === ""
                  )}
                >
                  Use Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
