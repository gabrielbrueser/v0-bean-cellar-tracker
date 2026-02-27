"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { mutate } from "swr";
import { toast } from "sonner";
import { useVial, useActiveFillSession, useFillSessions, useCoffee, useDoseTypes } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { ArrowLeft, Printer, Coffee, Droplets } from "lucide-react";

interface VialDetailProps {
  vialId: string;
}

export function VialDetail({ vialId }: VialDetailProps) {
  const { data: vial, isLoading: vialLoading } = useVial(vialId);
  const { data: activeFill } = useActiveFillSession(vialId);
  const { data: fillSessions } = useFillSessions(vialId);
  const { data: coffee } = useCoffee(activeFill?.coffeeId ?? null);
  const { data: doseTypes } = useDoseTypes();
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [brewType, setBrewType] = useState<string>("espresso");
  const [useLoading, setUseLoading] = useState(false);

  const doseType = doseTypes?.find((dt) => dt.id === vial?.doseTypeId);

  // Determine default brew type based on vial prefix
  const getDefaultBrewType = useCallback(() => {
    if (vial?.vialCode?.startsWith("ESP")) return "espresso";
    if (vial?.vialCode?.startsWith("FLT")) return "filter";
    return "espresso";
  }, [vial?.vialCode]);

  const handleUseClick = () => {
    setBrewType(getDefaultBrewType());
    setShowUseDialog(true);
  };

  const handleConfirmUse = async () => {
    if (!activeFill) return;
    setUseLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brewType }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Coffee used!", { description: `Brewed as ${brewType}. Vial marked as empty.` });
      setShowUseDialog(false);
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate("/api/inventory");
      mutate("/api/vials");
      mutate("/api/activity");
    } catch {
      toast.error("Failed to mark vial as used");
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
        <p className="text-sm text-muted-foreground">Vial not found</p>
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
          {vial.status}
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
            Use this coffee for my brew
          </Button>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Droplets className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              This vial is empty. Fill it with a coffee to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => setShowFillDialog(true)}
        className="w-full"
      >
        {isFull ? "Refill / Change Coffee" : "Fill Vial"}
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

      {/* Brew Type Selection Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Your Brew</DialogTitle>
            <DialogDescription>
              Select the brew method for this coffee
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={brewType} onValueChange={setBrewType} className="gap-3">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUse} disabled={useLoading}>
              {useLoading ? "Logging..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
