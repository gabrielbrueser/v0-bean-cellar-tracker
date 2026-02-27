"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { mutate } from "swr";
import { toast } from "sonner";
import { useVial, useActiveFillSession, useFillSessions, useCoffee, useDoseTypes } from "@/lib/hooks";
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
import { ArrowLeft, Printer, Coffee, Droplets, Timer, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

interface VialDetailProps {
  vialId: string;
}

// Freshness calculations
function getFreshnessInfo(roastDate: string) {
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

export function VialDetail({ vialId }: VialDetailProps) {
  const { data: vial, isLoading: vialLoading } = useVial(vialId);
  const { data: activeFill } = useActiveFillSession(vialId);
  const { data: fillSessions } = useFillSessions(vialId);
  const { data: coffee } = useCoffee(activeFill?.coffeeId ?? null);
  const { data: doseTypes } = useDoseTypes();
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [brewType, setBrewType] = useState<string>("espresso");
  const [grindSize, setGrindSize] = useState<number>(15);
  const [useLoading, setUseLoading] = useState(false);

  const doseType = doseTypes?.find((dt) => dt.id === vial?.doseTypeId);

  // Get freshness info
  const freshness = activeFill ? getFreshnessInfo(activeFill.roastDate) : null;
  const FreshnessIcon = freshness?.icon ?? Timer;

  // Determine default brew type based on vial prefix
  const getDefaultBrewType = useCallback(() => {
    if (vial?.vialCode?.startsWith("ESP")) return "espresso";
    if (vial?.vialCode?.startsWith("FLT")) return "filter";
    return "espresso";
  }, [vial?.vialCode]);

  const handleUseClick = () => {
    setBrewType(getDefaultBrewType());
    setGrindSize(getDefaultBrewType() === "espresso" ? 15 : 25);
    setShowUseDialog(true);
  };

  const handleConfirmUse = async () => {
    if (!activeFill) return;
    setUseLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brewType, grindSize }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowUseDialog(false);
      setShowConfirmation(true);
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate("/api/inventory");
      mutate("/api/vials");
      mutate("/api/activity");
    } catch {
      toast.error("Failed to mark dose as brewed");
    } finally {
      setUseLoading(false);
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
            {doseType?.name} ({activeFill?.gramsPerDose ?? doseType?.gramsPerDose}g)
          </p>
        </div>
        <Badge
          variant={isFull ? "default" : "outline"}
          className={
            isFull
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }
        >
          {vial.status === "FULL" ? "Sealed" : "Brewed"}
        </Badge>
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
                    <p className="font-medium text-foreground">
                      {coffee.producer}
                    </p>
                  </div>
                )}
                {coffee.variety && (
                  <div>
                    <span className="text-muted-foreground">Variety</span>
                    <p className="font-medium text-foreground">
                      {coffee.variety}
                    </p>
                  </div>
                )}
                {coffee.altitude && (
                  <div>
                    <span className="text-muted-foreground">Altitude</span>
                    <p className="font-medium text-foreground">
                      {coffee.altitude}
                    </p>
                  </div>
                )}
              </div>
              {activeFill && (
                <div className="mt-2 border-t border-border pt-2 flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Roast date:{" "}
                    {format(new Date(activeFill.roastDate), "MMM d, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Dose: <span className="font-medium text-foreground">{activeFill.gramsPerDose}g</span>
                  </span>
                </div>
              )}
              {coffee.tastingNotes && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">
                    Tasting notes
                  </span>
                  <p className="text-sm text-foreground">
                    {coffee.tastingNotes}
                  </p>
                </div>
              )}
              {coffee.notes && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <p className="text-sm text-foreground">{coffee.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleUseClick}
            disabled={useLoading}
            className="h-14 w-full gap-3 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            <Droplets className="size-5" />
            Brew my dose
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
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            History
          </h2>
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

      {/* Brew Notes Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Your Brew</DialogTitle>
            <DialogDescription>
              Record your brew method and grind settings
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Brew Method</Label>
              <RadioGroup value={brewType} onValueChange={(v) => {
                setBrewType(v);
                setGrindSize(v === "espresso" ? 15 : 25);
              }} className="gap-3">
                <div className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-secondary/50 cursor-pointer">
                  <RadioGroupItem value="espresso" id="espresso" />
                  <Label htmlFor="espresso" className="flex-1 cursor-pointer">
                    <span className="font-medium">Espresso</span>
                    <p className="text-xs text-muted-foreground">Pressure brewed, concentrated shot</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-secondary/50 cursor-pointer">
                  <RadioGroupItem value="filter" id="filter" />
                  <Label htmlFor="filter" className="flex-1 cursor-pointer">
                    <span className="font-medium">Filter</span>
                    <p className="text-xs text-muted-foreground">Pour-over, drip, or immersion brew</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Grind Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={grindSize}
                    onChange={(e) => setGrindSize(Number(e.target.value))}
                    className="w-16 h-8 text-center text-sm"
                    min={1}
                    max={50}
                  />
                  <span className="text-xs text-muted-foreground">clicks</span>
                </div>
              </div>
              <Slider
                value={[grindSize]}
                onValueChange={([v]) => setGrindSize(v)}
                min={1}
                max={50}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Fine (espresso)</span>
                <span>Coarse (filter)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUse} disabled={useLoading}>
              {useLoading ? "Logging..." : "Confirm Brew"}
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
                {brewType === "espresso" ? "Espresso" : "Filter"} logged with grind size {grindSize}
              </p>
            </div>
            {coffee && (
              <div className="w-full p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium text-foreground">{coffee.coffeeName}</p>
                <p className="text-xs text-muted-foreground">{coffee.roaster}</p>
              </div>
            )}
            <Button onClick={() => setShowConfirmation(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
