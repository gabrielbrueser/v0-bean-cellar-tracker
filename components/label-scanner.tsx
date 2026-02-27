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
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }

      // Request camera with multiple fallback constraints for iOS
      let stream: MediaStream | null = null;
      const constraints = [
        { 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }, 
          audio: false 
        },
        { 
          video: { 
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          }, 
          audio: false 
        },
        { video: true, audio: false },
      ];

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (stream) break;
        } catch {
          continue;
        }
      }

      if (!stream) {
        throw new Error("Could not access camera");
      }

      streamRef.current = stream;
      setMode("camera");

      // Wait a tick for the video element to be in the DOM
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found");
      }

      // iOS-specific setup
      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.muted = true;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Camera timeout"));
        }, 15000);

        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          video.play()
            .then(() => {
              setCameraReady(true);
              resolve();
            })
            .catch((e) => reject(e));
        };

        video.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error("Video failed to load"));
        };
      });
    } catch (err) {
      stopCamera();
      setMode("select");
      
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Permission") || message.includes("NotAllowed") || message.includes("denied")) {
        toast.error("Camera access denied", {
          description: "Please allow camera permissions in Settings > Safari > Camera.",
        });
      } else {
        toast.error("Could not access camera", {
          description: "Please try uploading a photo instead.",
        });
      }
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Use actual video dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
      
      // Reset input so same file can be selected again
      event.target.value = "";
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
    setCameraReady(false);
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
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Camera Mode */}
          {mode === "camera" && (
            <div className="relative">
              <div className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden relative">
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Starting camera...</p>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ 
                    opacity: cameraReady ? 1 : 0,
                    transform: "scaleX(1)" 
                  }}
                />
              </div>
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
                  disabled={!cameraReady}
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
