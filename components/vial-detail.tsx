"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { mutate } from "swr";
import { toast } from "sonner";
import { useVial, useActiveFillSession, useFillSessions, useCoffee, useDoseTypes, useLastGrindSettings } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FillVialDialog } from "@/components/fill-vial-dialog";
import { VialHistory } from "@/components/vial-history";
import { ArrowLeft, Printer, Coffee, Droplets, Timer, AlertTriangle, Sparkles, CheckCircle2, Zap, ThumbsUp, Turtle, Snowflake, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCoffees } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";

interface VialDetailProps {
  vialId: string;
}

type BrewMethod = "espresso" | "filter";
type BrewFeedback = "fast" | "good" | "slow";

// Freshness calculations (considers frozen state)
function getFreshnessInfo(roastDate: string, isFrozen: boolean) {
  if (isFrozen) {
    return {
      label: "Frozen",
      color: "text-blue-600 bg-blue-50",
      icon: Snowflake,
      message: "Freshness paused while frozen",
      suggestion: "Thaw before brewing for best results"
    };
  }
  
  const days = differenceInDays(new Date(), new Date(roastDate));
  
  if (days < 7) {
    return { 
      label: "Resting", 
      color: "text-amber-600 bg-amber-50", 
      icon: Timer,
      message: `${7 - days} days until peak freshness`,
      suggestion: "Allow CO2 to escape for better extraction"
    };
  } else if (days <= 21) {
    return { 
      label: "Peak", 
      color: "text-green-600 bg-green-50", 
      icon: Sparkles,
      message: `Day ${days} - Peak freshness window`,
      suggestion: "Optimal for balanced extraction"
    };
  } else if (days <= 35) {
    return { 
      label: "Fading", 
      color: "text-amber-600 bg-amber-50", 
      icon: AlertTriangle,
      message: `${days} days since roast`,
      suggestion: "Consider finer grind or increased dose"
    };
  } else {
    return { 
      label: "Stale", 
      color: "text-red-600 bg-red-50", 
      icon: AlertTriangle,
      message: `${days} days since roast - coffee is stale`,
      suggestion: "May lack sweetness and complexity"
    };
  }
}

// Grind scale configuration by brew method
const GRIND_SCALES = {
  espresso: {
    min: 1,
    max: 100,
    default: 15,
    unit: "espresso-scale" as const,
    label: "Grind size",
    helper: "Fine -> Coarse (espresso range)"
  },
  filter: {
    min: 1,
    max: 40,
    default: 25,
    unit: "comandante-clicks" as const,
    label: "Grind size (Comandante clicks)",
    helper: "Finer -> Coarser (filter range)"
  }
};

  export function VialDetail({ vialId }: VialDetailProps) {
  const { currentCellar } = useCellarContext();
  const { data: vial, isLoading: vialLoading } = useVial(vialId);
  const { data: activeFill } = useActiveFillSession(vialId);
  const { data: fillSessions } = useFillSessions(vialId);
  const { data: coffee } = useCoffee(activeFill?.coffeeId ?? null);
  const { data: doseTypes } = useDoseTypes();
  const { data: allCoffees } = useCoffees(currentCellar?.id);
  
  // Helper to get cellar-scoped API URLs
  const cellarParam = currentCellar?.id ? `?cellarId=${currentCellar.id}` : "";
  
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [showBrewDialog, setShowBrewDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [brewLoading, setBrewLoading] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // Edit form state
  const [editCoffeeId, setEditCoffeeId] = useState<string>("");
  const [editDoseTypeId, setEditDoseTypeId] = useState<string>("");
  
  // Brew form state
  const [brewMethod, setBrewMethod] = useState<BrewMethod>("espresso");
  const [grindSize, setGrindSize] = useState(15);
  const [extractionGrams, setExtractionGrams] = useState<number>(36);
  const [brewFeedback, setBrewFeedback] = useState<BrewFeedback>("good");
  const [notes, setNotes] = useState("");

  // Get last grind settings for this coffee + method
  const { data: lastGrind } = useLastGrindSettings(coffee?.id ?? null, brewMethod);

  const doseType = doseTypes?.find((dt: { id: string }) => dt.id === vial?.doseTypeId);
  const doseGrams = activeFill?.gramsPerDose ?? doseType?.gramsPerDose ?? 18;
  const isFrozen = vial?.isFrozen ?? false;

  // Get freshness info
  const freshness = activeFill ? getFreshnessInfo(activeFill.roastDate, isFrozen) : null;
  const FreshnessIcon = freshness?.icon ?? Timer;

  // Get the grind scale for current brew method
  const grindScale = GRIND_SCALES[brewMethod];

  // Update grind size when method changes or last grind is loaded
  useEffect(() => {
    if (lastGrind?.found) {
      setGrindSize(lastGrind.grindSize);
      setExtractionGrams(lastGrind.extractionGrams || (brewMethod === "espresso" ? 36 : 250));
    } else {
      setGrindSize(grindScale.default);
      setExtractionGrams(brewMethod === "espresso" ? 36 : 250);
    }
  }, [brewMethod, lastGrind, grindScale.default]);

  // Determine default brew type based on vial prefix
  const getDefaultBrewType = useCallback((): BrewMethod => {
    if (vial?.vialCode?.startsWith("ESP")) return "espresso";
    if (vial?.vialCode?.startsWith("FLT")) return "filter";
    return "espresso";
  }, [vial?.vialCode]);

  const handleBrewClick = () => {
    const defaultMethod = getDefaultBrewType();
    setBrewMethod(defaultMethod);
    setGrindSize(GRIND_SCALES[defaultMethod].default);
    setExtractionGrams(defaultMethod === "espresso" ? 36 : 250);
    setBrewFeedback("good");
    setNotes("");
    setShowBrewDialog(true);
  };

  const handleOpenEditDialog = () => {
    setEditCoffeeId(activeFill?.coffeeId ?? "");
    setEditDoseTypeId(vial?.doseTypeId ?? "");
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!activeFill) return;
    setEditLoading(true);
    
    try {
      // Update the fill session with new coffee/dose type
      const res = await fetch(`/api/fill-sessions/${activeFill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coffeeId: editCoffeeId,
          doseTypeId: editDoseTypeId,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update dose");
      }
      
      toast.success("Dose updated");
      setShowEditDialog(false);
      
      // Refresh data
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate(`/api/vials/${vialId}/active-fill`);
      mutate(`/api/inventory${cellarParam}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update dose");
    } finally {
      setEditLoading(false);
    }
  };

  const handleFreezeToggle = async () => {
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setFreezeLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/freeze${cellarParam}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle freeze");
      const data = await res.json();
      toast.success(data.isFrozen ? "Dose frozen" : "Dose unfrozen");
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/home${cellarParam}`);
      mutate(`/api/inventory${cellarParam}`);
    } catch {
      toast.error("Failed to toggle freeze state");
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleMethodChange = (method: BrewMethod) => {
    setBrewMethod(method);
    // Scale will be updated by useEffect when lastGrind loads
  };

  const handleConfirmBrew = async () => {
    if (!activeFill) return;
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setBrewLoading(true);
    
    try {
      const res = await fetch(`/api/brew${cellarParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doseId: vialId,
          brewMethod,
          doseGrams,
          grindSize,
          extractionGrams,
          brewFeedback,
          notes: notes.trim() || null,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log brew");
      }
      
      setShowBrewDialog(false);
      setShowConfirmation(true);
      
      // Refresh all relevant data
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate(`/api/inventory${cellarParam}`);
      mutate(`/api/vials${cellarParam}`);
mutate(`/api/brew${cellarParam}`);
  mutate(`/api/brew/stats${cellarParam}`);
  mutate(`/api/home${cellarParam}`);
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log brew");
    } finally {
      setBrewLoading(false);
    }
  };

  if (vialLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (!vial) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">Dose not found</p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const isFull = vial.status === "FULL" && activeFill;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-mono tracking-wider text-foreground">
            {vial.vialCode}
          </h1>
          <p className="text-xs text-muted-foreground">
            {doseType?.name} ({doseGrams}g)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFrozen && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
              <Snowflake className="size-3 mr-1" />
              Frozen
            </Badge>
          )}
          <Badge
            variant={isFull ? "default" : "outline"}
            className={isFull ? "bg-primary text-primary-foreground" : "text-muted-foreground"}
          >
            {vial.status === "FULL" ? "Sealed" : "Brewed"}
          </Badge>
        </div>
        {isFull && (
          <Button 
            variant="outline" 
            size="icon-sm"
            onClick={handleOpenEditDialog}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Edit dose</span>
          </Button>
        )}
        <Link href={`/vials/${vialId}/label`}>
          <Button variant="outline" size="icon-sm">
            <Printer className="size-4" />
            <span className="sr-only">Print label</span>
          </Button>
        </Link>
      </div>

      {isFull && coffee ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="size-4 text-accent" />
                {coffee.coffeeName}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {/* Freshness Indicator */}
              {freshness && (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${freshness.color}`}>
                  <FreshnessIcon className="size-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{freshness.label}</span>
                      <span className="text-xs opacity-80">{freshness.message}</span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-90">{freshness.suggestion}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Roaster</span>
                  <p className="font-medium text-foreground">{coffee.roaster}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Score</span>
                  <p className="font-bold text-foreground">{coffee.score}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Origin</span>
                  <p className="font-medium text-foreground">{coffee.origin}</p>
                </div>
                {coffee.producer && (
                  <div>
                    <span className="text-muted-foreground">Producer</span>
                    <p className="font-medium text-foreground">{coffee.producer}</p>
                  </div>
                )}
                {coffee.variety && (
                  <div>
                    <span className="text-muted-foreground">Variety</span>
                    <p className="font-medium text-foreground">{coffee.variety}</p>
                  </div>
                )}
                {coffee.altitude && (
                  <div>
                    <span className="text-muted-foreground">Altitude</span>
                    <p className="font-medium text-foreground">{coffee.altitude}</p>
                  </div>
                )}
              </div>
              {activeFill && (
                <div className="mt-2 border-t border-border pt-2 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Roast date: {format(new Date(activeFill.roastDate), "MMM d, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Dose: <span className="font-medium text-foreground">{doseGrams}g</span>
                  </span>
                </div>
              )}
              {coffee.tastingNotes && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">Tasting notes</span>
                  <p className="text-sm text-foreground">{coffee.tastingNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleBrewClick}
            disabled={brewLoading}
            className="h-14 w-full gap-3 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            <Droplets className="size-5" />
            Brew my dose
          </Button>

          {/* Freeze/Unfreeze Button */}
          <Button
            variant="outline"
            onClick={handleFreezeToggle}
            disabled={freezeLoading}
            className={`w-full gap-2 ${isFrozen ? "border-blue-300 text-blue-600 hover:bg-blue-50" : ""}`}
          >
            <Snowflake className="size-4" />
            {freezeLoading ? "Updating..." : isFrozen ? "Unfreeze dose" : "Freeze dose"}
          </Button>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Droplets className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              This dose has been brewed. Seal a new dose to continue.
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => setShowFillDialog(true)}
        className="w-full"
      >
        {isFull ? "Reseal / Change Coffee" : "Seal Dose"}
      </Button>

      {fillSessions && fillSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Dose Lifecycle</h2>
          <VialHistory sessions={fillSessions} />
        </section>
      )}

      <FillVialDialog
        open={showFillDialog}
        onOpenChange={setShowFillDialog}
        vialId={vialId}
        doseTypeId={vial.doseTypeId}
        hasActiveFill={!!activeFill}
      />

      {/* Brew Logging Dialog */}
      <Dialog open={showBrewDialog} onOpenChange={setShowBrewDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Your Brew</DialogTitle>
            <DialogDescription>
              Record your brew details for tracking and dialing in
            </DialogDescription>
          </DialogHeader>
          
          {/* Selected Dose ID - Prominent Display */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Selected dose</p>
            <p className="text-2xl font-bold font-mono text-primary">
              {vial?.vialCode}
            </p>
            {coffee && (
              <p className="text-sm text-foreground mt-1">
                {coffee.coffeeName} · {doseGrams}g
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-5 py-4">
            {/* Brew Method - Required */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Brew Method <span className="text-destructive">*</span>
              </Label>
              <RadioGroup 
                value={brewMethod} 
                onValueChange={(v) => handleMethodChange(v as BrewMethod)} 
                className="gap-3"
              >
                <div className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${brewMethod === "espresso" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
                  <RadioGroupItem value="espresso" id="brew-espresso" />
                  <Label htmlFor="brew-espresso" className="flex-1 cursor-pointer">
                    <span className="font-medium">Espresso</span>
                    <p className="text-xs text-muted-foreground">Pressure brewed, concentrated shot</p>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${brewMethod === "filter" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
                  <RadioGroupItem value="filter" id="brew-filter" />
                  <Label htmlFor="brew-filter" className="flex-1 cursor-pointer">
                    <span className="font-medium">Filter</span>
                    <p className="text-xs text-muted-foreground">Pour-over, drip, or immersion brew</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Grind Size - Method-aware, Required */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  {grindScale.label} <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={grindSize}
                    onChange={(e) => setGrindSize(Math.min(grindScale.max, Math.max(grindScale.min, Number(e.target.value))))}
                    className="w-16 h-8 text-center text-sm"
                    min={grindScale.min}
                    max={grindScale.max}
                  />
                </div>
              </div>
              <Slider
                value={[grindSize]}
                onValueChange={([v]) => setGrindSize(v)}
                min={grindScale.min}
                max={grindScale.max}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">{grindScale.helper}</p>
              {lastGrind?.found && (
                <p className="text-xs text-primary mt-1">
                  Last used: {lastGrind.grindSize} for this coffee
                </p>
              )}
            </div>

            {/* Extraction Yield - Required */}
            <div>
              <Label htmlFor="extraction" className="text-sm font-medium mb-2 block">
                Extraction (g) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="extraction"
                type="number"
                value={extractionGrams}
                onChange={(e) => setExtractionGrams(Number(e.target.value))}
                className="w-full"
                min={0}
                step={0.1}
                placeholder={brewMethod === "espresso" ? "36" : "250"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Beverage weight after brewing
              </p>
            </div>

            {/* Brew Feedback - Required */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                How was the extraction? <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBrewFeedback("fast")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    brewFeedback === "fast" 
                      ? "border-amber-500 bg-amber-50 text-amber-700" 
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <Zap className="size-5" />
                  <span className="text-xs font-medium">Too fast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrewFeedback("good")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    brewFeedback === "good" 
                      ? "border-green-500 bg-green-50 text-green-700" 
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <ThumbsUp className="size-5" />
                  <span className="text-xs font-medium">Just right</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrewFeedback("slow")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    brewFeedback === "slow" 
                      ? "border-blue-500 bg-blue-50 text-blue-700" 
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <Turtle className="size-5" />
                  <span className="text-xs font-medium">Too slow</span>
                </button>
              </div>
            </div>

            {/* Notes - Optional */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                Notes (optional)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tasting notes, adjustments..."
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBrew} 
              disabled={brewLoading || !extractionGrams}
            >
              {brewLoading ? "Logging..." : "Confirm Brew"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brew Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Enjoy your brew!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {brewMethod === "espresso" ? "Espresso" : "Filter"} logged
              </p>
            </div>
            {coffee && (
              <div className="w-full p-3 bg-secondary/50 rounded-lg text-left">
                <p className="font-medium text-foreground">{coffee.coffeeName}</p>
                <p className="text-xs text-muted-foreground">{coffee.roaster}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Grind: {grindSize}</span>
                  <span>Yield: {extractionGrams}g</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      brewFeedback === "good" ? "text-green-600" : 
                      brewFeedback === "fast" ? "text-amber-600" : "text-blue-600"
                    }`}
                  >
                    {brewFeedback === "good" ? "Just right" : brewFeedback === "fast" ? "Too fast" : "Too slow"}
                  </Badge>
                </div>
              </div>
            )}
            <Button onClick={() => setShowConfirmation(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dose Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Dose</DialogTitle>
            <DialogDescription>
              Change the coffee or dose type for this sealed dose.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {/* Coffee Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Coffee</Label>
              <Select value={editCoffeeId} onValueChange={setEditCoffeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coffee" />
                </SelectTrigger>
                <SelectContent>
                  {allCoffees?.map((c: { id: string; coffeeName: string; roaster: string }) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.coffeeName} ({c.roaster})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dose Type Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Dose Type</Label>
              <Select value={editDoseTypeId} onValueChange={setEditDoseTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dose type" />
                </SelectTrigger>
                <SelectContent>
                  {doseTypes?.map((dt: { id: string; name: string; gramsPerDose: number }) => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name} ({dt.gramsPerDose}g)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={editLoading || !editCoffeeId || !editDoseTypeId}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
