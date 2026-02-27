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
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Camera, Upload, X, Loader2, Check, RotateCcw, ChevronDown, FileText } from "lucide-react";

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

// Parse extracted text into coffee data fields
function parseOCRText(text: string): ExtractedCoffeeData {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  const data: ExtractedCoffeeData = {
    coffeeName: null,
    roaster: null,
    origin: null,
    producer: null,
    variety: null,
    altitude: null,
    processMethod: null,
    tastingNotes: null,
    score: null,
  };

  // Common coffee origins
  const origins = [
    "ethiopia", "kenya", "colombia", "brazil", "guatemala", "costa rica",
    "panama", "honduras", "el salvador", "nicaragua", "peru", "mexico",
    "rwanda", "burundi", "yemen", "indonesia", "sumatra", "java",
    "india", "papua new guinea", "ecuador", "bolivia", "uganda", "tanzania",
    "democratic republic of congo", "malawi", "zambia", "myanmar", "laos",
    "thailand", "vietnam", "china", "taiwan", "hawaii", "puerto rico", "jamaica"
  ];

  // Common varieties
  const varieties = [
    "gesha", "geisha", "bourbon", "typica", "caturra", "catuai", "sl28", "sl34",
    "pacamara", "maragogype", "mundo novo", "yellow bourbon", "red bourbon",
    "pink bourbon", "orange bourbon", "pacas", "villa sarchi", "java", "mokka",
    "ethiopian heirloom", "74110", "74112", "74158", "castillo", "colombia",
    "tabi", "sidra", "sudan rume", "wush wush", "dega", "eugenioides"
  ];

  // Common process methods
  const processes = [
    "washed", "natural", "honey", "anaerobic", "carbonic maceration",
    "double fermentation", "experimental", "wet hulled", "pulped natural",
    "black honey", "red honey", "yellow honey", "white honey", "semi-washed",
    "fully washed", "extended fermentation", "lactic", "thermal shock",
    "yeast inoculation", "koji", "infused", "co-fermentation"
  ];

  // Extract origin
  for (const origin of origins) {
    if (fullText.includes(origin)) {
      data.origin = origin.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  // Extract variety
  for (const variety of varieties) {
    if (fullText.includes(variety.toLowerCase())) {
      data.variety = variety.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  // Extract process
  for (const process of processes) {
    if (fullText.includes(process.toLowerCase())) {
      data.processMethod = process.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  // Extract altitude (patterns like "1800m", "1800-2000m", "1800 masl", etc.)
  const altitudeMatch = text.match(/(\d{3,4})\s*[-–—]\s*(\d{3,4})\s*(m|masl|meters)/i) ||
    text.match(/(\d{3,4})\s*(m|masl|meters)/i);
  if (altitudeMatch) {
    data.altitude = altitudeMatch[0].trim();
  }

  // Extract score (patterns like "87", "87.5", "SCA 87", etc.)
  const scoreMatch = text.match(/(?:sca|score|cup|cupping)?\s*:?\s*(\d{2}(?:\.\d)?)\s*(?:pts?|points?)?/i) ||
    text.match(/\b(8[0-9]|9[0-9])(?:\.[0-9])?\b/);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1] || scoreMatch[0]);
    if (score >= 70 && score <= 100) {
      data.score = score;
    }
  }

  // Try to extract producer/farm (look for keywords)
  const producerPatterns = [
    /(?:farm|finca|producer|estate|station|washing station|mill)[:\s]+([^\n,]+)/i,
    /(?:grown by|produced by)[:\s]+([^\n,]+)/i,
  ];
  for (const pattern of producerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.producer = match[1].trim();
      break;
    }
  }

  // Try to extract roaster
  const roasterPatterns = [
    /(?:roasted by|roaster|roastery)[:\s]+([^\n,]+)/i,
    /(?:coffee roasters?|roasting company)[:\s]*([^\n,]+)/i,
  ];
  for (const pattern of roasterPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.roaster = match[1].trim();
      break;
    }
  }

  // Extract tasting notes (look for flavor descriptors)
  const tastingPatterns = [
    /(?:tasting notes?|flavor|flavour|notes?|tastes? like)[:\s]+([^\n]+)/i,
    /(?:cup profile|profile)[:\s]+([^\n]+)/i,
  ];
  for (const pattern of tastingPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data.tastingNotes = match[1].trim();
      break;
    }
  }

  // If no tasting notes found via pattern, look for common descriptors
  if (!data.tastingNotes) {
    const descriptors = [
      "floral", "citrus", "berry", "stone fruit", "tropical", "chocolate",
      "caramel", "honey", "nutty", "spicy", "herbal", "tea-like", "winey",
      "fruity", "sweet", "bright", "clean", "complex", "balanced",
      "jasmine", "bergamot", "peach", "apricot", "mango", "papaya",
      "strawberry", "blueberry", "blackberry", "raspberry", "cherry",
      "apple", "pear", "grape", "orange", "lemon", "lime", "grapefruit"
    ];
    const found = descriptors.filter(d => fullText.includes(d));
    if (found.length >= 2) {
      data.tastingNotes = found.slice(0, 5).map(d => 
        d.charAt(0).toUpperCase() + d.slice(1)
      ).join(", ");
    }
  }

  // Try to get coffee name from first prominent line
  // Usually the largest/first text on label is the coffee name
  for (const line of lines.slice(0, 5)) {
    // Skip lines that are clearly labels
    if (line.length > 3 && line.length < 60 && 
        !line.toLowerCase().match(/^(roasted|origin|variety|process|altitude|notes|tasting|score|farm|producer|estate)/)) {
      // Could be coffee name
      if (!data.coffeeName && line.match(/^[A-Z]/)) {
        data.coffeeName = line;
        break;
      }
    }
  }

  return data;
}

export function LabelScanner({
  open,
  onOpenChange,
  onDataExtracted,
}: LabelScannerProps) {
  const [mode, setMode] = useState<"select" | "camera" | "preview" | "result">("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCoffeeData | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }

      let stream: MediaStream | null = null;
      const constraints = [
        { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
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

      if (!stream) throw new Error("Could not access camera");

      streamRef.current = stream;
      setMode("camera");

      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");

      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.muted = true;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Camera timeout")), 15000);
        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          video.play().then(() => { setCameraReady(true); resolve(); }).catch(reject);
        };
        video.onerror = () => { clearTimeout(timeoutId); reject(new Error("Video failed to load")); };
      });
    } catch (err) {
      stopCamera();
      setMode("select");
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Permission") || message.includes("NotAllowed") || message.includes("denied")) {
        toast.error("Camera access denied", { description: "Please allow camera permissions in Settings." });
      } else {
        toast.error("Could not access camera", { description: "Please try uploading a photo instead." });
      }
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
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

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
      setMode("preview");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setProgress(0);
    setProgressStatus("Loading OCR engine...");

    try {
      // Dynamically import tesseract.js to avoid SSR issues
      const Tesseract = await import("tesseract.js");
      
      const result = await Tesseract.recognize(capturedImage, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round((m.progress || 0) * 100));
            setProgressStatus("Recognizing text...");
          } else if (m.status === "loading tesseract core") {
            setProgress(5);
            setProgressStatus("Loading OCR engine...");
          } else if (m.status === "initializing tesseract") {
            setProgress(10);
            setProgressStatus("Initializing...");
          } else if (m.status === "loading language traineddata") {
            setProgress(15);
            setProgressStatus("Loading language data...");
          } else if (m.status === "initializing api") {
            setProgress(20);
            setProgressStatus("Preparing analysis...");
          }
        },
      });

      const extractedText = result.data.text;
      setRawText(extractedText);
      
      setProgressStatus("Parsing coffee data...");
      setProgress(95);

      const parsed = parseOCRText(extractedText);
      setExtractedData(parsed);
      setProgress(100);
      setMode("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to analyze label", { description: message });
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
    setRawText("");
    setShowRawText(false);
    setMode("select");
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setExtractedData(null);
    setRawText("");
    setShowRawText(false);
    setCameraReady(false);
    setMode("select");
    setProgress(0);
    setProgressStatus("");
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && "Scan Coffee Label"}
            {mode === "camera" && "Take Photo"}
            {mode === "preview" && "Review Photo"}
            {mode === "result" && "Extracted Data"}
          </DialogTitle>
          <DialogDescription>
            {mode === "select" && "Take a photo or upload an image of the coffee bag label."}
            {mode === "camera" && "Position the label in frame and capture."}
            {mode === "preview" && "Review the image before analyzing."}
            {mode === "result" && "Review the extracted data and confirm to autofill."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Select Mode */}
          {mode === "select" && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="flex flex-col gap-2 h-24" onClick={startCamera}>
                <Camera className="size-6" />
                <span className="text-sm">Use Camera</span>
              </Button>
              <Button variant="outline" className="flex flex-col gap-2 h-24" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-6" />
                <span className="text-sm">Upload Photo</span>
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
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
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ opacity: cameraReady ? 1 : 0, transform: "scaleX(1)" }} />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <Button variant="secondary" size="icon" onClick={() => { stopCamera(); setMode("select"); }}>
                  <X className="size-4" />
                </Button>
                <Button size="lg" className="rounded-full size-14" onClick={capturePhoto} disabled={!cameraReady}>
                  <Camera className="size-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview Mode */}
          {mode === "preview" && capturedImage && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <img src={capturedImage} alt="Captured label" className="w-full aspect-[4/3] bg-muted rounded-lg object-cover" />
              </div>
              
              {isAnalyzing && (
                <div className="flex flex-col gap-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{progressStatus}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleRetake} disabled={isAnalyzing}>
                  <RotateCcw className="size-4" />
                  Retake
                </Button>
                <Button className="flex-1 gap-2" onClick={analyzeImage} disabled={isAnalyzing}>
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
                  {(Object.entries(extractedData) as [keyof ExtractedCoffeeData, string | number | null][]).map(([key, value]) => {
                    if (value === null || value === "") return null;
                    return (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">{fieldLabels[key]}:</span>
                        <span className="text-foreground text-right truncate font-medium">{String(value)}</span>
                      </div>
                    );
                  })}
                  {Object.values(extractedData).every((v) => v === null || v === "") && (
                    <p className="text-center text-muted-foreground py-2">No data could be extracted. Try a clearer image.</p>
                  )}
                </div>
              </div>

              {/* View Extracted Text - Debug */}
              <Collapsible open={showRawText} onOpenChange={setShowRawText}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                    <FileText className="size-4" />
                    View extracted text
                    <ChevronDown className={`size-4 transition-transform ${showRawText ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-40 overflow-y-auto">
                      {rawText || "No text extracted"}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleRetake}>
                  Try Again
                </Button>
                <Button className="flex-1" onClick={handleConfirm} disabled={Object.values(extractedData).every((v) => v === null || v === "")}>
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
